import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/domain";
import { InvoiceDecisionCard } from "@/components/invoice-decision-card";

export default async function SuperintendentQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isSuperintendent) redirect("/");

  const userId = session.user.id;

  const [queueRaw, recent] = await Promise.all([
    db.invoice.findMany({
      where: {
        status: { in: ["unpaid", "on_hold"] },
        OR: [{ workCompleted: false }, { status: "on_hold" }],
        job: { superintendentId: userId },
      },
      include: { job: true, costCode: true, vendor: true },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    }),
    db.invoice.findMany({
      where: {
        OR: [{ workCompleted: true }, { status: "paid" }],
        job: { superintendentId: userId },
      },
      include: { job: true, costCode: true, vendor: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const byJob = new Map<string, typeof queueRaw>();
  for (const invoice of queueRaw) {
    const list = byJob.get(invoice.job.name);
    if (list) {
      list.push(invoice);
    } else {
      byJob.set(invoice.job.name, [invoice]);
    }
  }
  const jobGroups = [...byJob.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">My Queue</h1>
        <p className="text-sm text-gray-500">
          Invoices awaiting your sign-off, {session.user.name}
        </p>
      </div>

      {queueRaw.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
          Nothing needs your attention right now.
        </p>
      ) : (
        <div className="space-y-6">
          {jobGroups.map(([jobName, invoices]) => (
            <div key={jobName} className="space-y-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {jobName} ({invoices.length})
              </h2>
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
                  workCompleted={invoice.workCompleted}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Recently signed off
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {recent.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between px-4 py-3 gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {invoice.vendor.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {invoice.costCode.label}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-gray-900">
                    {formatCents(invoice.amountCents)}
                  </p>
                  <StatusBadge status={invoice.status} workCompleted={invoice.workCompleted} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function StatusBadge({
  status,
  workCompleted,
}: {
  status: string;
  workCompleted: boolean;
}) {
  if (status === "paid") {
    return <span className="text-xs font-medium text-blue-700">Paid</span>;
  }
  if (status === "on_hold") {
    return <span className="text-xs font-medium text-amber-700">On Hold</span>;
  }
  if (workCompleted) {
    return <span className="text-xs font-medium text-green-700">Completed</span>;
  }
  return <span className="text-xs font-medium text-gray-500">Unpaid</span>;
}
