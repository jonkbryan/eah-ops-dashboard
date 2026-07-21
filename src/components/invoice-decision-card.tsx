"use client";

import { useRef, useState, useTransition } from "react";
import { markWorkCompleted, setOnHold } from "@/lib/actions/invoice-actions";
import { formatCents, todayIso } from "@/lib/domain";
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
  status: string; // "unpaid" | "on_hold"
  workCompleted: boolean;
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
  workCompleted,
}: Props) {
  const [note, setNote] = useState("");
  const [completedDate, setCompletedDate] = useState(todayIso());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"hold" | "complete" | null>(null);
  const [signing, setSigning] = useState(false);
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  const onHold = status === "on_hold";

  function toggleHold() {
    setError(null);
    setBusyAction("hold");
    startTransition(async () => {
      try {
        await setOnHold({ invoiceId, onHold: !onHold, note });
        setNote("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setBusyAction(null);
      }
    });
  }

  function confirmWorkCompleted() {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError("Please sign to confirm the work is completed.");
      return;
    }
    setError(null);
    setBusyAction("complete");
    startTransition(async () => {
      try {
        await markWorkCompleted({
          invoiceId,
          signature: signaturePadRef.current!.toDataUrl(),
          completedDate: completedDate || undefined,
        });
        setSigning(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setBusyAction(null);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 truncate">{vendorName}</p>
            {onHold && (
              <span className="shrink-0 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                On Hold
              </span>
            )}
            {workCompleted && (
              <span className="shrink-0 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                Work Completed
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

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {signing ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Sign to confirm the work is completed
          </p>
          <SignaturePad ref={signaturePadRef} />
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Completed date (optional)</label>
            <input
              type="date"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
              onClick={confirmWorkCompleted}
              disabled={pending}
              className="rounded-lg bg-green-600 text-white font-medium py-3 text-sm active:bg-green-700 disabled:opacity-50"
            >
              {busyAction === "complete" ? "..." : "Confirm"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {!onHold && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleHold}
              disabled={pending}
              className={`rounded-lg font-medium py-3 text-sm disabled:opacity-50 ${
                onHold
                  ? "bg-gray-100 text-gray-700 active:bg-gray-200"
                  : "bg-amber-50 text-amber-700 active:bg-amber-100"
              }`}
            >
              {busyAction === "hold" ? "..." : onHold ? "Take Off Hold" : "Put On Hold"}
            </button>
            <button
              onClick={() => {
                setError(null);
                setSigning(true);
              }}
              disabled={pending || workCompleted}
              className="rounded-lg bg-green-600 text-white font-medium py-3 text-sm active:bg-green-700 disabled:opacity-50"
            >
              {workCompleted ? "Completed" : "Mark Completed"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
