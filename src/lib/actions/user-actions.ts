"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (!session.user.isAdmin) {
    throw new Error("Only admins can manage users");
  }
  return session.user;
}

function assertHasRole(isSuperintendent: boolean, isAdmin: boolean) {
  if (!isSuperintendent && !isAdmin) {
    throw new Error("Select at least one role");
  }
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  isSuperintendent: boolean;
  isAdmin: boolean;
}) {
  await requireAdmin();

  if (!input.name.trim()) {
    throw new Error("Name is required");
  }
  if (!input.email.trim()) {
    throw new Error("Email is required");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  assertHasRole(input.isSuperintendent, input.isAdmin);

  const email = input.email.toLowerCase().trim();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("A user with that email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await db.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      isSuperintendent: input.isSuperintendent,
      isAdmin: input.isAdmin,
    },
  });

  revalidatePath("/admin/users");

  return user.id;
}

export async function updateUserRoles(input: {
  userId: string;
  name: string;
  isSuperintendent: boolean;
  isAdmin: boolean;
}) {
  await requireAdmin();

  if (!input.name.trim()) {
    throw new Error("Name is required");
  }
  assertHasRole(input.isSuperintendent, input.isAdmin);

  const user = await db.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new Error("User not found");
  }

  await db.user.update({
    where: { id: input.userId },
    data: {
      name: input.name.trim(),
      isSuperintendent: input.isSuperintendent,
      isAdmin: input.isAdmin,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/jobs/new");
}

export async function adminResetPassword(input: { userId: string; newPassword: string }) {
  await requireAdmin();

  if (input.newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const user = await db.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await db.user.update({
    where: { id: input.userId },
    data: { passwordHash },
  });
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  if (input.newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    throw new Error("User not found");
  }

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
}
