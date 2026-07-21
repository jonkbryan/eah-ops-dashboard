import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/domain";
import { getUpcomingFridays, dueFridayIso } from "@/lib/payment-schedule";
import { InvoiceDecisionCard } from "@/components/invoice-decision-card";
import { PaymentBatchSection } from "@/components/admin/payment-batch-section";
import { PaymentHubSummary, type PaymentBucket } from "@/components/admin/payment-hub-summary";
import { AdminTabs } from "@/components/admin/admin-tabs";

const SORT_OPTIONS = {
  oldest: { createdAt: "asc" as const },
  newest: { createdAt: "desc" as const },
  amount_desc: { amountCents: "desc" as const },
  amount_asc: { amountCents: "asc" as const },
};
type SortKey = keyof typeof SORT_OPTIONS;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; sort?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const { job: jobFilter, sort } = await searchParams;
  const sortKey: SortKey = sort && sort in SORT_OPTIONS ? (sort as SortKey) : "oldest";

  const [readyToPay, needsDecision, history, jobs, unpaidForHub] = await Promise.all([
    db.invoice.findMany({
      where: { status: "unpaid", workCompleted: true },
      include: { job: true, costCode: true, vendor: true },
      orderBy: { workCompletedAt: "asc" },
    }),
    db.invoice.findMany({
      where: {
        status: { in: ["unpaid", "on_hold"] },
        OR: [{ workCompleted: false }, { status: "on_hold" }],
        ...(jobFilter ? { jobId: jobFilter } : {}),
      },
      include: { job: true, costCode: true, vendor: true },
      orderBy: SORT_OPTIONS[sortKey],
    }),
    db.invoice.findMany({
      where: { status: "paid" },
      include: { job: true, costCode: true, vendor: true, payments: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    db.job.findMany({ orderBy: { name: "asc" } }),
    db.invoice.findMany({
      where: { status: { not: "paid" } },
      select: {
        amountCents: true,
        status: true,
        workCompleted: true,
        scheduledPaymentDate: true,
        createdAt: true,
      },
    }),
  ]);

  const upcomingFridays = getUpcomingFridays(4);
  const bucketMap = new Map<string, PaymentBucket>(
    ["overdue", ...upcomingFridays].map((key) => [
      key,
      { key, totalCents: 0, count: 0, workCompletedCount: 0 },
    ])
  );
  for (const invoice of unpaidForHub) {
    const due = dueFridayIso(invoice);
    const key = due < upcomingFridays[0] ? "overdue" : due;
    const bucket = bucketMap.get(key);
    if (!bucket) continue; // scheduled further out than the 4-week window
    bucket.totalCents += invoice.amountCents;
    bucket.count += 1;
    if (invoice.workCompleted) bucket.workCompletedCount += 1;
  }
  const paymentBuckets = [...bucketMap.values()];
  const totalInvoicesCents = unpaidForHub.reduce((sum, i) => sum + i.amountCents, 0);

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

      <PaymentHubSummary
        buckets={paymentBuckets}
        totalCents={totalInvoicesCents}
        totalCount={unpaidForHub.length}
      />

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
            workCompletedSignature: invoice.workCompletedSignature,
            scheduledPaymentDate: invoice.scheduledPaymentDate,
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Needs Decision — All Jobs ({needsDecision.length})
        </h2>

        <form method="GET" className="flex flex-col sm:flex-row gap-2">
          <select
            name="job"
            defaultValue={jobFilter ?? ""}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.name}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={sortKey}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
            <option value="amount_desc">Largest amount</option>
            <option value="amount_asc">Smallest amount</option>
          </select>
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-gray-900 text-white font-medium px-4 py-2.5 text-sm"
          >
            Apply
          </button>
        </form>

        {needsDecision.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
            Nothing needs attention right now.
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
                status={invoice.status}
                workCompleted={invoice.workCompleted}
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
                  {invoice.payments[0]?.reference && (
                    <p className="text-xs text-gray-400 truncate">
                      Ref: {invoice.payments[0].reference}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-gray-900">
                    {formatCents(invoice.amountCents)}
                  </p>
                  <p className="text-xs font-medium capitalize text-blue-700">
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
