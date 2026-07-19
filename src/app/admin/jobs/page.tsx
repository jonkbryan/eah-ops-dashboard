import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/domain";
import { AdminTabs } from "@/components/admin/admin-tabs";

function statusLabel(status: string) {
  return status
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const jobs = await db.job.findMany({
    include: { superintendent: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Jobs</h1>
            <p className="text-sm text-gray-500">{jobs.length} job(s)</p>
          </div>
          <Link
            href="/admin/jobs/new"
            className="shrink-0 rounded-lg bg-blue-600 text-white font-medium px-4 py-2.5 text-sm active:bg-blue-700"
          >
            + New Job
          </Link>
        </div>
        <AdminTabs active="jobs" />
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
          No jobs yet.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/admin/jobs/${job.id}/edit`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{job.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {job.superintendent ? job.superintendent.name : "Unassigned"} ·{" "}
                  {statusLabel(job.status)}
                  {job.address ? ` · ${job.address}` : ""}
                </p>
              </div>
              <p className="text-sm text-gray-500 shrink-0">
                {job.budgetCents != null ? formatCents(job.budgetCents) : "—"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
