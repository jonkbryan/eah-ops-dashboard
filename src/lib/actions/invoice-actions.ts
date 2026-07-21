"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { insertInvoice } from "@/lib/invoice-core";

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  return session.user;
}

export async function createInvoice(input: {
  jobId: string;
  costCodeId: string;
  vendorId: string;
  amountCents: number;
  note?: string;
  attachmentUrl?: string;
}) {
  const user = await requireUser();

  if (!user.isAdmin) {
    throw new Error("Only admins can log invoices");
  }
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const [job, costCode, vendor] = await Promise.all([
    db.job.findUnique({ where: { id: input.jobId } }),
    db.costCode.findUnique({ where: { id: input.costCodeId } }),
    db.vendor.findUnique({ where: { id: input.vendorId } }),
  ]);
  if (!job) {
    throw new Error("Job not found");
  }
  if (!costCode) {
    throw new Error("Cost code not found");
  }
  if (!vendor) {
    throw new Error("Vendor not found");
  }

  const invoice = await insertInvoice({
    jobId: input.jobId,
    costCodeId: input.costCodeId,
    vendorId: input.vendorId,
    amountCents: input.amountCents,
    note: input.note,
    attachmentUrl: input.attachmentUrl,
  });

  revalidatePath("/admin");
  revalidatePath("/superintendent");

  return invoice.id;
}

// Lets an admin correct fields on an invoice after the fact — mainly for
// invoices ingested via /api/invoices/ingest, where Make.com doesn't
// compute a cost code and vendor/job name matching can occasionally be
// wrong. Blocked once an invoice is paid, matching the existing "no
// reopening a paid invoice" rule elsewhere in the app.
export async function updateInvoice(input: {
  invoiceId: string;
  jobId: string;
  costCodeId: string;
  vendorId: string;
  amountCents: number;
  note?: string;
  attachmentUrl?: string;
}) {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new Error("Only admins can edit invoices");
  }
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const invoice = await db.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  if (invoice.status === "paid") {
    throw new Error("Paid invoices can't be edited");
  }

  const [job, costCode, vendor] = await Promise.all([
    db.job.findUnique({ where: { id: input.jobId } }),
    db.costCode.findUnique({ where: { id: input.costCodeId } }),
    db.vendor.findUnique({ where: { id: input.vendorId } }),
  ]);
  if (!job) {
    throw new Error("Job not found");
  }
  if (!costCode) {
    throw new Error("Cost code not found");
  }
  if (!vendor) {
    throw new Error("Vendor not found");
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      jobId: input.jobId,
      costCodeId: input.costCodeId,
      vendorId: input.vendorId,
      amountCents: input.amountCents,
      note: input.note?.trim() || null,
      attachmentUrl: input.attachmentUrl?.trim() || null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/invoices");
  revalidatePath("/superintendent");
}

// Confirms the actual work is done — required before an invoice can be
// marked paid, independent of on-hold status. Superintendents can do this
// for their own jobs; admins for any. Requires a signature (same on-screen
// pad the old approval step used). completedDate is optional — the person
// signing off might not remember/know the exact date — but
// workCompletedAt (the sign-off timestamp itself) is always recorded.
export async function markWorkCompleted(input: {
  invoiceId: string;
  signature: string;
  completedDate?: string; // yyyy-mm-dd, optional
}) {
  const user = await requireUser();

  const invoice = await db.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { job: true },
  });
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const isAssignedSuperintendent =
    user.isSuperintendent && invoice.job.superintendentId === user.id;
  if (!isAssignedSuperintendent && !user.isAdmin) {
    throw new Error("You are not authorized to sign off on this invoice");
  }
  if (invoice.status === "paid") {
    throw new Error("This invoice has already been paid");
  }
  if (!input.signature) {
    throw new Error("A signature is required to confirm the work is completed");
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      workCompleted: true,
      workCompletedSignature: input.signature,
      workCompletedById: user.id,
      workCompletedAt: new Date(),
      workCompletedDate: input.completedDate
        ? new Date(`${input.completedDate}T00:00:00`)
        : null,
    },
  });

  revalidatePath("/superintendent");
  revalidatePath("/admin");
}

// Admin-only: undoes a signed work-completion sign-off (e.g. marked by
// mistake). Mirrors the old "Undo approval" — deliberately not exposed to
// superintendents on their own invoices, same reasoning as before.
export async function undoWorkCompleted(invoiceId: string) {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new Error("Only admins can undo a work-completion sign-off");
  }

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  if (invoice.status === "paid") {
    throw new Error("This invoice has already been paid");
  }
  if (!invoice.workCompleted) {
    throw new Error("This invoice isn't marked as work-completed");
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      workCompleted: false,
      workCompletedSignature: null,
      workCompletedById: null,
      workCompletedAt: null,
      workCompletedDate: null,
      scheduledPaymentDate: null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/superintendent");
}

// Toggles an invoice on/off hold — a hold means something about the
// invoice itself needs attention (wrong vendor/amount/etc, correct it via
// the edit page, or just a general "don't pay this yet"). Independent of
// workCompleted — an invoice can be work-completed and on hold at once.
// Same authorization as marking work completed.
export async function setOnHold(input: {
  invoiceId: string;
  onHold: boolean;
  note?: string;
}) {
  const user = await requireUser();

  const invoice = await db.invoice.findUnique({
    where: { id: input.invoiceId },
    include: { job: true },
  });
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const isAssignedSuperintendent =
    user.isSuperintendent && invoice.job.superintendentId === user.id;
  if (!isAssignedSuperintendent && !user.isAdmin) {
    throw new Error("You are not authorized to change this invoice's hold status");
  }
  if (invoice.status === "paid") {
    throw new Error("This invoice has already been paid");
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: input.onHold ? "on_hold" : "unpaid",
      decisionNote: input.note?.trim() || null,
      decidedById: user.id,
      decidedAt: new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/superintendent");
}

export async function markInvoicePaid(input: {
  invoiceId: string;
  amountCents: number;
  method: string;
  paidOn?: string; // yyyy-mm-dd from a <input type="date">
  reference?: string; // check #, ACH/wire confirmation, or the vendor's invoice #
}) {
  const user = await requireUser();

  if (!user.isAdmin) {
    throw new Error("Only admins can record payments");
  }

  const invoice = await db.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  if (invoice.status !== "unpaid" || !invoice.workCompleted) {
    throw new Error(
      "This invoice must be marked work-completed and off hold before it can be paid"
    );
  }
  if (input.amountCents <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  await db.$transaction([
    db.payment.create({
      data: {
        invoiceId: invoice.id,
        amountCents: input.amountCents,
        method: input.method,
        reference: input.reference?.trim() || null,
        paidAt: input.paidOn ? new Date(`${input.paidOn}T00:00:00`) : new Date(),
        recordedById: user.id,
      },
    }),
    db.invoice.update({
      where: { id: invoice.id },
      data: { status: "paid" },
    }),
  ]);

  revalidatePath("/admin");
}

// Marks/updates which Friday payment batch a work-completed invoice is
// slated for — scheduling metadata only, doesn't change status or record a
// payment. Pass null to clear it.
export async function setScheduledPaymentDate(input: {
  invoiceId: string;
  scheduledPaymentDate: string | null; // yyyy-mm-dd or null to clear
}) {
  const user = await requireUser();

  if (!user.isAdmin) {
    throw new Error("Only admins can schedule payments");
  }

  const invoice = await db.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  if (invoice.status !== "unpaid" || !invoice.workCompleted) {
    throw new Error("Only work-completed, unpaid invoices can be scheduled for payment");
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      scheduledPaymentDate: input.scheduledPaymentDate
        ? new Date(`${input.scheduledPaymentDate}T00:00:00`)
        : null,
    },
  });

  revalidatePath("/admin");
}

// Marks a whole batch of ready-to-pay invoices paid in one go (e.g. the
// weekly Thursday payment run) — each gets a Payment for its full amount,
// sharing one method/date. For a payment that isn't the full invoice
// amount, use markInvoicePaid on that invoice individually instead.
export async function markInvoicesPaidBatch(input: {
  invoiceIds: string[];
  method: string;
  paidOn?: string;
}) {
  const user = await requireUser();

  if (!user.isAdmin) {
    throw new Error("Only admins can record payments");
  }
  if (input.invoiceIds.length === 0) {
    throw new Error("Select at least one invoice");
  }

  const invoices = await db.invoice.findMany({
    where: { id: { in: input.invoiceIds } },
  });
  if (invoices.length !== input.invoiceIds.length) {
    throw new Error("One or more selected invoices could not be found");
  }
  const notReady = invoices.filter(
    (invoice) => invoice.status !== "unpaid" || !invoice.workCompleted
  );
  if (notReady.length > 0) {
    throw new Error(
      `${notReady.length} selected invoice(s) are no longer ready to pay — refresh and try again`
    );
  }

  const paidAt = input.paidOn ? new Date(`${input.paidOn}T00:00:00`) : new Date();

  await db.$transaction(
    invoices.flatMap((invoice) => [
      db.payment.create({
        data: {
          invoiceId: invoice.id,
          amountCents: invoice.amountCents,
          method: input.method,
          paidAt,
          recordedById: user.id,
        },
      }),
      db.invoice.update({
        where: { id: invoice.id },
        data: { status: "paid" },
      }),
    ])
  );

  revalidatePath("/admin");
}
