"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

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
