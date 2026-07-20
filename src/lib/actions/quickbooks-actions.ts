"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseQuickBooksTransactionCsv } from "@/lib/quickbooks-csv";
import { saveQuickBooksImport } from "@/lib/quickbooks-import";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (!session.user.isAdmin) {
    throw new Error("Only admins can reconcile payments");
  }
  return session.user;
}

export async function confirmPaymentMatch(input: {
  paymentId: string;
  quickbooksTransactionId: string;
}) {
  await requireAdmin();

  const payment = await db.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) {
    throw new Error("Payment not found");
  }
  if (payment.quickbooksTransactionId) {
    throw new Error("This payment is already reconciled");
  }

  await db.payment.update({
    where: { id: input.paymentId },
    data: { quickbooksTransactionId: input.quickbooksTransactionId },
  });

  revalidatePath("/admin/reconcile");
}

export async function uploadQuickBooksCsv(formData: FormData) {
  const user = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a CSV file to upload.");
  }

  const text = await file.text();
  const purchases = parseQuickBooksTransactionCsv(text);
  await saveQuickBooksImport(user.id, purchases);

  revalidatePath("/admin/reconcile");
}
