"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { undoMarkPaid } from "@/lib/actions/invoice-actions";
import { formatCents } from "@/lib/domain";

export function UndoPaymentSection({
  invoiceId,
  amountCents,
  method,
  paidOn,
  reference,
  reconciled,
}: {
  invoiceId: string;
  amountCents: number;
  method: string;
  paidOn: string; // yyyy-mm-dd
  reference: string | null;
  reconciled: boolean;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function undo() {
    setError(null);
    startTransition(async () => {
      try {
        await undoMarkPaid(invoiceId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setArmed(false);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
          Paid
        </span>
        <span className="text-sm text-gray-700">
          {formatCents(amountCents)} via {method} on {paidOn}
        </span>
      </div>
      {reference && <p className="text-xs text-gray-500">Reference: {reference}</p>}

      <p className="text-sm text-gray-500">
        This invoice can&apos;t be edited while marked paid.
      </p>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {reconciled ? (
        <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
          This payment has already been reconciled against QuickBooks and can&apos;t be
          undone here.
        </p>
      ) : armed ? (
        <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-500">Undo this payment?</span>
          <button
            onClick={undo}
            disabled={pending}
            className="text-xs font-medium text-red-700 hover:text-red-900 disabled:opacity-50"
          >
            {pending ? "Undoing..." : "Confirm"}
          </button>
          <button
            onClick={() => setArmed(false)}
            disabled={pending}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setArmed(true)}
          className="text-xs text-gray-400 hover:text-red-700 underline"
        >
          Undo payment (mark as not paid)
        </button>
      )}
    </div>
  );
}
