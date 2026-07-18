"use client";

import { useState, useTransition } from "react";
import { markInvoicePaid } from "@/lib/actions/invoice-actions";
import { dollarsToCents, PAYMENT_METHODS, todayIso } from "@/lib/domain";

export function MarkPaidForm({
  invoiceId,
  amountCents,
}: {
  invoiceId: string;
  amountCents: number;
}) {
  const [amount, setAmount] = useState((amountCents / 100).toFixed(2));
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [paidOn, setPaidOn] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const cents = dollarsToCents(parseFloat(amount));
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    startTransition(async () => {
      try {
        await markInvoicePaid({ invoiceId, amountCents: cents, method, paidOn });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Date</label>
          <input
            type="date"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 text-white font-medium py-2.5 text-sm active:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Recording..." : "Mark Paid"}
      </button>
    </div>
  );
}
