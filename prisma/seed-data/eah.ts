// EAH-specific configuration. This is the ONLY place client data (jobs, cost
// codes, people) should live — prisma/seed.ts itself is generic and knows
// nothing about Elijah Anthony Homes. To onboard a future client, copy this
// file, edit the values, and point prisma/seed.ts at the new file.
//
// Values below were cross-checked against the real "EAH Master Invoice"
// Google Sheet and the "EAH Invoice Approvals" / "EAH AP Command Center"
// AppSheet apps (2026-07-18). Two things worth knowing:
// - The team's actual email domain is anthonybryanconstruction.com, not
//   elijahanthonyhomes.com — "Elijah Anthony Homes" appears to be the brand
//   name; "Anthony Bryan Construction" (Anthony + Bryan, the two owners) is
//   the domain their real accounts use.
// - Jobs are identified there by the homeowner's name, not the site address
//   (e.g. "Melody Gates", not a street address). Address exists as separate
//   data but isn't the primary identifier the team uses day to day.

export const DEFAULT_PASSWORD = "ChangeMe123!";
// ^ Every seeded account starts with this password. There is no self-service
//   reset flow in v1 — have each person sign in and note their password was
//   set by an admin. Change this (and re-seed, or update via Prisma Studio)
//   before handing accounts to real users.

// The real, currently-configured 36 cost codes (Invoice Log > Cost Code enum
// in the EAH Invoice Approvals AppSheet app).
export const costCodes = [
  { code: "0000", label: "Uncategorized" },
  { code: "0100", label: "Planning" },
  { code: "0200", label: "Demolition" },
  { code: "0300", label: "Excavation" },
  { code: "0400", label: "Utilities" },
  { code: "0500", label: "Foundation" },
  { code: "0600", label: "Framing" },
  { code: "0700", label: "Masonry" },
  { code: "0800", label: "Siding" },
  { code: "0900", label: "Roofing" },
  { code: "1000", label: "Electrical" },
  { code: "1050", label: "Lighting & Fans" },
  { code: "1100", label: "Plumbing" },
  { code: "1150", label: "Plumbing Fixtures" },
  { code: "1200", label: "Mechanical" },
  { code: "1300", label: "Insulation" },
  { code: "1400", label: "Drywall" },
  { code: "1500", label: "Doors & Windows" },
  { code: "1600", label: "Garage" },
  { code: "1700", label: "Flooring" },
  { code: "1800", label: "Tiling" },
  { code: "1900", label: "Cabinetry" },
  { code: "2000", label: "Countertops" },
  { code: "2100", label: "Trimwork" },
  { code: "2200", label: "Specialty Finishes" },
  { code: "2300", label: "Painting" },
  { code: "2400", label: "Appliances" },
  { code: "2500", label: "Decking" },
  { code: "2600", label: "Fencing" },
  { code: "2700", label: "Pools" },
  { code: "2800", label: "Concrete" },
  { code: "2900", label: "Landscaping" },
  { code: "3000", label: "Furnishings" },
  { code: "3100", label: "Miscellaneous" },
  { code: "3200", label: "Fireplace" },
  { code: "3300", label: "Metal Work" },
] as const;

export type SeedUser = {
  name: string;
  email: string;
  isSuperintendent: boolean;
  isAdmin: boolean;
};

// Surnames for Nick, David, and Dan came directly from Jon, not from the
// AppSheet data (their Team tab only records first name + email — the three
// superintendents aren't full Team-tab members there). Everything else
// (names, roles, email local-parts) is verified against the real Team tab.
export const users: SeedUser[] = [
  { name: "Nick Allen", email: "nick@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: false },
  { name: "David Marshall", email: "david@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: false },
  { name: "Dan Bromley", email: "dan@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: false },
  { name: "Jon Bryan", email: "jon@anthonybryanconstruction.com", isSuperintendent: false, isAdmin: true },
  { name: "Allie Russell", email: "allie@anthonybryanconstruction.com", isSuperintendent: false, isAdmin: true },
  { name: "Haley Anthony", email: "haley@anthonybryanconstruction.com", isSuperintendent: false, isAdmin: true },
  { name: "Eli Anthony", email: "elijah@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: true },
  { name: "Phil Anthony", email: "phil@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: true },
];

// Real jobs and their real assigned superintendents, pulled from the Job
// Directory tab. Job identity is the homeowner's name, matching how EAH
// actually tracks jobs — not a street address. No budget data exists for
// these in the real system, so budgetCents is left null rather than
// invented.
export const jobs = [
  {
    name: "Melody Gates",
    superintendentEmail: "david@anthonybryanconstruction.com",
    budgetCents: null,
  },
  {
    name: "Jose & Madalina Rivera",
    superintendentEmail: "nick@anthonybryanconstruction.com",
    budgetCents: null,
  },
];

export const sampleInvoices = [
  {
    jobName: "Melody Gates",
    costCode: "0600", // Framing
    vendorName: "Texas Building Supply",
    amountCents: 1_250_000, // $12,500.00
    note: "Framing labor draw #2",
  },
];
