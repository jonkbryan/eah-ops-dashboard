import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatCents } from "@/lib/domain";
import { getLatestQuickBooksImport } from "@/lib/quickbooks-import";
import { buildReconciliationReport, type ReconciliationReport } from "@/lib/quickbooks-matching";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { QuickBooksCsvUploadForm } from "@/components/admin/quickbooks-csv-upload-form";
import { AutoMatchedRow, NeedsReviewRow } from "@/components/admin/reconcile-sections";

export default async function ReconcilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const latestImport = await getLatestQuickBooksImport();

  let report: ReconciliationReport | null = null;
  if (latestImport) {
    report = await buildReconciliationReport(latestImport.purchases);
  }

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

      <QuickBooksCsvUploadForm />

      {latestImport && (
        <p className="text-xs text-gray-500">
          Last uploaded {latestImport.createdAt.toLocaleString()} —{" "}
          {latestImport.rowCount} relevant transaction(s).{" "}
          <Link href="/api/quickbooks/connect" className="underline hover:text-gray-700">
            Prefer a live sync instead?
          </Link>
        </p>
      )}

      {!report ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
          Upload a QuickBooks CSV export to see the reconciliation report.
        </p>
      ) : (
        <ReconcileReportView report={report} />
      )}
    </main>
  );
}

function ReconcileReportView({ report }: { report: ReconciliationReport }) {
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
          Recorded as paid in the app, but no matching transaction was found in the upload.
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
          Transactions from known vendors in the upload that don&apos;t correspond to any payment
          recorded in the app — possibly a payment made outside this workflow, or an invoice not
          yet logged.
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
