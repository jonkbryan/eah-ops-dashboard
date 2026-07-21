"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateInvoice } from "@/lib/actions/invoice-actions";

type Props = {
  invoiceId: string;
  jobs: { id: string; name: string }[];
  costCodes: { id: string; code: string; label: string }[];
  vendors: { id: string; name: string }[];
  initial: {
    jobId: string;
    costCodeId: string;
    vendorId: string;
    amountCents: number;
    note: string | null;
    attachmentUrl: string | null;
  };
};

export function InvoiceEditForm({ invoiceId, jobs, costCodes, vendors, initial }: Props) {
  const router = useRouter();
  const [jobId, setJobId] = useState(initial.jobId);
  const [costCodeId, setCostCodeId] = useState(initial.costCodeId);
  const [vendorId, setVendorId] = useState(initial.vendorId);
  const [amount, setAmount] = useState((initial.amountCents / 100).toFixed(2));
  const [note, setNote] = useState(initial.note ?? "");
  const [attachmentUrl, setAttachmentUrl] = useState(initial.attachmentUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    startTransition(async () => {
      try {
        await updateInvoice({
          invoiceId,
          jobId,
          costCodeId,
          vendorId,
          amountCents: cents,
          note,
          attachmentUrl,
        });
        router.push("/admin/invoices");
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
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Amount</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
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
        {pending ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
