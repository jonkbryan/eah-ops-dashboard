import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCents, INVOICE_STATUSES } from "@/lib/domain";
import { AdminTabs } from "@/components/admin/admin-tabs";

const STATUS_STYLES: Record<string, string> = {
  approved: "text-green-700 bg-green-50",
  rejected: "text-red-700 bg-red-50",
  paid: "text-blue-700 bg-blue-50",
  flagged: "text-amber-700 bg-amber-50",
  pending: "text-gray-600 bg-gray-100",
};

export default async function AllInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const { status, q } = await searchParams;
  const search = q?.trim() ?? "";

  const invoices = await db.invoice.findMany({
    where: {
      ...(status && status !== "all" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { vendor: { name: { contains: search, mode: "insensitive" } } },
              { job: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { job: true, costCode: true, vendor: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">All Invoices</h1>
            <p className="text-sm text-gray-500">{invoices.length} invoice(s)</p>
          </div>
          <Link
            href="/admin/invoices/new"
            className="shrink-0 rounded-lg bg-blue-600 text-white font-medium px-4 py-2.5 text-sm active:bg-blue-700"
          >
            + Log Invoice
          </Link>
        </div>
        <AdminTabs active="invoices" />
      </div>

      <form method="GET" className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search vendor or job..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="status"
          defaultValue={status ?? "all"}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-gray-900 text-white font-medium px-4 py-2.5 text-sm"
        >
          Filter
        </button>
      </form>

      {invoices.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
          No invoices match.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {invoice.vendor.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {invoice.costCode.label} · {invoice.job.name} ·{" "}
                  {invoice.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {invoice.attachmentUrl && (
                  <a
                    href={invoice.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    View
                  </a>
                )}
                <div className="text-right">
                  <p className="text-sm text-gray-900">
                    {formatCents(invoice.amountCents)}
                  </p>
                  <span
                    className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                      STATUS_STYLES[invoice.status] ?? "text-gray-600 bg-gray-100"
                    }`}
                  >
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
