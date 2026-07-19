import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { insertInvoice } from "@/lib/invoice-core";
import { dollarsToCents } from "@/lib/domain";

// Machine-to-machine invoice intake (e.g. from a Make.com scenario). Auth is
// a shared API key, not a user session — see INVOICE_INGEST_API_KEY.
//
// Request: POST, JSON body, header `x-api-key: <INVOICE_INGEST_API_KEY>`
//   {
//     "vendor": "Texas Building Supply", // must exactly match an existing Vendor name
//     "amount": 3200.00,           // dollars, not cents
//     "job": "Melody Gates",       // must exactly match an existing Job name
//     "costCode": "0600",          // must exactly match an existing CostCode code
//     "note": "optional",
//     "attachmentUrl": "optional, e.g. a Google Drive link"
//   }
//
// Response: 201 with { id, status } on success; 400/401 with { error } on
// failure. Job/cost code/vendor must already exist — this does not create
// them, so a typo or new job/vendor surfaces as a clear error rather than
// silently creating bad data.
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.INVOICE_INGEST_API_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      { error: "Server is not configured with INVOICE_INGEST_API_KEY" },
      { status: 500 }
    );
  }
  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const { vendor, amount, job, costCode, note, attachmentUrl } = body as Record<
    string,
    unknown
  >;

  if (typeof vendor !== "string" || !vendor.trim()) {
    return NextResponse.json({ error: '"vendor" is required' }, { status: 400 });
  }
  if (typeof job !== "string" || !job.trim()) {
    return NextResponse.json({ error: '"job" is required' }, { status: 400 });
  }
  if (typeof costCode !== "string" || !costCode.trim()) {
    return NextResponse.json({ error: '"costCode" is required' }, { status: 400 });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: '"amount" must be a positive number, in dollars' },
      { status: 400 }
    );
  }
  if (note !== undefined && typeof note !== "string") {
    return NextResponse.json({ error: '"note" must be a string if provided' }, { status: 400 });
  }
  if (attachmentUrl !== undefined && typeof attachmentUrl !== "string") {
    return NextResponse.json(
      { error: '"attachmentUrl" must be a string if provided' },
      { status: 400 }
    );
  }

  const [jobRecord, costCodeRecord, vendorRecord] = await Promise.all([
    db.job.findFirst({ where: { name: job.trim() } }),
    db.costCode.findUnique({ where: { code: costCode.trim() } }),
    db.vendor.findFirst({ where: { name: vendor.trim() } }),
  ]);

  if (!jobRecord) {
    return NextResponse.json(
      { error: `No job found named "${job.trim()}" — check it matches exactly` },
      { status: 400 }
    );
  }
  if (!costCodeRecord) {
    return NextResponse.json(
      { error: `No cost code found with code "${costCode.trim()}"` },
      { status: 400 }
    );
  }
  if (!vendorRecord) {
    return NextResponse.json(
      { error: `No vendor found named "${vendor.trim()}" — check it matches exactly` },
      { status: 400 }
    );
  }

  try {
    const invoice = await insertInvoice({
      jobId: jobRecord.id,
      costCodeId: costCodeRecord.id,
      vendorId: vendorRecord.id,
      amountCents: dollarsToCents(amount),
      note: note as string | undefined,
      attachmentUrl: attachmentUrl as string | undefined,
    });

    revalidatePath("/admin");
    revalidatePath("/superintendent");

    return NextResponse.json({ id: invoice.id, status: invoice.status }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong" },
      { status: 400 }
    );
  }
}
