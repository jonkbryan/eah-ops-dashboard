import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { JobForm } from "@/components/admin/job-form";
import type { JobStatus } from "@/lib/domain";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const { id } = await params;

  const [job, superintendents] = await Promise.all([
    db.job.findUnique({ where: { id } }),
    db.user.findMany({ where: { isSuperintendent: true }, orderBy: { name: "asc" } }),
  ]);

  if (!job) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Edit Job</h1>
        <p className="text-sm text-gray-500">{job.name}</p>
      </div>

      <JobForm
        mode="edit"
        jobId={job.id}
        superintendents={superintendents.map((s) => ({ id: s.id, name: s.name }))}
        initial={{
          name: job.name,
          address: job.address,
          superintendentId: job.superintendentId ?? superintendents[0]?.id ?? "",
          budgetCents: job.budgetCents,
          status: job.status as JobStatus,
        }}
      />
    </main>
  );
}
