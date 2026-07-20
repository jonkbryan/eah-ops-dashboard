# EAH Ops Dashboard (v1)

Internal invoice approval & payment tracking. Replaces two AppSheet tools plus
a Google Sheets + Make.com workflow.

**Core flow (this is all v1 does):**
1. An admin logs an invoice against a job, cost code, and vendor
   (`/admin/invoices/new`).
2. It routes to the superintendent assigned to that job.
3. The superintendent approves (with a signature), rejects, or flags it
   (with an optional note) from a mobile-friendly queue.
4. Approved invoices land in the admin payment queue, where an admin can
   mark which upcoming Friday it's scheduled to be paid.
5. An admin marks it paid, logging the payment date, method, and amount.
6. Admins can see and override any invoice at any stage, on any job.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **Postgres** via **Prisma 7** (hosted, e.g. Vercel Postgres/Neon)
- **Auth.js (NextAuth v5)** with email/password (Credentials provider) —
  accounts are pre-created via the seed script, there is no public sign-up

## Prerequisites

- Node.js 20+ and npm

## First-time setup

```bash
npm install
cp .env.example .env
```

Open `.env` and generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste the output as the value of `AUTH_SECRET` in `.env`. Set `DATABASE_URL`
to a real Postgres connection string (e.g. from Vercel Postgres/Neon) — there
is no local file-database fallback.

Create the database and load EAH's real data (users, cost codes, all 35
jobs, all 19 vendors, and the full historical invoice log pulled from the
"EAH Master Invoice" Google Sheet):

```bash
npx prisma migrate dev
npm run db:seed
```

Run the app:

```bash
npm run dev
```

Visit http://localhost:3000.

## Logging in

Every seeded account starts with the password **`ChangeMe123!`**
(see `prisma/seed-data/eah.ts` → `DEFAULT_PASSWORD`). Each person should
sign in and change it from **My Account** (click your name in the top nav,
or go to `/account`) — this requires knowing the current password, so it's
not a substitute for a "forgot password" flow. There is still no
self-service *reset* for someone who's locked out; that requires updating
the database directly (e.g. via `npx prisma studio`, hashing the new value
with bcrypt) or re-running the seed after editing the config.

Seeded accounts (real emails, verified against the team's actual
AppSheet/Google Sheet setup — see note in `prisma/seed-data/eah.ts`):

| Name | Email | Role |
|---|---|---|
| Nick Allen | nick@anthonybryanconstruction.com | Superintendent |
| David Marshall | david@anthonybryanconstruction.com | Superintendent |
| Dan Bromley | dan@anthonybryanconstruction.com | Superintendent |
| Jon Bryan | jon@anthonybryanconstruction.com | Admin |
| Allie Russell | allie@anthonybryanconstruction.com | Admin |
| Haley Anthony | haley@anthonybryanconstruction.com | Admin |
| Eli Anthony | elijah@anthonybryanconstruction.com | Superintendent + Admin |
| Phil Anthony | phil@anthonybryanconstruction.com | Superintendent + Admin |

Note the domain is `anthonybryanconstruction.com`, not
`elijahanthonyhomes.com` — that surprised us too; see the comment at the top
of `prisma/seed-data/eah.ts` for why. **Jon logs in with
`jon@anthonybryanconstruction.com`, not his personal email.**

## Project structure

The system is built generically; **all EAH-specific data lives in one
place** so this can be reused for a future client without touching app code:

- `prisma/schema.prisma` — generic data model (User, Job, Vendor, CostCode,
  Invoice, Payment). No client-specific values.
- `prisma/seed-data/eah.ts` — **EAH's actual data**: the 36 cost codes, the 8
  users and their roles, all 35 real jobs, all 19 real vendors, and the full
  historical invoice log (95 real invoices, extracted from the "EAH Master
  Invoice" Google Sheet — see the header comment in that file for exclusions
  and vendor-name normalization notes). To onboard a different client, copy
  this file, edit the values, and point `prisma/seed.ts`'s import at the new
  file.
- `prisma/seed.ts` — generic seed runner, knows nothing about EAH.
- `src/lib/domain.ts` — generic constants/types (invoice statuses, money
  formatting). No client values.
- `src/app/superintendent/` — superintendent approval queue.
- `src/app/admin/` — admin payment queue + cross-job override view. The
  "Ready to Pay" section (`src/components/admin/payment-batch-section.tsx`)
  supports selecting several approved invoices and marking them all paid
  together with one method/date — the weekly Thursday-batch case — while
  still allowing a one-off custom amount per invoice via the existing
  per-invoice form. Each ready-to-pay invoice also has a "which Friday"
  dropdown (`ScheduleDropdown`, backed by `Invoice.scheduledPaymentDate`) —
  EAH pays every Thursday but funds land/process Friday morning, so that's
  how the team actually talks about a payment batch.
- `src/app/admin/vendors/` — vendor list, create, and edit (admin-only).
  Vendor is a first-class entity (`Vendor.name` unique), not a free-text
  field on Invoice — invoice intake uses a vendor dropdown, matching how
  Job and CostCode already worked, instead of relying on consistent manual
  spelling (the real sheet had several vendor-name variants for the same
  vendor before this).
- `src/app/admin/invoices/` — the full invoice list (admin-only), every
  status, searchable by vendor/job name and filterable by status, no row
  cap (unlike the 20-row "History" section on the Overview tab).
- `src/app/admin/invoices/new/` — invoice intake form (admin-only; see below).
- `src/app/admin/jobs/` — job list, create, and edit (admin-only). Editing a
  job's superintendent immediately re-routes any of its pending/flagged
  invoices to the newly assigned superintendent's queue.
- `src/app/admin/users/` — user list, create, and edit roles (admin-only).
  Editing also exposes an admin-triggered password reset, for someone
  locked out of their own account.
- `src/lib/actions/invoice-actions.ts` — server-side logic for
  create/approve/reject/flag and mark-paid, with role checks enforced on
  the server (not just hidden in the UI).
- `src/lib/actions/job-actions.ts` — server-side logic for creating and
  updating jobs (admin-only).
- `src/lib/actions/user-actions.ts` — server-side logic for creating users,
  updating roles, admin password reset, and self-service password change.

Money is stored as integer cents (`amountCents`, `budgetCents`) to avoid
floating-point rounding bugs on financial data.

**Invoice intake is admin-only.** Logging an invoice (`/admin/invoices/new`)
is restricted to admins, matching how invoices actually arrive today — the
office/admin side data-enters vendor invoices as they come in, then it
routes to the superintendent for a decision. Superintendents never create
invoices, only decide on ones already logged. If EAH wants superintendents
to be able to log invoices from the field too, that's a small follow-up
(loosen the `isAdmin` check in `createInvoice`, and possibly scope the job
dropdown to their assigned job).

**Invoice attachments are a link, not a file upload.** EAH already has an
active Make.com pipeline that ingests invoice emails, extracts the PDF, and
uploads it to a Google Shared Drive folder ("Elijah Anthony Homes →
Accounts Payable"). Rather than build a second, competing place to store
files, invoices here just carry an optional `attachmentUrl` — an admin
pastes the Drive link when logging the invoice, and it shows as a "View
invoice" link everywhere the invoice appears. If the dashboard later
replaces or integrates with that Make.com pipeline, this field is exactly
where the automation would write the link directly instead of a human
pasting it.

**Approving an invoice requires a signature.** Clicking Approve on
`InvoiceDecisionCard` opens a canvas-based signature pad
(`src/components/signature-pad.tsx`, plain HTML5 canvas, no external
library) instead of submitting immediately — the drawn signature is
captured as a PNG data URL and stored on `Invoice.approvalSignature`. This
only applies to Approve; Reject and Flag still submit immediately with no
signature required, since they don't authorize spending. Admins can see
the captured signature on the "Ready to Pay" cards in `/admin`.

## External invoice intake: `POST /api/invoices/ingest`

A machine-to-machine endpoint so an external system (e.g. a Make.com
scenario) can create an invoice directly, without a user session. This is
meant to eventually sit alongside — not replace — the existing Make.com →
Google Sheets pipeline as a dual-write during a transition period; see the
comment block at the top of `src/app/api/invoices/ingest/route.ts` for the
exact request/response contract.

**Auth:** header `x-api-key: <INVOICE_INGEST_API_KEY>` (set in `.env`,
generate one with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`).

**Try it yourself** (swap in your own key and real job/cost-code values —
`job` must exactly match an existing Job name, `costCode` must exactly
match an existing CostCode code; both 400 with a clear message if not):

```bash
curl -X POST http://localhost:3000/api/invoices/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY_HERE" \
  -d '{
    "vendor": "Texas Building Supply",
    "amount": 3200.00,
    "job": "Melody Gates",
    "costCode": "0600",
    "note": "optional",
    "attachmentUrl": "optional, e.g. a Google Drive link"
  }'
```

Success: `201` with `{"id": "...", "status": "pending"}` — the invoice
immediately appears in the assigned superintendent's queue, same as one
entered by hand. Failure: `400`/`401` with `{"error": "..."}` describing
exactly what was wrong (bad key, missing field, unmatched job/cost code).

It does **not** create jobs or cost codes on the fly — an unmatched name
fails loudly rather than silently creating bad data, so a typo (or a new
job EAH hasn't added yet) surfaces immediately instead of getting buried.

## QuickBooks reconciliation: `/admin/reconcile`

Matches recorded `Payment`s against real QuickBooks **Purchase** transactions
(checks/card charges/cash expenses — EAH pays vendors this way, not via
Bills). This is a deliberate rebuild of two real, currently-live Make.com
scenarios (`EAH - QuickBooks to Invoice Log Sync`, `EAH QB Payment Matcher`)
that were found to be genuinely fragile: they raced each other on the same
sheet rows using two different, unsynchronized status columns, used a
hardcoded ~28-job alias table that silently dropped unmapped jobs, and had
zero visibility into non-matches. This feature fixes all three:

- **Single source of truth for "already reconciled"**: one field,
  `Payment.quickbooksTransactionId`, set only when an admin confirms a
  match. No race between competing writers.
- **Nothing is silently dropped.** Every payment and every relevant
  QuickBooks transaction shows up in one of four buckets: Auto-Matched
  (single unambiguous candidate — one click to confirm), Needs Review
  (multiple candidates — admin picks), Unmatched Payments (recorded paid in
  the app, no matching QB transaction found), and Unmatched QuickBooks
  Transactions (a known vendor's transaction with no corresponding payment
  — e.g. paid outside this workflow, or an invoice never logged).
- **Read-only against QuickBooks.** This never writes anything back to the
  company's books.

**Data source: CSV upload today, live API later.** `/admin/reconcile` takes
a CSV export of QuickBooks' *Transaction List* report (Reports → Transaction
List). `src/lib/quickbooks-csv.ts` parses it — tolerant of common column
name variants (`Date`/`Transaction Date`, `Name`/`Payee`/`Vendor`,
`Amount`/`Total`, etc.), filters to Check/Expense/Credit Card Charge/Cash
Expense rows, and fails with a specific, diagnosable error (not a guess) if
it can't find a required column. Each upload replaces the previous one
wholesale (`QuickBooksImport`, single-row table) — matching logic
(`src/lib/quickbooks-matching.ts`) works from whichever purchase list it's
given, so the CSV and live paths share one implementation.

**Live OAuth is built but not the primary path yet.** The full OAuth2
flow — `QuickBooksConnection` model, token refresh, `/api/quickbooks/
connect` + `/callback`, `fetchRecentPurchases` in `src/lib/quickbooks.ts` —
is in place and was verified against Intuit's real authorize endpoint (a
registered Intuit Developer app accepted the Client ID and redirected to
QuickBooks' real sign-in page). It's parked for now in favor of the simpler
CSV flow; swap `buildReconciliationReport`'s input back to
`fetchRecentPurchases(...)` in `/admin/reconcile/page.tsx` to switch back.
Needs Production keys (Development/Sandbox keys only connect to a fake test
company) — register at developer.intuit.com, set `QUICKBOOKS_CLIENT_ID`/
`QUICKBOOKS_CLIENT_SECRET`/`QUICKBOOKS_ENVIRONMENT` in `.env`.

## Known limitations (intentionally out of scope for v1)

- **No budget-vs-actual reporting or full dashboard.**
- **No self-service "forgot password" link on the login page itself** — a
  locked-out user has to ask an admin to reset their password from
  `/admin/users/[id]/edit` (see Logging In above). There's no automated
  email-based recovery flow, which would need email infrastructure.
- **No deleting a user, job, or cost code.** Editing covers the realistic
  cases (reassign a job, change someone's roles); deleting is riskier since
  Invoice/Payment records reference these by ID, and wasn't necessary for
  v1. If someone truly leaves, editing their roles off is the interim
  approach.
- **No reopening a paid invoice.** Admins can override pending/flagged/
  rejected/approved invoices at any stage, but once an invoice is marked
  paid there's no UI to reverse it (avoids leaving an orphaned Payment
  record). If this comes up in practice, it's a small follow-up feature.

## Notes on the Prisma 7 / Postgres setup

This project uses Prisma 7's new TypeScript-based client generator, which
requires an explicit **driver adapter** rather than reading `DATABASE_URL`
implicitly — `src/lib/db.ts` and `prisma/seed.ts` both construct `PrismaPg`
from `@prisma/adapter-pg` explicitly. If you ever see an error like
`PrismaClient needs to be constructed with a non-empty, valid
PrismaClientOptions`, it means somewhere is calling `new PrismaClient()`
without that adapter.

Auth session checks happen in each server component/action (`auth()` +
`redirect()`), not in Next.js middleware — the `pg` driver can't run in
Next's Edge Runtime, which is where middleware executes.

**Was SQLite, migrated to Postgres for deployment.** The app ran on local
SQLite (`better-sqlite3`) through most of development; it was switched to
Postgres (`@prisma/adapter-pg`) specifically to deploy to Vercel, since
serverless functions can't rely on a local file for persistent storage.
`prisma/migrations/` was reset to a single fresh baseline at that point —
the SQLite-era migration SQL isn't valid Postgres syntax, so there was no
reason to carry it forward for a database with no existing production data
to preserve.
