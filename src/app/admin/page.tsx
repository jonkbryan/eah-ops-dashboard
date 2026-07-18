import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/domain";
import { InvoiceDecisionCard } from "@/components/invoice-decision-card";
import { MarkPaidForm } from "@/components/admin/mark-paid-form";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const [readyToPay, needsDecision, history] = await Promise.all([
    db.invoice.findMany({
      where: { status: "approved" },
      include: { job: true, costCode: true },
      orderBy: { decidedAt: "asc" },
    }),
    db.invoice.findMany({
      where: { status: { in: ["pending", "flagged"] } },
      include: { job: true, costCode: true },
      orderBy: { createdAt: "asc" },
    }),
    db.invoice.findMany({
      where: { status: { in: ["rejected", "paid"] } },
      include: { job: true, costCode: true, payments: true },
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
        {readyToPay.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
            No approved invoices waiting on payment.
          </p>
        ) : (
          <div className="space-y-3">
            {readyToPay.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {invoice.vendorName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {invoice.costCode.label} · {invoice.job.name}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 shrink-0">
                    {formatCents(invoice.amountCents)}
                  </p>
                </div>
                {invoice.decisionNote && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    {invoice.decisionNote}
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                  {invoice.attachmentUrl ? (
                    <a
                      href={invoice.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      View invoice
                    </a>
                  ) : (
                    <span />
                  )}
                  {invoice.approvalSignature && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Approved by signature</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={invoice.approvalSignature}
                        alt="Approval signature"
                        className="h-8 border border-gray-200 rounded bg-white"
                      />
                    </div>
                  )}
                </div>
                <MarkPaidForm invoiceId={invoice.id} amountCents={invoice.amountCents} />
              </div>
            ))}
          </div>
        )}
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
                vendorName={invoice.vendorName}
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
                    {invoice.vendorName}
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
