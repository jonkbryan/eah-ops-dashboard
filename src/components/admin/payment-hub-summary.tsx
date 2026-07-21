import Link from "next/link";
import { formatCents } from "@/lib/domain";
import { formatFriday } from "@/lib/payment-schedule";

export type PaymentBucket = {
  key: string; // "overdue" or an ISO Friday date
  totalCents: number;
  count: number;
  workCompletedCount: number;
};

export function PaymentHubSummary({
  buckets,
  totalCents,
  totalCount,
}: {
  buckets: PaymentBucket[];
  totalCents: number;
  totalCount: number;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Upcoming Payments
        </h2>
        <p className="text-sm text-gray-500">
          Total Invoices: <span className="font-semibold text-gray-900">{formatCents(totalCents)}</span>{" "}
          ({totalCount})
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {buckets.map((bucket) => {
          const isOverdue = bucket.key === "overdue";
          const label = isOverdue ? "Past due" : formatFriday(bucket.key);
          const flagged = isOverdue && bucket.count > 0;
          return (
            <Link
              key={bucket.key}
              href={`/admin/payments/${bucket.key}`}
              className={`rounded-2xl border p-4 space-y-1 shadow-sm ${
                flagged
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <p
                className={`text-xs font-medium uppercase tracking-wide ${
                  flagged ? "text-red-700" : "text-gray-500"
                }`}
              >
                {label}
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCents(bucket.totalCents)}
              </p>
              <p className="text-xs text-gray-500">
                {bucket.count} invoice{bucket.count === 1 ? "" : "s"}
                {bucket.count > 0 && ` · ${bucket.workCompletedCount} completed`}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
