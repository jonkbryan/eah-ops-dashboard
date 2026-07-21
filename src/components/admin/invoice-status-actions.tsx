"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideInvoice, revertApproval } from "@/lib/actions/invoice-actions";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";
import { MarkPaidForm } from "@/components/admin/mark-paid-form";

type Props = {
  invoiceId: string;
  status: string;
  amountCents: number;
};

// Lets an admin move an invoice through its full lifecycle right from the
// edit screen — same decideInvoice/revertApproval/markInvoicePaid actions
// (and same auth rules) used elsewhere, just surfaced in one place instead
// of requiring a trip back to the Overview or Ready-to-Pay queues.
export function InvoiceStatusActions({ invoiceId, status, amountCents }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [signing, setSigning] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<
    "approved" | "rejected" | "flagged" | "undo" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const signaturePadRef = useRef<SignaturePadHandle>(null);
  const [undoArmed, setUndoArmed] = useState(false);

  function decide(decision: "approved" | "rejected" | "flagged", signature?: string) {
    setError(null);
    setBusyAction(decision);
    startTransition(async () => {
      try {
        await decideInvoice({ invoiceId, decision, note, signature });
        setSigning(false);
        setNote("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setBusyAction(null);
      }
    });
  }

  function confirmApproval() {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError("Please sign to approve.");
      return;
    }
    decide("approved", signaturePadRef.current.toDataUrl());
  }

  function undoApproval() {
    setError(null);
    setBusyAction("undo");
    startTransition(async () => {
      try {
        await revertApproval(invoiceId);
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

  if (status === "approved") {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-medium text-gray-700">Status: Approved</h2>

        <MarkPaidForm
          invoiceId={invoiceId}
          amountCents={amountCents}
          onSuccess={() => {
            router.push("/admin/invoices");
            router.refresh();
          }}
        />

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end pt-1 border-t border-gray-100">
          {undoArmed ? (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-gray-500">Send back to Pending?</span>
              <button
                onClick={undoApproval}
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
              className="text-xs text-gray-400 hover:text-red-700 underline pt-2"
            >
              Undo approval
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
      <h2 className="text-sm font-medium text-gray-700 capitalize">Status: {status}</h2>

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
            onClick={() => decide("rejected")}
            disabled={pending}
            className="rounded-lg bg-red-50 text-red-700 font-medium py-3 text-sm active:bg-red-100 disabled:opacity-50"
          >
            {busyAction === "rejected" ? "..." : "Reject"}
          </button>
          <button
            onClick={() => decide("flagged")}
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
