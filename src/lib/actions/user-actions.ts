"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";

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
