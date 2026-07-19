// Shared invoice-creation logic used by both the session-authenticated
// createInvoice server action (src/lib/actions/invoice-actions.ts) and the
// API-key-authenticated ingest endpoint (src/app/api/invoices/ingest). Auth
// and job/cost-code/vendor resolution are each caller's responsibility —
// this only does the actual insert once all three are known.
import { db } from "@/lib/db";

export async function insertInvoice(input: {
  jobId: string;
  costCodeId: string;
  vendorId: string;
  amountCents: number;
  note?: string | null;
  attachmentUrl?: string | null;
}) {
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  return db.invoice.create({
    data: {
      jobId: input.jobId,
      costCodeId: input.costCodeId,
      vendorId: input.vendorId,
      amountCents: input.amountCents,
      note: input.note?.trim() || null,
      attachmentUrl: input.attachmentUrl?.trim() || null,
    },
  });
}
