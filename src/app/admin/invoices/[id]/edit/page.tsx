import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { InvoiceEditForm } from "@/components/admin/invoice-edit-form";
import { InvoiceStatusActions } from "@/components/admin/invoice-status-actions";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const { id } = await params;

  const [invoice, jobs, costCodes, vendors] = await Promise.all([
    db.invoice.findUnique({ where: { id } }),
    db.job.findMany({ orderBy: { name: "asc" } }),
    db.costCode.findMany({ orderBy: { code: "asc" } }),
    db.vendor.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Edit Invoice</h1>
        <p className="text-sm text-gray-500 capitalize">Status: {invoice.status}</p>
      </div>

      {invoice.status === "paid" ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
          Paid invoices can&apos;t be edited.
        </p>
      ) : (
        <>
          <InvoiceStatusActions
            invoiceId={invoice.id}
            status={invoice.status}
            amountCents={invoice.amountCents}
          />
          <InvoiceEditForm
            invoiceId={invoice.id}
            jobs={jobs}
            costCodes={costCodes}
            vendors={vendors}
            initial={{
              jobId: invoice.jobId,
              costCodeId: invoice.costCodeId,
              vendorId: invoice.vendorId,
              amountCents: invoice.amountCents,
              note: invoice.note,
              attachmentUrl: invoice.attachmentUrl,
            }}
          />
        </>
      )}
    </main>
  );
}
