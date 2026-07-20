import { db } from "@/lib/db";
import { fetchRecentPurchases, type QuickBooksPurchase } from "@/lib/quickbooks";

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

// Matches recorded Payments (created via the existing Mark Paid / Payment
// Batch flow) against real QuickBooks Purchase transactions, so an admin can
// confirm the bank/QB side actually happened. Unlike the Make.com scenarios
// this mirrors: every non-match is surfaced here, nothing is silently
// dropped, and confirming a match writes exactly one field
// (Payment.quickbooksTransactionId) as the single source of "already
// reconciled" truth.
export async function buildReconciliationReport(sinceDate: string): Promise<ReconciliationReport> {
  const [payments, purchases, vendors] = await Promise.all([
    db.payment.findMany({
      where: { quickbooksTransactionId: null },
      include: { invoice: { include: { vendor: true, job: true } } },
      orderBy: { paidAt: "asc" },
    }),
    fetchRecentPurchases(sinceDate),
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
  const autoMatched: ReconciliationReport["autoMatched"] = [];
  const needsReview: ReconciliationReport["needsReview"] = [];
  const stillUnmatchedPayments: UnmatchedPayment[] = [];

  for (const payment of unmatchedPayments) {
    const candidates = purchases.filter(
      (purchase) =>
        !claimedPurchaseIds.has(purchase.id) &&
        purchase.totalAmountCents === payment.amountCents &&
        normalize(purchase.vendorName ?? "") === normalize(payment.vendorName)
    );

    if (candidates.length === 1) {
      claimedPurchaseIds.add(candidates[0].id);
      autoMatched.push({ payment, purchase: candidates[0] });
    } else if (candidates.length > 1) {
      needsReview.push({ payment, candidates });
    } else {
      stillUnmatchedPayments.push(payment);
    }
  }

  const knownVendorNames = new Set(vendors.map((v) => normalize(v.name)));
  const unmatchedPurchases = purchases.filter(
    (purchase) =>
      !claimedPurchaseIds.has(purchase.id) &&
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
