import { db } from "@/lib/db";

function normalize(s: string) {
  return s.trim().toLowerCase();
}

// Matches external vendor text (e.g. from Make.com/QuickBooks) against a
// Vendor's canonical name OR any of its known aliases, case-insensitively.
// Done in application code rather than a DB query since Postgres array
// `has` filters don't support case-insensitive matching, and the vendor
// list is small enough that fetching it all is cheap.
export async function findVendorByNameOrAlias(input: string) {
  const target = normalize(input);
  const vendors = await db.vendor.findMany();
  return (
    vendors.find((v) => normalize(v.name) === target) ??
    vendors.find((v) => v.aliases.some((a) => normalize(a) === target)) ??
    null
  );
}
