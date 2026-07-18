"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createInvoice } from "@/lib/actions/invoice-actions";
import { dollarsToCents } from "@/lib/domain";

type Props = {
  jobs: { id: string; name: string }[];
  costCodes: { id: string; code: string; label: string }[];
};

export function NewInvoiceForm({ jobs, costCodes }: Props) {
  const router = useRouter();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [costCodeId, setCostCodeId] = useState(costCodes[0]?.id ?? "");
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (jobs.length === 0 || costCodes.length === 0) {
    return (
      <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
        {jobs.length === 0
          ? "No jobs exist yet — add one before logging an invoice."
          : "No cost codes exist yet."}
      </p>
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!vendorName.trim()) {
      setError("Vendor name is required.");
      return;
    }
    const cents = dollarsToCents(parseFloat(amount));
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    startTransition(async () => {
      try {
        await createInvoice({
          jobId,
          costCodeId,
          vendorName,
          amountCents: cents,
          note,
          attachmentUrl,
        });
        router.push("/admin");
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
        <label className="text-sm font-medium text-gray-700">Job</label>
        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Cost Code</label>
        <select
          value={costCodeId}
          onChange={(e) => setCostCodeId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {costCodes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Vendor</label>
        <input
          type="text"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          placeholder="Vendor name"
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Amount</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. invoice #, draw number..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">
          Attachment Link (optional)
        </label>
        <input
          type="url"
          value={attachmentUrl}
          onChange={(e) => setAttachmentUrl(e.target.value)}
          placeholder="Paste the Google Drive link to the invoice PDF"
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
        {pending ? "Saving..." : "Log Invoice"}
      </button>
    </form>
  );
}
