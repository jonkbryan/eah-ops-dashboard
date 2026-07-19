import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/domain";
import { InvoiceDecisionCard } from "@/components/invoice-decision-card";
import { PaymentBatchSection } from "@/components/admin/payment-batch-section";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const [readyToPay, needsDecision, history] = await Promise.all([
    db.invoice.findMany({
      where: { status: "approved" },
      include: { job: true, costCode: true, vendor: true },
      orderBy: { decidedAt: "asc" },
    }),
    db.invoice.findMany({
      where: { status: { in: ["pending", "flagged"] } },
      include: { job: true, costCode: true, vendor: true },
      orderBy: { createdAt: "asc" },
    }),
    db.invoice.findMany({
      where: { status: { in: ["rejected", "paid"] } },
      include: { job: true, costCode: true, vendor: true, payments: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Admin</h1>
            <p className="text-sm text-gray-500">All jobs, {session.user.name}</p>
          </div>
          <Link
            href="/admin/invoices/new"
            className="shrink-0 rounded-lg bg-blue-600 text-white font-medium px-4 py-2.5 text-sm active:bg-blue-700"
          >
            + Log Invoice
          </Link>
        </div>
        <AdminTabs active="overview" />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Ready to Pay ({readyToPay.length})
        </h2>
        <PaymentBatchSection
          invoices={readyToPay.map((invoice) => ({
            id: invoice.id,
            vendorName: invoice.vendor.name,
            amountCents: invoice.amountCents,
            costCodeLabel: invoice.costCode.label,
            jobName: invoice.job.name,
            decisionNote: invoice.decisionNote,
            attachmentUrl: invoice.attachmentUrl,
            approvalSignature: invoice.approvalSignature,
            scheduledPaymentDate: invoice.scheduledPaymentDate,
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Needs Decision — All Jobs ({needsDecision.length})
        </h2>
        {needsDecision.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
            Nothing pending or flagged right now.
          </p>
        ) : (
          <div className="space-y-3">
            {needsDecision.map((invoice) => (
              <InvoiceDecisionCard
                key={invoice.id}
                invoiceId={invoice.id}
                vendorName={invoice.vendor.name}
                amountCents={invoice.amountCents}
                costCodeLabel={invoice.costCode.label}
                jobName={invoice.job.name}
                intakeNote={invoice.note}
                attachmentUrl={invoice.attachmentUrl}
                showJobName
              />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            History
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {history.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between px-4 py-3 gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {invoice.vendor.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {invoice.costCode.label} · {invoice.job.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-gray-900">
                    {formatCents(invoice.amountCents)}
                  </p>
                  <p
                    className={`text-xs font-medium capitalize ${
                      invoice.status === "paid" ? "text-blue-700" : "text-red-700"
                    }`}
                  >
                    {invoice.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
