import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatCents } from "@/lib/domain";
import { isQuickBooksConnected } from "@/lib/quickbooks";
import { buildReconciliationReport } from "@/lib/quickbooks-matching";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AutoMatchedRow, NeedsReviewRow } from "@/components/admin/reconcile-sections";

const LOOKBACK_DAYS = 90;

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "QuickBooks didn't return an authorization code. Try connecting again.",
  state_mismatch: "That connection attempt looked stale or tampered with. Try connecting again.",
  token_exchange_failed:
    "QuickBooks rejected the connection request — check the Client ID/Secret in .env.",
};

export default async function ReconcilePage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const { connected, error } = await searchParams;
  const isConnected = await isQuickBooksConnected();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reconcile</h1>
          <p className="text-sm text-gray-500">
            Match recorded payments against QuickBooks transactions
          </p>
        </div>
        <AdminTabs active="reconcile" />
      </div>

      {connected === "1" && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          QuickBooks connected.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {ERROR_MESSAGES[error] ?? "Something went wrong connecting QuickBooks."}
        </p>
      )}

      {!isConnected ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-3">
          <p className="text-sm text-gray-600">
            Connect QuickBooks to match recorded payments against real transactions.
          </p>
          <Link
            href="/api/quickbooks/connect"
            className="inline-block rounded-lg bg-blue-600 text-white font-medium px-4 py-2.5 text-sm active:bg-blue-700"
          >
            Connect QuickBooks
          </Link>
        </div>
      ) : (
        <ReconcileReport />
      )}
    </main>
  );
}

function lookbackDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function ReconcileReport() {
  const sinceDate = lookbackDate(LOOKBACK_DAYS);

  let report;
  try {
    report = await buildReconciliationReport(sinceDate);
  } catch (err) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        {err instanceof Error ? err.message : "Failed to load QuickBooks transactions."}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Auto-Matched ({report.autoMatched.length})
        </h2>
        {report.autoMatched.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
            Nothing auto-matched right now.
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {report.autoMatched.map(({ payment, purchase }) => (
              <AutoMatchedRow key={payment.id} payment={payment} purchase={purchase} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Needs Review ({report.needsReview.length})
        </h2>
        {report.needsReview.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
            No ambiguous matches.
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {report.needsReview.map(({ payment, candidates }) => (
              <NeedsReviewRow key={payment.id} payment={payment} candidates={candidates} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Unmatched Payments ({report.unmatchedPayments.length})
        </h2>
        <p className="text-xs text-gray-500">
          Recorded as paid in the app, but no matching QuickBooks transaction was found in the
          last {LOOKBACK_DAYS} days.
        </p>
        {report.unmatchedPayments.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
            None.
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {report.unmatchedPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {payment.vendorName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {payment.jobName} · {payment.method} · {payment.paidAt.toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm text-gray-900 shrink-0">
                  {formatCents(payment.amountCents)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Unmatched QuickBooks Transactions ({report.unmatchedPurchases.length})
        </h2>
        <p className="text-xs text-gray-500">
          Transactions from known vendors that don&apos;t correspond to any payment recorded in
          the app — possibly a payment made outside this workflow, or an invoice not yet logged.
        </p>
        {report.unmatchedPurchases.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
            None.
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {report.unmatchedPurchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{purchase.vendorName}</p>
                <div className="text-right shrink-0">
                  <p className="text-sm text-gray-900">
                    {formatCents(purchase.totalAmountCents)}
                  </p>
                  <p className="text-xs text-gray-500">{purchase.txnDate}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
