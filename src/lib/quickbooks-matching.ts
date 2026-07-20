import { db } from "@/lib/db";
import type { QuickBooksPurchase } from "@/lib/quickbooks";

export type UnmatchedPayment = {
  id: string;
  amountCents: number;
  paidAt: Date;
  method: string;
  vendorName: string;
  jobName: string;
  invoiceId: string;
};

export type ReconciliationReport = {
  autoMatched: { payment: UnmatchedPayment; purchase: QuickBooksPurchase }[];
  needsReview: { payment: UnmatchedPayment; candidates: QuickBooksPurchase[] }[];
  unmatchedPayments: UnmatchedPayment[];
  unmatchedPurchases: QuickBooksPurchase[];
};

function normalize(name: string) {
  return name.trim().toLowerCase();
}

const DATE_PROXIMITY_DAYS = 14;

// QuickBooks transaction dates come as either "MM/DD/YYYY" (CSV export) or
// "YYYY-MM-DD" (live API). Returns null for anything unparseable rather
// than guessing.
function parseTxnDate(txnDate: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}/.test(txnDate)) {
    const d = new Date(txnDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const usMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(txnDate.trim());
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return null;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

// Matches recorded Payments (created via the existing Mark Paid / Payment
// Batch flow) against real QuickBooks Purchase transactions, so an admin can
// confirm the bank/QB side actually happened. Unlike the Make.com scenarios
// this mirrors: every non-match is surfaced here, nothing is silently
// dropped, and confirming a match writes exactly one field
// (Payment.quickbooksTransactionId) as the single source of "already
// reconciled" truth.
//
// Real QuickBooks exports showed vendor names routinely drift from the
// app's Vendor list (e.g. QuickBooks "US LBM" for the app's "Texas
// Building Supply", "Southern Floors" for "Southern Floors of Texas LLC").
// Rather than hardcoding an alias table (the exact fragility found in the
// old Make.com scenarios), an exact vendor+amount match auto-confirms, but
// when that fails, an amount-only match within a two-week window is
// surfaced as a Needs Review candidate — never auto-matched, always a
// human decision.
export async function buildReconciliationReport(
  purchases: QuickBooksPurchase[]
): Promise<ReconciliationReport> {
  const [payments, vendors] = await Promise.all([
    db.payment.findMany({
      where: { quickbooksTransactionId: null },
      include: { invoice: { include: { vendor: true, job: true } } },
      orderBy: { paidAt: "asc" },
    }),
    db.vendor.findMany(),
  ]);

  const unmatchedPayments: UnmatchedPayment[] = payments.map((p) => ({
    id: p.id,
    amountCents: p.amountCents,
    paidAt: p.paidAt,
    method: p.method,
    vendorName: p.invoice.vendor.name,
    jobName: p.invoice.job.name,
    invoiceId: p.invoiceId,
  }));

  const claimedPurchaseIds = new Set<string>();
  const candidatePurchaseIds = new Set<string>();
  const autoMatched: ReconciliationReport["autoMatched"] = [];
  const needsReview: ReconciliationReport["needsReview"] = [];
  const stillUnmatchedPayments: UnmatchedPayment[] = [];

  for (const payment of unmatchedPayments) {
    const vendorAndAmountCandidates = purchases.filter(
      (purchase) =>
        !claimedPurchaseIds.has(purchase.id) &&
        purchase.totalAmountCents === payment.amountCents &&
        normalize(purchase.vendorName ?? "") === normalize(payment.vendorName)
    );

    if (vendorAndAmountCandidates.length === 1) {
      claimedPurchaseIds.add(vendorAndAmountCandidates[0].id);
      autoMatched.push({ payment, purchase: vendorAndAmountCandidates[0] });
      continue;
    }
    if (vendorAndAmountCandidates.length > 1) {
      vendorAndAmountCandidates.forEach((c) => candidatePurchaseIds.add(c.id));
      needsReview.push({ payment, candidates: vendorAndAmountCandidates });
      continue;
    }

    const amountOnlyCandidates = purchases.filter((purchase) => {
      if (claimedPurchaseIds.has(purchase.id)) return false;
      if (purchase.totalAmountCents !== payment.amountCents) return false;
      const txnDate = parseTxnDate(purchase.txnDate);
      if (!txnDate) return true;
      return daysBetween(txnDate, payment.paidAt) <= DATE_PROXIMITY_DAYS;
    });

    if (amountOnlyCandidates.length > 0) {
      amountOnlyCandidates.forEach((c) => candidatePurchaseIds.add(c.id));
      needsReview.push({ payment, candidates: amountOnlyCandidates });
    } else {
      stillUnmatchedPayments.push(payment);
    }
  }

  const knownVendorNames = new Set(vendors.map((v) => normalize(v.name)));
  const unmatchedPurchases = purchases.filter(
    (purchase) =>
      !claimedPurchaseIds.has(purchase.id) &&
      !candidatePurchaseIds.has(purchase.id) &&
      purchase.vendorName &&
      knownVendorNames.has(normalize(purchase.vendorName))
  );

  return {
    autoMatched,
    needsReview,
    unmatchedPayments: stillUnmatchedPayments,
    unmatchedPurchases,
  };
}
