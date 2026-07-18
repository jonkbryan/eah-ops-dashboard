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

  const [queue, recent] = await Promise.all([
    db.invoice.findMany({
      where: {
        status: { in: ["pending", "flagged"] },
        job: { superintendentId: userId },
      },
      include: { job: true, costCode: true },
      orderBy: { createdAt: "asc" },
    }),
    db.invoice.findMany({
      where: {
        status: { in: ["approved", "rejected", "paid"] },
        job: { superintendentId: userId },
      },
      include: { job: true, costCode: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">My Queue</h1>
        <p className="text-sm text-gray-500">
          Invoices awaiting your approval, {session.user.name}
        </p>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
          Nothing needs your attention right now.
        </p>
      ) : (
        <div className="space-y-3">
          {queue.map((invoice) => (
            <InvoiceDecisionCard
              key={invoice.id}
              invoiceId={invoice.id}
              vendorName={invoice.vendorName}
              amountCents={invoice.amountCents}
              costCodeLabel={invoice.costCode.label}
              jobName={invoice.job.name}
              intakeNote={invoice.note}
              attachmentUrl={invoice.attachmentUrl}
            />
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Recently decided
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {recent.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between px-4 py-3 gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {invoice.vendorName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {invoice.costCode.label}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-gray-900">
                    {formatCents(invoice.amountCents)}
                  </p>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "text-green-700",
    rejected: "text-red-700",
    paid: "text-blue-700",
    flagged: "text-amber-700",
    pending: "text-gray-500",
  };
  return (
    <span className={`text-xs font-medium capitalize ${styles[status] ?? "text-gray-500"}`}>
      {status}
    </span>
  );
}
