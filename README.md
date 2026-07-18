# EAH Ops Dashboard (v1)

Internal invoice approval & payment tracking. Replaces two AppSheet tools plus
a Google Sheets + Make.com workflow.

**Core flow (this is all v1 does):**
1. An invoice is logged against a job and cost code (currently via seed data /
   Prisma Studio — no "create invoice" screen yet, see Known Limitations).
2. It routes to the superintendent assigned to that job.
3. The superintendent approves, rejects, or flags it (with an optional note)
   from a mobile-friendly queue.
4. Approved invoices land in the admin payment queue.
5. An admin marks it paid, logging the payment date, method, and amount.
6. Admins can see and override any invoice at any stage, on any job.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **SQLite** via **Prisma 7** (local file database, no server to run)
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

Paste the output as the value of `AUTH_SECRET` in `.env`. Leave
`DATABASE_URL` as-is (`file:./dev.db`) unless you have a reason to change it.

Create the database and load EAH's starter data (users, cost codes, one
sample job/invoice):

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
(see `prisma/seed-data/eah.ts` → `DEFAULT_PASSWORD`). There is no
self-service password reset in v1 — to change a password, update it directly
in the database (e.g. via `npx prisma studio`, hashing the new value with
bcrypt) or re-run the seed after editing the config.

Seeded accounts:

| Name | Email | Role |
|---|---|---|
| Nick Allen | nick.allen@elijahanthonyhomes.com | Superintendent |
| David Marshall | david.marshall@elijahanthonyhomes.com | Superintendent |
| Dan Bromley | dan.bromley@elijahanthonyhomes.com | Superintendent |
| Jon Bryan | jonkbryan@yahoo.com | Admin |
| Allie Russell | allie.russell@elijahanthonyhomes.com | Admin |
| Haley Anthony | haley.anthony@elijahanthonyhomes.com | Admin |
| Eli Anthony | eli.anthony@elijahanthonyhomes.com | Superintendent + Admin |
| Phil Anthony | phil.anthony@elijahanthonyhomes.com | Superintendent + Admin |

Every email except Jon Bryan's is a placeholder (`@elijahanthonyhomes.com`) —
update `prisma/seed-data/eah.ts` with real addresses before handing this to
the team, then re-run `npm run db:seed` (it's safe to re-run; it upserts).

## Project structure

The system is built generically; **all EAH-specific data lives in one
place** so this can be reused for a future client without touching app code:

- `prisma/schema.prisma` — generic data model (User, Job, CostCode, Invoice,
  Payment). No client-specific values.
- `prisma/seed-data/eah.ts` — **EAH's actual data**: the 36 cost codes, the 8
  users and their roles, jobs, and a sample invoice. To onboard a different
  client, copy this file, edit the values, and point `prisma/seed.ts`'s
  import at the new file.
- `prisma/seed.ts` — generic seed runner, knows nothing about EAH.
- `src/lib/domain.ts` — generic constants/types (invoice statuses, money
  formatting). No client values.
- `src/app/superintendent/` — superintendent approval queue.
- `src/app/admin/` — admin payment queue + cross-job override view.
- `src/lib/actions/invoice-actions.ts` — server-side logic for
  approve/reject/flag and mark-paid, with role checks enforced on the
  server (not just hidden in the UI).

Money is stored as integer cents (`amountCents`, `budgetCents`) to avoid
floating-point rounding bugs on financial data.

## Known limitations (intentionally out of scope for v1)

- **No "create invoice" screen.** Invoices currently get into the system via
  the seed file or `npx prisma studio`. Building an intake form is the
  natural next step once this core loop is confirmed to work end to end.
- **No budget-vs-actual reporting or full dashboard.**
- **No QuickBooks integration.**
- **No password reset flow.**
- **No reopening a paid invoice.** Admins can override pending/flagged/
  rejected/approved invoices at any stage, but once an invoice is marked
  paid there's no UI to reverse it (avoids leaving an orphaned Payment
  record). If this comes up in practice, it's a small follow-up feature.

## Notes on the Prisma 7 / SQLite setup

This project uses Prisma 7's new TypeScript-based client generator, which
requires an explicit **driver adapter** rather than reading `DATABASE_URL`
implicitly — `src/lib/db.ts` and `prisma/seed.ts` both construct
`PrismaBetterSqlite3` from `@prisma/adapter-better-sqlite3` explicitly. If
you ever see an error like `PrismaClient needs to be constructed with a
non-empty, valid PrismaClientOptions`, it means somewhere is calling
`new PrismaClient()` without that adapter.

Auth session checks happen in each server component/action (`auth()` +
`redirect()`), not in Next.js middleware — Prisma's SQLite driver can't run
in Next's Edge Runtime, which is where middleware executes.
