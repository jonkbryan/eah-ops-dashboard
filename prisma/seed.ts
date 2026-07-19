// Generic seed runner. Contains no client-specific values itself — all of
// that lives in a config module under prisma/seed-data/ (currently EAH's).
// To seed a different client, change this one import.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import {
  costCodes,
  users,
  vendors,
  jobs,
  invoices,
  DEFAULT_PASSWORD,
} from "./seed-data/eah";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const EMAIL_DOMAIN = "anthonybryanconstruction.com";

async function main() {
  console.log("Seeding cost codes...");
  for (const cc of costCodes) {
    await db.costCode.upsert({
      where: { code: cc.code },
      update: { label: cc.label },
      create: cc,
    });
  }

  console.log("Seeding users...");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: {
        name: u.name,
        isSuperintendent: u.isSuperintendent,
        isAdmin: u.isAdmin,
      },
      create: {
        name: u.name,
        email: u.email.toLowerCase(),
        passwordHash,
        isSuperintendent: u.isSuperintendent,
        isAdmin: u.isAdmin,
      },
    });
  }

  console.log("Seeding vendors...");
  for (const name of vendors) {
    await db.vendor.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seeding jobs...");
  for (const j of jobs) {
    const superintendentEmail = `${j.superintendentFirstName}@${EMAIL_DOMAIN}`;
    const superintendent = await db.user.findUnique({
      where: { email: superintendentEmail },
    });
    if (!superintendent) {
      throw new Error(
        `Job "${j.name}" references unknown superintendent email ${superintendentEmail}`
      );
    }

    const existing = await db.job.findFirst({ where: { name: j.name } });
    if (existing) {
      await db.job.update({
        where: { id: existing.id },
        data: {
          superintendentId: superintendent.id,
          status: j.status,
        },
      });
    } else {
      await db.job.create({
        data: {
          name: j.name,
          superintendentId: superintendent.id,
          status: j.status,
        },
      });
    }
  }

  // Payments recorded against historically-paid invoices need a
  // recordedById. We don't actually know who reconciled each one (the real
  // sheet doesn't track that), so this attributes them to the first admin
  // account as the AP contact of record, purely to satisfy the schema.
  const apUser = await db.user.findFirst({ where: { isAdmin: true } });
  if (!apUser) {
    throw new Error("No admin user exists to attribute historical payments to");
  }

  console.log("Seeding invoices...");
  let created = 0;
  for (const inv of invoices) {
    const [job, costCode, vendor] = await Promise.all([
      db.job.findFirst({ where: { name: inv.job } }),
      db.costCode.findUnique({ where: { code: inv.costCode } }),
      db.vendor.findUnique({ where: { name: inv.vendor } }),
    ]);
    if (!job) {
      throw new Error(`Invoice references unknown job "${inv.job}"`);
    }
    if (!costCode) {
      throw new Error(`Invoice references unknown cost code "${inv.costCode}"`);
    }
    if (!vendor) {
      throw new Error(`Invoice references unknown vendor "${inv.vendor}"`);
    }

    const alreadyExists = await db.invoice.findFirst({
      where: {
        jobId: job.id,
        costCodeId: costCode.id,
        vendorId: vendor.id,
        amountCents: inv.amountCents,
      },
    });
    if (alreadyExists) {
      continue;
    }

    const createdInvoice = await db.invoice.create({
      data: {
        jobId: job.id,
        costCodeId: costCode.id,
        vendorId: vendor.id,
        amountCents: inv.amountCents,
        status: inv.status,
        note: inv.note,
        attachmentUrl: inv.invoiceLink,
        createdAt: new Date(`${inv.createdDate}T00:00:00`),
      },
    });
    created++;

    if (inv.status === "paid" && inv.paidDate) {
      await db.payment.create({
        data: {
          invoiceId: createdInvoice.id,
          amountCents: inv.paidAmountCents ?? inv.amountCents,
          method: "Check",
          paidAt: new Date(`${inv.paidDate}T00:00:00`),
          recordedById: apUser.id,
        },
      });
    }
  }
  console.log(`  ${created} new invoice(s) created (${invoices.length - created} already existed).`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
