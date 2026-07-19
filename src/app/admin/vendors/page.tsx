import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function VendorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const vendors = await db.vendor.findMany({
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Vendors</h1>
            <p className="text-sm text-gray-500">{vendors.length} vendor(s)</p>
          </div>
          <Link
            href="/admin/vendors/new"
            className="shrink-0 rounded-lg bg-blue-600 text-white font-medium px-4 py-2.5 text-sm active:bg-blue-700"
          >
            + New Vendor
          </Link>
        </div>
        <AdminTabs active="vendors" />
      </div>

      {vendors.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
          No vendors yet.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {vendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/admin/vendors/${vendor.id}/edit`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
            >
              <p className="text-sm font-medium text-gray-900 truncate">{vendor.name}</p>
              <p className="text-xs text-gray-500 shrink-0">
                {vendor._count.invoices} invoice(s)
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
