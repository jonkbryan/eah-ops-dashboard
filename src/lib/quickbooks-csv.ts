import type { QuickBooksPurchase } from "@/lib/quickbooks";

// Only these QuickBooks transaction types represent an actual outgoing
// vendor payment (matches what the live API path pulls via
// `select * from purchase`, which covers Check/CreditCardCharge/
// CashExpense). Everything else (Invoice, Payment, Deposit, Bill, Journal
// Entry, etc.) is excluded rather than guessed at.
const RELEVANT_TYPES = new Set(["check", "expense", "credit card charge", "cash expense"]);

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "transaction date", "txn date"],
  type: ["transaction type", "type"],
  num: ["num", "number", "doc num", "ref no.", "ref no", "no."],
  name: ["name", "payee", "vendor"],
  amount: ["amount", "total"],
  customer: ["customer", "customer/job", "job"],
};

class CsvFormatError extends Error {}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function parseAmountToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const isParenNegative = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[()$,]/g, "");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(Math.abs(value) * 100);
  return isParenNegative ? -cents : cents;
}

function resolveColumns(headerRow: string[]): Record<keyof typeof HEADER_ALIASES, number> {
  const normalizedHeaders = headerRow.map((h) => h.trim().toLowerCase());
  const columns = {} as Record<keyof typeof HEADER_ALIASES, number>;

  for (const key of Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]) {
    const aliases = HEADER_ALIASES[key];
    const index = normalizedHeaders.findIndex((h) => aliases.includes(h));
    columns[key] = index;
  }

  const required: (keyof typeof HEADER_ALIASES)[] = ["date", "name", "amount"];
  const missing = required.filter((key) => columns[key] === -1);
  if (missing.length > 0) {
    throw new CsvFormatError(
      `Couldn't find a column for: ${missing.join(", ")}. Found columns: ${headerRow.join(", ")}`
    );
  }

  return columns;
}

// Parses a QuickBooks "Transaction List" report CSV export into the same
// shape the live API path produces, so both sources share one matching
// implementation (see quickbooks-matching.ts). Tolerant of common column
// name variants; throws a clear, specific error (listing what it actually
// found) rather than silently misreading the file.
export function parseQuickBooksTransactionCsv(csvText: string): QuickBooksPurchase[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new CsvFormatError("The file appears to be empty or has no data rows.");
  }

  const [headerRow, ...dataRows] = rows;
  const columns = resolveColumns(headerRow);

  const purchases: QuickBooksPurchase[] = [];
  dataRows.forEach((row, index) => {
    const type = columns.type !== -1 ? (row[columns.type] ?? "").trim().toLowerCase() : "";
    if (columns.type !== -1 && !RELEVANT_TYPES.has(type)) {
      return;
    }

    const dateRaw = (row[columns.date] ?? "").trim();
    const nameRaw = (row[columns.name] ?? "").trim();
    const amountCents = parseAmountToCents(row[columns.amount] ?? "");
    if (!dateRaw || !nameRaw || amountCents === null || amountCents <= 0) {
      return;
    }

    const num = columns.num !== -1 ? (row[columns.num] ?? "").trim() : "";
    const customer = columns.customer !== -1 ? (row[columns.customer] ?? "").trim() : "";

    purchases.push({
      id: `csv:${dateRaw}|${num || "no-ref"}|${amountCents}|${index}`,
      txnDate: dateRaw,
      totalAmountCents: amountCents,
      vendorName: nameRaw,
      jobNames: customer ? [customer] : [],
    });
  });

  if (purchases.length === 0) {
    throw new CsvFormatError(
      "No relevant transactions found. Expected transaction types Check/Expense/Credit Card Charge/Cash Expense."
    );
  }

  return purchases;
}
