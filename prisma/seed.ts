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
  jobs,
  sampleInvoices,
  DEFAULT_PASSWORD,
} from "./seed-data/eah";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

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

  console.log("Seeding jobs...");
  for (const j of jobs) {
    const superintendent = await db.user.findUnique({
      where: { email: j.superintendentEmail.toLowerCase() },
    });
    if (!superintendent) {
      throw new Error(
        `Job "${j.name}" references unknown superintendent email ${j.superintendentEmail}`
      );
    }

    const existing = await db.job.findFirst({ where: { name: j.name } });
    if (existing) {
      await db.job.update({
        where: { id: existing.id },
        data: {
          superintendentId: superintendent.id,
          budgetCents: j.budgetCents,
        },
      });
    } else {
      await db.job.create({
        data: {
          name: j.name,
          superintendentId: superintendent.id,
          budgetCents: j.budgetCents,
        },
      });
    }
  }

  console.log("Seeding sample invoices...");
  for (const inv of sampleInvoices) {
    const job = await db.job.findFirst({ where: { name: inv.jobName } });
    if (!job) {
      throw new Error(`Invoice references unknown job "${inv.jobName}"`);
    }
    const costCode = await db.costCode.findUnique({
      where: { code: inv.costCode },
    });
    if (!costCode) {
      throw new Error(`Invoice references unknown cost code "${inv.costCode}"`);
    }

    const alreadyExists = await db.invoice.findFirst({
      where: {
        jobId: job.id,
        costCodeId: costCode.id,
        vendorName: inv.vendorName,
        amountCents: inv.amountCents,
      },
    });
    if (!alreadyExists) {
      await db.invoice.create({
        data: {
          jobId: job.id,
          costCodeId: costCode.id,
          vendorName: inv.vendorName,
          amountCents: inv.amountCents,
          note: inv.note,
        },
      });
    }
  }

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
