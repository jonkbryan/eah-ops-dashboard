"use client";

import { useState, useTransition } from "react";
import {
  markInvoicesPaidBatch,
  undoWorkCompleted,
  setScheduledPaymentDate,
} from "@/lib/actions/invoice-actions";
import { formatCents, PAYMENT_METHODS, todayIso } from "@/lib/domain";
import { getUpcomingFridays, formatFriday } from "@/lib/payment-schedule";
import { MarkPaidForm } from "@/components/admin/mark-paid-form";

type ReadyInvoice = {
  id: string;
  vendorName: string;
  amountCents: number;
  costCodeLabel: string;
  jobName: string;
  decisionNote: string | null;
  attachmentUrl: string | null;
  workCompletedSignature: string | null;
  scheduledPaymentDate: Date | null;
};

function ScheduleDropdown({
  invoiceId,
  scheduledPaymentDate,
}: {
  invoiceId: string;
  scheduledPaymentDate: Date | null;
}) {
  const fridays = getUpcomingFridays(10);
  const currentValue = scheduledPaymentDate
    ? scheduledPaymentDate.toISOString().slice(0, 10)
    : "";
  const [value, setValue] = useState(currentValue);
  const [pending, startTransition] = useTransition();

  function handleChange(next: string) {
    setValue(next);
    startTransition(async () => {
      try {
        await setScheduledPaymentDate({
          invoiceId,
          scheduledPaymentDate: next || null,
        });
      } catch {
        setValue(currentValue);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 shrink-0">Scheduled for</label>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={pending}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="">Not scheduled</option>
        {fridays.map((f) => (
          <option key={f} value={f}>
            {formatFriday(f)}
          </option>
        ))}
      </select>
    </div>
  );
}

// Admin-only reversal of a signed work-completion sign-off, back to not
// completed. Requires a second click to confirm since it discards a
// captured signature — not something to fire off a single misclick.
function UndoWorkCompletedButton({ invoiceId }: { invoiceId: string }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await undoWorkCompleted(invoiceId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setArmed(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {armed ? (
        <>
          <span className="text-xs text-gray-500">Undo work-completed sign-off?</span>
          <button
            onClick={submit}
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
        </>
      ) : (
        <button
          onClick={() => setArmed(true)}
          className="text-xs text-gray-400 hover:text-red-700 underline"
        >
          Undo work completed
        </button>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function PaymentBatchSection({ invoices }: { invoices: ReadyInvoice[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [paidOn, setPaidOn] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === invoices.length ? new Set() : new Set(invoices.map((i) => i.id))
    );
  }

  function submitBatch() {
    setError(null);
    startTransition(async () => {
      try {
        await markInvoicesPaidBatch({
          invoiceIds: Array.from(selected),
          method,
          paidOn,
        });
        setSelected(new Set());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const selectedTotal = invoices
    .filter((i) => selected.has(i.id))
    .reduce((sum, i) => sum + i.amountCents, 0);

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-6 text-center">
        No invoices ready to pay.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={selected.size === invoices.length}
            onChange={toggleAll}
            className="h-5 w-5"
          />
          {selected.size > 0
            ? `${selected.size} selected — ${formatCents(selectedTotal)}`
            : "Select all"}
        </label>

        {selected.size > 0 && (
          <div className="space-y-3 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 gap-2">
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
              onClick={submitBatch}
              disabled={pending}
              className="w-full rounded-lg bg-blue-600 text-white font-medium py-3 text-sm active:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Recording..." : `Mark ${selected.size} as Paid`}
            </button>
          </div>
        )}
      </div>

      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-1"
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected.has(invoice.id)}
              onChange={() => toggle(invoice.id)}
              className="h-5 w-5 mt-1 shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {invoice.vendorName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {invoice.costCodeLabel} · {invoice.jobName}
                  </p>
                </div>
                <p className="text-lg font-semibold text-gray-900 shrink-0">
                  {formatCents(invoice.amountCents)}
                </p>
              </div>
              {invoice.decisionNote && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  {invoice.decisionNote}
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                {invoice.attachmentUrl ? (
                  <a
                    href={invoice.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    View invoice
                  </a>
                ) : (
                  <span />
                )}
                {invoice.workCompletedSignature && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Work completed — signed off</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={invoice.workCompletedSignature}
                      alt="Work-completed signature"
                      className="h-8 border border-gray-200 rounded bg-white"
                    />
                  </div>
                )}
              </div>
              <ScheduleDropdown
                invoiceId={invoice.id}
                scheduledPaymentDate={invoice.scheduledPaymentDate}
              />
              <MarkPaidForm invoiceId={invoice.id} amountCents={invoice.amountCents} />
              <div className="flex justify-end">
                <UndoWorkCompletedButton invoiceId={invoice.id} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
