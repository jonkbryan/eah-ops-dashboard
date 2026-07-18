"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  return session.user;
}

type Decision = "approved" | "rejected" | "flagged";

export async function createInvoice(input: {
  jobId: string;
  costCodeId: string;
  vendorName: string;
  amountCents: number;
  note?: string;
}) {
  const user = await requireUser();

  if (!user.isAdmin) {
    throw new Error("Only admins can log invoices");
  }
  if (!input.vendorName.trim()) {
    throw new Error("Vendor name is required");
  }
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const [job, costCode] = await Promise.all([
    db.job.findUnique({ where: { id: input.jobId } }),
    db.costCode.findUnique({ where: { id: input.costCodeId } }),
  ]);
  if (!job) {
    throw new Error("Job not found");
  }
  if (!costCode) {
    throw new Error("Cost code not found");
  }

  const invoice = await db.invoice.create({
    data: {
      jobId: input.jobId,
      costCodeId: input.costCodeId,
      vendorName: input.vendorName.trim(),
      amountCents: input.amountCents,
      note: input.note?.trim() || null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/superintendent");

  return invoice.id;
}

export async function decideInvoice(input: {
  invoiceId: string;
  decision: Decision;
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

  // A superintendent may only decide invoices on their own assigned job.
  // Admins can decide/override any invoice at any stage.
  if (!isAssignedSuperintendent && !user.isAdmin) {
    throw new Error("You are not authorized to decide this invoice");
  }

  if (invoice.status === "paid" && !user.isAdmin) {
    throw new Error("Only admins can change a paid invoice");
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: input.decision,
      decisionNote: input.note?.trim() || null,
      decidedById: user.id,
      decidedAt: new Date(),
    },
  });

  revalidatePath("/superintendent");
  revalidatePath("/admin");
}

export async function markInvoicePaid(input: {
  invoiceId: string;
  amountCents: number;
  method: string;
  paidOn?: string; // yyyy-mm-dd from a <input type="date">
}) {
  const user = await requireUser();

  if (!user.isAdmin) {
    throw new Error("Only admins can record payments");
  }

  const invoice = await db.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  if (invoice.status !== "approved") {
    throw new Error("Only approved invoices can be marked paid");
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
