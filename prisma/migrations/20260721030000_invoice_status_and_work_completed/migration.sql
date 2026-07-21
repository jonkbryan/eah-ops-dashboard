-- Collapse the old 5-state invoice status (pending/approved/rejected/
-- flagged/paid) into 3 states (unpaid/on_hold/paid), plus a new,
-- orthogonal workCompleted sign-off: a superintendent (or admin) confirms
-- + signs that the work itself is done, independent of whether the
-- invoice document has any issue that needs a hold.

ALTER TABLE "Invoice" RENAME COLUMN "approvalSignature" TO "workCompletedSignature";
ALTER TABLE "Invoice" ADD COLUMN "workCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invoice" ADD COLUMN "workCompletedDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "workCompletedById" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "workCompletedAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workCompletedById_fkey" FOREIGN KEY ("workCompletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill existing data: an "approved" or "paid" invoice already went
-- through a signed sign-off, which under the old flow *was* the
-- work-completion confirmation — carry it forward instead of losing it.
UPDATE "Invoice"
SET "workCompleted" = true,
    "workCompletedById" = "decidedById",
    "workCompletedAt" = "decidedAt",
    "workCompletedDate" = "decidedAt"
WHERE "status" IN ('approved', 'paid');

-- Flagged/rejected both meant "something needs attention before this gets
-- paid" — both collapse into the new On Hold state. decisionNote/
-- decidedById/decidedAt are left as-is (reinterpreted as the hold's
-- reason/actor/time rather than cleared).
UPDATE "Invoice" SET "status" = 'on_hold' WHERE "status" IN ('flagged', 'rejected');

-- Pending (never decided) and approved (decided, now captured as
-- workCompleted above) both become the new default "unpaid" — only
-- actually-paid invoices keep a distinct status.
UPDATE "Invoice" SET "status" = 'unpaid' WHERE "status" IN ('pending', 'approved');

ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'unpaid';
