import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { VendorForm } from "@/components/admin/vendor-form";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const { id } = await params;
  const vendor = await db.vendor.findUnique({ where: { id } });
  if (!vendor) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Edit Vendor</h1>
        <p className="text-sm text-gray-500">{vendor.name}</p>
      </div>

      <VendorForm
        mode="edit"
        vendorId={vendor.id}
        initial={{ name: vendor.name, aliases: vendor.aliases }}
      />
    </main>
  );
}
