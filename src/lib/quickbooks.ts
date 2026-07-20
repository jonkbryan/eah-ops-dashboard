// QuickBooks Online OAuth2 + Purchase-transaction reads for the
// reconciliation feature (see /admin/reconcile). Read-only against QBO —
// this never writes anything back to the company's books.
import { db } from "@/lib/db";

const AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const SCOPE = "com.intuit.quickbooks.accounting";

function apiBaseUrl() {
  return process.env.QUICKBOOKS_ENVIRONMENT === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

function redirectUri() {
  return `${process.env.APP_BASE_URL}/api/quickbooks/callback`;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export function getAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: requireEnv("QUICKBOOKS_CLIENT_ID"),
    response_type: "code",
    scope: SCOPE,
    redirect_uri: redirectUri(),
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

function basicAuthHeader() {
  const clientId = requireEnv("QUICKBOOKS_CLIENT_ID");
  const clientSecret = requireEnv("QUICKBOOKS_CLIENT_SECRET");
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
};

async function requestTokens(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks token request failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function exchangeCodeForTokens(code: string, realmId: string) {
  const tokens = await requestTokens(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    })
  );
  const now = Date.now();
  await db.quickBooksConnection.deleteMany({});
  await db.quickBooksConnection.create({
    data: {
      realmId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: new Date(now + tokens.expires_in * 1000),
      refreshTokenExpiresAt: new Date(now + tokens.x_refresh_token_expires_in * 1000),
    },
  });
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

async function getValidConnection() {
  const connection = await db.quickBooksConnection.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (!connection) {
    throw new Error("QuickBooks isn't connected yet. Connect it from /admin/reconcile.");
  }

  if (connection.accessTokenExpiresAt.getTime() - REFRESH_BUFFER_MS > Date.now()) {
    return connection;
  }

  const tokens = await requestTokens(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    })
  );
  const now = Date.now();
  return db.quickBooksConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: new Date(now + tokens.expires_in * 1000),
      refreshTokenExpiresAt: new Date(now + tokens.x_refresh_token_expires_in * 1000),
    },
  });
}

export async function isQuickBooksConnected() {
  return (await db.quickBooksConnection.findFirst()) !== null;
}

export type QuickBooksPurchase = {
  id: string;
  txnDate: string;
  totalAmountCents: number;
  vendorName: string | null;
  jobNames: string[];
};

// Purchase covers Check/CreditCardCharge/CashExpense — the transaction
// types EAH actually uses to pay vendors (they don't enter Bills in QBO).
export async function fetchRecentPurchases(sinceDate: string): Promise<QuickBooksPurchase[]> {
  const connection = await getValidConnection();
  const query = `select * from purchase where TxnDate >= '${sinceDate}' orderby TxnDate desc maxresults 200`;
  const url = `${apiBaseUrl()}/v3/company/${connection.realmId}/query?query=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks Purchase query failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const rows = data?.QueryResponse?.Purchase ?? [];

  return rows.map((row: Record<string, unknown>) => ({
    id: String(row.Id),
    txnDate: String(row.TxnDate),
    totalAmountCents: Math.round(Number(row.TotalAmt) * 100),
    vendorName: (row.EntityRef as { name?: string } | undefined)?.name ?? null,
    jobNames: Array.isArray(row.Line)
      ? [
          ...new Set(
            (row.Line as Array<{ AccountBasedExpenseLineDetail?: { CustomerRef?: { name?: string } } }>)
              .map((line) => line.AccountBasedExpenseLineDetail?.CustomerRef?.name)
              .filter((name): name is string => !!name)
          ),
        ]
      : [],
  }));
}
