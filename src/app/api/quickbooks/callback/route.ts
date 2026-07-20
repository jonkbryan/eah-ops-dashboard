import { NextResponse, type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { exchangeCodeForTokens } from "@/lib/quickbooks";

// Intuit redirects here after the admin approves the connection on
// QuickBooks' own consent screen. Exchanges the one-time code for
// access/refresh tokens and stores them (see QuickBooksConnection).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("qbo_oauth_state")?.value;

  if (!code || !realmId) {
    return NextResponse.redirect(
      new URL("/admin/reconcile?error=missing_code", request.url)
    );
  }
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      new URL("/admin/reconcile?error=state_mismatch", request.url)
    );
  }

  try {
    await exchangeCodeForTokens(code, realmId);
  } catch (err) {
    console.error("QuickBooks token exchange failed:", err);
    return NextResponse.redirect(
      new URL("/admin/reconcile?error=token_exchange_failed", request.url)
    );
  }

  const response = NextResponse.redirect(new URL("/admin/reconcile?connected=1", request.url));
  response.cookies.delete("qbo_oauth_state");
  return response;
}
