"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markWorkCompleted,
  setOnHold,
  undoWorkCompleted,
} from "@/lib/actions/invoice-actions";
import { todayIso } from "@/lib/domain";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";
import { MarkPaidForm } from "@/components/admin/mark-paid-form";

type Props = {
  invoiceId: string;
  status: string; // "unpaid" | "on_hold"
  amountCents: number;
  workCompleted: boolean;
  workCompletedSignature: string | null;
  workCompletedDate: string | null; // yyyy-mm-dd, or null
};

// Lets an admin move an invoice through its full lifecycle right from the
// edit screen — same markWorkCompleted/setOnHold/undoWorkCompleted/
// markInvoicePaid actions (and same auth rules) used elsewhere, just
// surfaced in one place instead of requiring a trip back to the Overview
// or Ready-to-Pay queues.
export function InvoiceStatusActions({
  invoiceId,
  status,
  amountCents,
  workCompleted,
  workCompletedSignature,
  workCompletedDate,
}: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [completedDate, setCompletedDate] = useState(workCompletedDate ?? todayIso());
  const [signing, setSigning] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<"hold" | "complete" | "undo" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const signaturePadRef = useRef<SignaturePadHandle>(null);
  const [undoArmed, setUndoArmed] = useState(false);

  const onHold = status === "on_hold";

  function toggleHold() {
    setError(null);
    setBusyAction("hold");
    startTransition(async () => {
      try {
        await setOnHold({ invoiceId, onHold: !onHold, note });
        setNote("");
        router.refresh();
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
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setBusyAction(null);
      }
    });
  }

  function undo() {
    setError(null);
    setBusyAction("undo");
    startTransition(async () => {
      try {
        await undoWorkCompleted(invoiceId);
        setUndoArmed(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setUndoArmed(false);
      } finally {
        setBusyAction(null);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-sm font-medium text-gray-700">
          Status: {onHold ? "On Hold" : "Unpaid"}
        </h2>
        {workCompleted && (
          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            Work Completed
          </span>
        )}
      </div>

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
          {workCompletedSignature && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                Signed off{workCompletedDate ? ` · ${workCompletedDate}` : ""}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={workCompletedSignature}
                alt="Work-completed signature"
                className="h-8 border border-gray-200 rounded bg-white"
              />
            </div>
          )}

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

          {workCompleted && (
            <div className="flex justify-end">
              {undoArmed ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Undo sign-off?</span>
                  <button
                    onClick={undo}
                    disabled={pending}
                    className="text-xs font-medium text-red-700 hover:text-red-900 disabled:opacity-50"
                  >
                    {busyAction === "undo" ? "Undoing..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => setUndoArmed(false)}
                    disabled={pending}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setUndoArmed(true)}
                  className="text-xs text-gray-400 hover:text-red-700 underline"
                >
                  Undo work completed
                </button>
              )}
            </div>
          )}

          {workCompleted && !onHold ? (
            <MarkPaidForm
              invoiceId={invoiceId}
              amountCents={amountCents}
              onSuccess={() => {
                router.push("/admin/invoices");
                router.refresh();
              }}
            />
          ) : workCompleted && onHold ? (
            <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
              On hold — take it off hold to enable payment.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
