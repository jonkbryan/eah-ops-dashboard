import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { JobForm } from "@/components/admin/job-form";

export default async function NewJobPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const superintendents = await db.user.findMany({
    where: { isSuperintendent: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">New Job</h1>
        <p className="text-sm text-gray-500">Add a job and assign a superintendent</p>
      </div>

      <JobForm
        mode="create"
        superintendents={superintendents.map((s) => ({ id: s.id, name: s.name }))}
      />
    </main>
  );
}
