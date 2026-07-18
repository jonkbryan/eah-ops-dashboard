"use client";

import { useState, useTransition } from "react";
import { decideInvoice } from "@/lib/actions/invoice-actions";
import { formatCents } from "@/lib/domain";

type Props = {
  invoiceId: string;
  vendorName: string;
  amountCents: number;
  costCodeLabel: string;
  jobName: string;
  intakeNote: string | null;
  showJobName?: boolean;
};

export function InvoiceDecisionCard({
  invoiceId,
  vendorName,
  amountCents,
  costCodeLabel,
  jobName,
  intakeNote,
  showJobName = false,
}: Props) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "approved" | "rejected" | "flagged" | null
  >(null);

  function submit(decision: "approved" | "rejected" | "flagged") {
    setError(null);
    setBusyAction(decision);
    startTransition(async () => {
      try {
        await decideInvoice({ invoiceId, decision, note });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setBusyAction(null);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{vendorName}</p>
          <p className="text-sm text-gray-500 truncate">
            {costCodeLabel}
            {showJobName ? ` · ${jobName}` : ""}
          </p>
        </div>
        <p className="text-lg font-semibold text-gray-900 shrink-0">
          {formatCents(amountCents)}
        </p>
      </div>

      {intakeNote && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          {intakeNote}
        </p>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note..."
        rows={2}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => submit("rejected")}
          disabled={pending}
          className="rounded-lg bg-red-50 text-red-700 font-medium py-3 text-sm active:bg-red-100 disabled:opacity-50"
        >
          {busyAction === "rejected" ? "..." : "Reject"}
        </button>
        <button
          onClick={() => submit("flagged")}
          disabled={pending}
          className="rounded-lg bg-amber-50 text-amber-700 font-medium py-3 text-sm active:bg-amber-100 disabled:opacity-50"
        >
          {busyAction === "flagged" ? "..." : "Flag"}
        </button>
        <button
          onClick={() => submit("approved")}
          disabled={pending}
          className="rounded-lg bg-green-600 text-white font-medium py-3 text-sm active:bg-green-700 disabled:opacity-50"
        >
          {busyAction === "approved" ? "..." : "Approve"}
        </button>
      </div>
    </div>
  );
}
