import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NewInvoiceForm } from "@/components/admin/new-invoice-form";

export default async function NewInvoicePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const [jobs, costCodes] = await Promise.all([
    db.job.findMany({ orderBy: { name: "asc" } }),
    db.costCode.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Log Invoice</h1>
        <p className="text-sm text-gray-500">Enter a new invoice for review</p>
      </div>

      <NewInvoiceForm
        jobs={jobs.map((j) => ({ id: j.id, name: j.name }))}
        costCodes={costCodes.map((c) => ({ id: c.id, code: c.code, label: c.label }))}
      />
    </main>
  );
}
