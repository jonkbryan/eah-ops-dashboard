"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { JobStatus } from "@/lib/domain";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (!session.user.isAdmin) {
    throw new Error("Only admins can manage jobs");
  }
  return session.user;
}

async function assertSuperintendent(superintendentId: string) {
  const superintendent = await db.user.findUnique({ where: { id: superintendentId } });
  if (!superintendent || !superintendent.isSuperintendent) {
    throw new Error("Selected user is not a superintendent");
  }
}

type JobInput = {
  name: string;
  address: string | null;
  superintendentId: string;
  budgetCents: number | null;
  status: JobStatus;
};

export async function createJob(input: JobInput) {
  await requireAdmin();

  if (!input.name.trim()) {
    throw new Error("Job name is required");
  }
  await assertSuperintendent(input.superintendentId);

  const job = await db.job.create({
    data: {
      name: input.name.trim(),
      address: input.address?.trim() || null,
      superintendentId: input.superintendentId,
      budgetCents: input.budgetCents,
      status: input.status,
    },
  });

  revalidatePath("/admin/jobs");
  revalidatePath("/admin/invoices/new");

  return job.id;
}

export async function updateJob(input: JobInput & { jobId: string }) {
  await requireAdmin();

  if (!input.name.trim()) {
    throw new Error("Job name is required");
  }
  await assertSuperintendent(input.superintendentId);

  const job = await db.job.findUnique({ where: { id: input.jobId } });
  if (!job) {
    throw new Error("Job not found");
  }

  await db.job.update({
    where: { id: input.jobId },
    data: {
      name: input.name.trim(),
      address: input.address?.trim() || null,
      superintendentId: input.superintendentId,
      budgetCents: input.budgetCents,
      status: input.status,
    },
  });

  revalidatePath("/admin/jobs");
  revalidatePath("/admin");
  revalidatePath("/superintendent");
}
