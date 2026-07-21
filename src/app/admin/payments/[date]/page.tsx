import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/domain";
import { dueFridayIso, formatFriday, getUpcomingFridays } from "@/lib/payment-schedule";
import { InvoiceDecisionCard } from "@/components/invoice-decision-card";
import { PaymentBatchSection } from "@/components/admin/payment-batch-section";

export default async function PaymentDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const { date } = await params;
  if (date !== "overdue" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const upcomingFridays = getUpcomingFridays(4);

  const unpaid = await db.invoice.findMany({
    where: { status: { not: "paid" } },
    include: { job: true, costCode: true, vendor: true },
    orderBy: { createdAt: "asc" },
  });

  const matching = unpaid.filter((invoice) => {
    const due = dueFridayIso(invoice);
    return date === "overdue" ? due < upcomingFridays[0] : due === date;
  });

  const approved = matching.filter((invoice) => invoice.status === "approved");
  const needsDecision = matching.filter((invoice) => invoice.status !== "approved");

  const byJob = new Map<string, typeof needsDecision>();
  for (const invoice of needsDecision) {
    const list = byJob.get(invoice.job.name);
    if (list) {
      list.push(invoice);
    } else {
      byJob.set(invoice.job.name, [invoice]);
    }
  }
  const jobGroups = [...byJob.entries()].sort(([a], [b]) => a.localeCompare(b));

  const totalCents = matching.reduce((sum, invoice) => sum + invoice.amountCents, 0);
  const heading = date === "overdue" ? "Past due" : formatFriday(date);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
      <div className="space-y-1">
        <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800">
          ← Overview
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">{heading}</h1>
        <p className="text-sm text-gray-500">
          {matching.length} invoice{matching.length === 1 ? "" : "s"} ·{" "}
          {formatCents(totalCents)}
        </p>
      </div>

      {matching.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
          Nothing due{date === "overdue" ? "" : ` for ${heading}`}.
        </p>
      ) : (
        <>
          {approved.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Ready to Pay ({approved.length})
              </h2>
              <PaymentBatchSection
                invoices={approved.map((invoice) => ({
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
          )}

          {jobGroups.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Needs Decision ({needsDecision.length})
              </h2>
              {jobGroups.map(([jobName, invoices]) => (
                <div key={jobName} className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    {jobName} ({invoices.length})
                  </h3>
                  {invoices.map((invoice) => (
                    <InvoiceDecisionCard
                      key={invoice.id}
                      invoiceId={invoice.id}
                      vendorName={invoice.vendor.name}
                      amountCents={invoice.amountCents}
                      costCodeLabel={invoice.costCode.label}
                      jobName={invoice.job.name}
                      intakeNote={invoice.note}
                      attachmentUrl={invoice.attachmentUrl}
                      status={invoice.status}
                    />
                  ))}
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
