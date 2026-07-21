// Runs `prisma migrate deploy` against the direct/unpooled database
// connection instead of the pooled one the app uses at runtime. Prisma's
// migration engine takes a session-scoped Postgres advisory lock, which
// doesn't reliably work through a PgBouncer transaction-pooled connection
// (Neon's DATABASE_URL) - it times out intermittently (P1002). Falls back
// to DATABASE_URL if DATABASE_URL_UNPOOLED isn't set (e.g. local dev).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- plain CommonJS build script, not bundled
const { execSync } = require("child_process");

const env = { ...process.env };
if (env.DATABASE_URL_UNPOOLED) {
  env.DATABASE_URL = env.DATABASE_URL_UNPOOLED;
}

execSync("npx prisma migrate deploy", { stdio: "inherit", env });
