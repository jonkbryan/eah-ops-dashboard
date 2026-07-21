// Runs `prisma migrate deploy` against the direct/unpooled database
// connection instead of the pooled one the app uses at runtime. Prisma's
// migration engine takes a session-scoped Postgres advisory lock, which
// doesn't reliably work through a PgBouncer transaction-pooled connection
// (Neon's DATABASE_URL) - it can time out (P1002), or worse, strand the
// lock on a pooled backend connection that never gets torn down, blocking
// every future migration until someone manually releases it.
//
// Prefers DATABASE_URL_UNPOOLED (set on Vercel). If it's missing (e.g.
// local dev, where only the pooled DATABASE_URL is configured), derive the
// direct host ourselves rather than silently running over the pooled
// connection: Neon's pooled hostnames are just the direct hostname with
// "-pooler" appended, so stripping that suffix reliably recovers the direct
// connection string without needing a second secret checked in anywhere.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- plain CommonJS build script, not bundled
const { execSync } = require("child_process");
// Needed so DATABASE_URL is actually populated here (from .env) before we
// try to rewrite it below — otherwise this script's own process.env is
// empty (Vercel sets it directly, but local dev relies on .env), the checks
// below silently no-op, and the child `prisma` process ends up loading the
// pooled URL itself via prisma.config.ts's own dotenv import instead.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- plain CommonJS build script, not bundled
require("dotenv/config");

const env = { ...process.env };
if (env.DATABASE_URL_UNPOOLED) {
  env.DATABASE_URL = env.DATABASE_URL_UNPOOLED;
} else if (env.DATABASE_URL && env.DATABASE_URL.includes("-pooler.")) {
  env.DATABASE_URL = env.DATABASE_URL.replace("-pooler.", ".");
}

execSync("npx prisma migrate deploy", { stdio: "inherit", env });
