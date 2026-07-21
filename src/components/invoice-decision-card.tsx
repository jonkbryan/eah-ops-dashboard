"use client";

import { useRef, useState, useTransition } from "react";
import { decideInvoice } from "@/lib/actions/invoice-actions";
import { formatCents } from "@/lib/domain";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";

type Props = {
  invoiceId: string;
  vendorName: string;
  amountCents: number;
  costCodeLabel: string;
  jobName: string;
  intakeNote: string | null;
  attachmentUrl?: string | null;
  showJobName?: boolean;
  status?: string;
};

export function InvoiceDecisionCard({
  invoiceId,
  vendorName,
  amountCents,
  costCodeLabel,
  jobName,
  intakeNote,
  attachmentUrl,
  showJobName = false,
  status,
}: Props) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "approved" | "rejected" | "flagged" | null
  >(null);
  const [signing, setSigning] = useState(false);
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  function submit(decision: "approved" | "rejected" | "flagged", signature?: string) {
    setError(null);
    setBusyAction(decision);
    startTransition(async () => {
      try {
        await decideInvoice({ invoiceId, decision, note, signature });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setBusyAction(null);
      }
    });
  }

  function confirmApproval() {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError("Please sign to approve.");
      return;
    }
    submit("approved", signaturePadRef.current.toDataUrl());
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{vendorName}</p>
            {status === "flagged" && (
              <span className="shrink-0 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                Flagged
              </span>
            )}
            {status === "rejected" && (
              <span className="shrink-0 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                Rejected
              </span>
            )}
          </div>
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

      {attachmentUrl && (
        <a
          href={attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          View invoice
        </a>
      )}

      {!signing && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note..."
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {signing ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Sign to approve this invoice
          </p>
          <SignaturePad ref={signaturePadRef} />
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setSigning(false);
                setError(null);
              }}
              disabled={pending}
              className="rounded-lg bg-white border border-gray-300 text-gray-700 font-medium py-3 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => signaturePadRef.current?.clear()}
              disabled={pending}
              className="rounded-lg bg-white border border-gray-300 text-gray-700 font-medium py-3 text-sm disabled:opacity-50"
            >
              Clear
            </button>
            <button
              onClick={confirmApproval}
              disabled={pending}
              className="rounded-lg bg-green-600 text-white font-medium py-3 text-sm active:bg-green-700 disabled:opacity-50"
            >
              {busyAction === "approved" ? "..." : "Confirm"}
            </button>
          </div>
        </div>
      ) : (
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
            onClick={() => {
              setError(null);
              setSigning(true);
            }}
            disabled={pending}
            className="rounded-lg bg-green-600 text-white font-medium py-3 text-sm active:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}
