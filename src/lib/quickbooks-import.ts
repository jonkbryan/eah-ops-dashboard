import { db } from "@/lib/db";
import type { QuickBooksPurchase } from "@/lib/quickbooks";

// Holds the most recent CSV upload (see /admin/reconcile). Replaced
// wholesale on every upload - not an incremental/append log.
export async function saveQuickBooksImport(
  uploadedById: string,
  purchases: QuickBooksPurchase[]
) {
  await db.quickBooksImport.deleteMany({});
  await db.quickBooksImport.create({
    data: {
      uploadedById,
      purchasesJson: JSON.stringify(purchases),
      rowCount: purchases.length,
    },
  });
}

export async function getLatestQuickBooksImport(): Promise<{
  purchases: QuickBooksPurchase[];
  rowCount: number;
  createdAt: Date;
} | null> {
  const record = await db.quickBooksImport.findFirst({ orderBy: { createdAt: "desc" } });
  if (!record) return null;
  return {
    purchases: JSON.parse(record.purchasesJson) as QuickBooksPurchase[],
    rowCount: record.rowCount,
    createdAt: record.createdAt,
  };
}
