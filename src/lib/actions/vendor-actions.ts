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
    throw new Error("Only admins can manage vendors");
  }
  return session.user;
}

export async function createVendor(input: { name: string }) {
  await requireAdmin();

  const name = input.name.trim();
  if (!name) {
    throw new Error("Vendor name is required");
  }

  const existing = await db.vendor.findUnique({ where: { name } });
  if (existing) {
    throw new Error("A vendor with that name already exists");
  }

  const vendor = await db.vendor.create({ data: { name } });

  revalidatePath("/admin/vendors");
  revalidatePath("/admin/invoices/new");

  return vendor.id;
}

export async function updateVendor(input: { vendorId: string; name: string }) {
  await requireAdmin();

  const name = input.name.trim();
  if (!name) {
    throw new Error("Vendor name is required");
  }

  const vendor = await db.vendor.findUnique({ where: { id: input.vendorId } });
  if (!vendor) {
    throw new Error("Vendor not found");
  }

  const existing = await db.vendor.findUnique({ where: { name } });
  if (existing && existing.id !== input.vendorId) {
    throw new Error("A vendor with that name already exists");
  }

  await db.vendor.update({
    where: { id: input.vendorId },
    data: { name },
  });

  revalidatePath("/admin/vendors");
  revalidatePath("/admin/invoices/new");
}
