"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createJob, updateJob } from "@/lib/actions/job-actions";
import { dollarsToCents, JOB_STATUSES, type JobStatus } from "@/lib/domain";

type Props = {
  mode: "create" | "edit";
  jobId?: string;
  superintendents: { id: string; name: string }[];
  initial?: {
    name: string;
    superintendentId: string;
    budgetCents: number | null;
    status: JobStatus;
  };
};

function statusLabel(status: string) {
  return status
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function JobForm({ mode, jobId, superintendents, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [superintendentId, setSuperintendentId] = useState(
    initial?.superintendentId ?? superintendents[0]?.id ?? ""
  );
  const [budget, setBudget] = useState(
    initial?.budgetCents != null ? (initial.budgetCents / 100).toFixed(2) : ""
  );
  const [status, setStatus] = useState<JobStatus>(initial?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (superintendents.length === 0) {
    return (
      <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
        No superintendent accounts exist yet — add one before creating a job.
      </p>
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Job name is required.");
      return;
    }

    let budgetCents: number | null = null;
    if (budget.trim() !== "") {
      const cents = dollarsToCents(parseFloat(budget));
      if (!Number.isFinite(cents) || cents < 0) {
        setError("Enter a valid budget, or leave it blank.");
        return;
      }
      budgetCents = cents;
    }

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createJob({ name, superintendentId, budgetCents, status });
        } else if (jobId) {
          await updateJob({ jobId, name, superintendentId, budgetCents, status });
        }
        router.push("/admin/jobs");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
    >
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Job Name / Address</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 412 Windridge Ct, Prosper, TX"
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Superintendent</label>
        <select
          value={superintendentId}
          onChange={(e) => setSuperintendentId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {superintendents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Budget (optional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as JobStatus)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 text-white font-medium py-3.5 text-base active:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Saving..." : mode === "create" ? "Create Job" : "Save Changes"}
      </button>
    </form>
  );
}
