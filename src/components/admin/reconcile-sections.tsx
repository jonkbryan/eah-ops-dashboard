"use client";

import { useState, useTransition } from "react";
import { confirmPaymentMatch } from "@/lib/actions/quickbooks-actions";
import { formatCents } from "@/lib/domain";
import type { UnmatchedPayment } from "@/lib/quickbooks-matching";
import type { QuickBooksPurchase } from "@/lib/quickbooks";

function PaymentSummary({ payment }: { payment: UnmatchedPayment }) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-gray-900 truncate">{payment.vendorName}</p>
      <p className="text-xs text-gray-500 truncate">
        {payment.jobName} · {payment.method} · paid {payment.paidAt.toLocaleDateString()}
      </p>
    </div>
  );
}

function PurchaseSummary({ purchase }: { purchase: QuickBooksPurchase }) {
  return (
    <div className="min-w-0 text-right">
      <p className="text-sm text-gray-900">{formatCents(purchase.totalAmountCents)}</p>
      <p className="text-xs text-gray-500 truncate">
        {purchase.vendorName ?? "Unknown vendor"} · {purchase.txnDate}
      </p>
    </div>
  );
}

export function AutoMatchedRow({
  payment,
  purchase,
}: {
  payment: UnmatchedPayment;
  purchase: QuickBooksPurchase;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        await confirmPaymentMatch({
          paymentId: payment.id,
          quickbooksTransactionId: purchase.id,
        });
        setConfirmed(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  if (confirmed) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <PaymentSummary payment={payment} />
      <div className="flex items-center gap-4 shrink-0">
        <PurchaseSummary purchase={purchase} />
        {error && <p className="text-xs text-red-700">{error}</p>}
        <button
          onClick={confirm}
          disabled={pending}
          className="rounded-lg bg-green-600 text-white font-medium px-3 py-2 text-sm active:bg-green-700 disabled:opacity-50"
        >
          {pending ? "..." : "Confirm"}
        </button>
      </div>
    </div>
  );
}

export function NeedsReviewRow({
  payment,
  candidates,
}: {
  payment: UnmatchedPayment;
  candidates: QuickBooksPurchase[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!selectedId) {
      setError("Pick which transaction this matches.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await confirmPaymentMatch({
          paymentId: payment.id,
          quickbooksTransactionId: selectedId,
        });
        setConfirmed(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  if (confirmed) return null;

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <PaymentSummary payment={payment} />
        <p className="text-sm text-gray-900 shrink-0">{formatCents(payment.amountCents)}</p>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Which QuickBooks transaction?</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.vendorName ?? "Unknown"} · {formatCents(c.totalAmountCents)} · {c.txnDate}
            </option>
          ))}
        </select>
        <button
          onClick={confirm}
          disabled={pending}
          className="shrink-0 rounded-lg bg-green-600 text-white font-medium px-3 py-2 text-sm active:bg-green-700 disabled:opacity-50"
        >
          {pending ? "..." : "Confirm"}
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
