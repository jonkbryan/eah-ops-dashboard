// Generic domain constants/types. No client-specific values belong here —
// see prisma/seed.ts for EAH's actual jobs, cost codes, and users.

export const INVOICE_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "flagged",
  "paid",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const JOB_STATUSES = ["active", "on_hold", "complete"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const PAYMENT_METHODS = ["Check", "ACH", "Card", "Wire", "Other"] as const;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
