// EAH-specific configuration. This is the ONLY place client data (jobs, cost
// codes, people) should live — prisma/seed.ts itself is generic and knows
// nothing about Elijah Anthony Homes. To onboard a future client, copy this
// file, edit the values, and point prisma/seed.ts at the new file.
//
// Values below were cross-checked against the real "EAH Master Invoice"
// Google Sheet and the "EAH Invoice Approvals" / "EAH AP Command Center"
// AppSheet apps. Two things worth knowing:
// - The team's actual email domain is anthonybryanconstruction.com, not
//   elijahanthonyhomes.com — "Elijah Anthony Homes" appears to be the brand
//   name; "Anthony Bryan Construction" (Anthony + Bryan, the two owners) is
//   the domain their real accounts use.
// - Jobs are identified there by the homeowner's name, not the site address
//   (e.g. "Gates", not a street address). Address exists as separate data
//   but isn't the primary identifier the team uses day to day.
//
// `jobs` and `invoices` below (2026-07-19) are a real, full import from that
// sheet — 35 jobs, 19 vendors, 95 invoices (11 already paid at import time,
// 84 pending real superintendent review) — not placeholder/demo data. Five
// rows from the source sheet were excluded: one with an unparseable amount,
// and four credit-memo/balance-adjustment rows with zero or negative
// amounts (e.g. "NET of $1,690.57 credit") — those aren't payable invoices
// and don't fit this schema's "amount owed" model. Four vendor name
// variants in the source data (inconsistent spelling/casing, e.g. "ROCK RM
// MATERIALS" vs "RM ROCK MATERIALS") were normalized to a single canonical
// vendor rather than imported as near-duplicates.

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
// Jon is also isSuperintendent: true here — the real Job Directory has him
// assigned as superintendent on at least one job ("Vick"), not just admin.
export const users: SeedUser[] = [
  { name: "Nick Allen", email: "nick@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: false },
  { name: "David Marshall", email: "david@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: false },
  { name: "Dan Bromley", email: "dan@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: false },
  { name: "Jon Bryan", email: "jon@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: true },
  { name: "Allie Russell", email: "allie@anthonybryanconstruction.com", isSuperintendent: false, isAdmin: true },
  { name: "Haley Anthony", email: "haley@anthonybryanconstruction.com", isSuperintendent: false, isAdmin: true },
  { name: "Eli Anthony", email: "elijah@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: true },
  { name: "Phil Anthony", email: "phil@anthonybryanconstruction.com", isSuperintendent: true, isAdmin: true },
];

// The real, deduplicated vendor list (Vendor List tab), plus 2 vendors that
// appeared in real invoice data but were missing from that tab: "Rock
// Materials" (seen as two inconsistent spellings) and "ELO Air Conditioning
// & Heating".
// Aliases are the alternate names this vendor is confirmed to arrive under
// from Make.com (its own vendor-normalization logic already merges these)
// or QuickBooks (observed directly in a real transaction export on
// 2026-07-20). Matched case-insensitively by /api/invoices/ingest and
// editable in /admin/vendors — not a hardcoded lookup table, just seeded
// with what's already confirmed.
export type SeedVendor = { name: string; aliases?: string[] };

export const vendors: SeedVendor[] = [
  { name: "Action Gypsum Supply" },
  { name: "BEE Builders Supply, Inc." },
  { name: "Bomberos Drywall", aliases: ["Bomberos Construction"] },
  { name: "Builders FirstSource", aliases: ["Builders First Source"] },
  { name: "ELO Air Conditioning & Heating", aliases: ["ELO HVAC"] },
  { name: "Facets" },
  { name: "GYPSUM SUPPLY" },
  { name: "JM Dump and Construct" },
  { name: "Jose Arellano" },
  { name: "Moore Supply" },
  { name: "PREFERRED GLASS DFW LLC", aliases: ["Preferred Glass DFW", "Preferred Glass DFW LLC"] },
  { name: "Pure Edge Cleaning Service", aliases: ["Pure Edge Cleaning Services"] },
  { name: "RNC Plumbing LLC" },
  { name: "Rock Materials", aliases: ["Rock Material"] },
  { name: "Serrano Brick" },
  { name: "Southern Floors of Texas LLC", aliases: ["Southern Floors"] },
  { name: "Texas Building Supply", aliases: ["US LBM"] },
  { name: "Top Quality trim" },
  { name: "XVERT Demo & Dirt" },
];

export type SeedJob = {
  name: string;
  // Resolved to `${superintendentFirstName}@anthonybryanconstruction.com`
  // by prisma/seed.ts — every real account follows that exact convention.
  superintendentFirstName: string;
  status: "active" | "complete";
};

// Real jobs and their real assigned superintendents, pulled from the Job
// Directory tab. Job identity is the homeowner's (last) name, matching how
// EAH actually tracks jobs — not a street address. No budget or address
// data was extracted for these, so both are left null/unset rather than
// invented; address can be filled in later from /admin/jobs.
export const jobs: SeedJob[] = [
  { name: "Anthony", superintendentFirstName: "elijah", status: "active" },
  { name: "Gates", superintendentFirstName: "david", status: "active" },
  { name: "Rivera", superintendentFirstName: "nick", status: "active" },
  { name: "Drake", superintendentFirstName: "david", status: "active" },
  { name: "Vick", superintendentFirstName: "jon", status: "active" },
  { name: "Mastrangelo, T", superintendentFirstName: "david", status: "active" },
  { name: "Plybon", superintendentFirstName: "dan", status: "active" },
  { name: "Mastrangelo, C&N", superintendentFirstName: "david", status: "active" },
  { name: "Mastrangelo, M", superintendentFirstName: "david", status: "active" },
  { name: "Todd", superintendentFirstName: "nick", status: "active" },
  { name: "Black", superintendentFirstName: "david", status: "active" },
  { name: "Owens", superintendentFirstName: "nick", status: "active" },
  { name: "Washburn", superintendentFirstName: "phil", status: "active" },
  { name: "Hanvey", superintendentFirstName: "nick", status: "active" },
  { name: "Gunter", superintendentFirstName: "phil", status: "active" },
  { name: "Redden", superintendentFirstName: "nick", status: "active" },
  { name: "Rocky", superintendentFirstName: "david", status: "active" },
  { name: "Magruder", superintendentFirstName: "nick", status: "active" },
  { name: "Whennen", superintendentFirstName: "david", status: "active" },
  { name: "McDade", superintendentFirstName: "elijah", status: "complete" },
  { name: "Gerber", superintendentFirstName: "phil", status: "complete" },
  { name: "Collins", superintendentFirstName: "elijah", status: "active" },
  { name: "Womack, L", superintendentFirstName: "david", status: "active" },
  { name: "Simmons", superintendentFirstName: "dan", status: "active" },
  { name: "Graham", superintendentFirstName: "nick", status: "active" },
  { name: "Taylor, L", superintendentFirstName: "david", status: "active" },
  { name: "Canton RV Park", superintendentFirstName: "elijah", status: "active" },
  { name: "Houser", superintendentFirstName: "elijah", status: "complete" },
  { name: "Womack, A&K", superintendentFirstName: "elijah", status: "complete" },
  { name: "Hay", superintendentFirstName: "elijah", status: "complete" },
  { name: "Folk", superintendentFirstName: "elijah", status: "complete" },
  { name: "Smith", superintendentFirstName: "elijah", status: "complete" },
  { name: "O'Dell", superintendentFirstName: "phil", status: "complete" },
  { name: "Mongognia", superintendentFirstName: "elijah", status: "complete" },
  { name: "Taylor, K", superintendentFirstName: "david", status: "active" },
];

export type SeedInvoice = {
  vendor: string; // must match an entry in `vendors`
  job: string; // must match an entry in `jobs`
  costCode: string; // must match a `costCodes` code
  amountCents: number;
  status: "pending" | "paid";
  invoiceLink: string | null; // -> Invoice.attachmentUrl
  note: string | null;
  paidAmountCents: number | null; // only set when status is "paid"
  paidDate: string | null; // ISO yyyy-mm-dd, only set when status is "paid"
  createdDate: string; // ISO yyyy-mm-dd, from the sheet's "Date Received"
};

export const invoices: SeedInvoice[] = [
  { vendor: "Southern Floors of Texas LLC", job: "Rocky", costCode: "1700", amountCents: 1236750, status: "pending", invoiceLink: "https://drive.google.com/file/d/1GORwoaftoae9FDdKkwlopOHNXkU1sns3/view", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Pure Edge Cleaning Service", job: "McDade", costCode: "3100", amountCents: 55800, status: "paid", invoiceLink: "https://drive.google.com/file/d/1QG2H6AM1VZL1bCWaO7FFgOMH7-9hK7jI/view", note: "Invoice #QB-4580", paidAmountCents: 55800, paidDate: "2026-07-01", createdDate: "2026-07-07" },
  { vendor: "Builders FirstSource", job: "Black", costCode: "2100", amountCents: 25647, status: "pending", invoiceLink: "https://drive.google.com/file/d/199_iqqrv16TISnK08M1uiIT-UBBsdPC2/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Gunter", costCode: "0600", amountCents: 3744, status: "paid", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: "Invoice #QB-4634", paidAmountCents: 3744, paidDate: "2026-07-10", createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Collins", costCode: "0600", amountCents: 10000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1U3v-Vd2zPPPuq3y90ll52jM58c--jk95/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "XVERT Demo & Dirt", job: "Todd", costCode: "0300", amountCents: 65000, status: "paid", invoiceLink: "https://drive.google.com/file/d/1MWaFXGAVTt-u_j-hzgQM-eTpscv8iEOI/view?usp=drivesdk", note: "Invoice #QB-4661", paidAmountCents: 65000, paidDate: "2026-07-09", createdDate: "2026-07-07" },
  { vendor: "XVERT Demo & Dirt", job: "Todd", costCode: "0300", amountCents: 60000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1G2xQQ3CBD7hckEaYPTOKUEYK4fjVhMHM/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "XVERT Demo & Dirt", job: "Todd", costCode: "0300", amountCents: 200000, status: "pending", invoiceLink: "https://drive.google.com/file/d/18YDQFPiiAUIH2YKSbh8B9v5fJ0KRGkH-/view?usp=drivesdk", note: "Invoice #QB-4659", paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Jose Arellano", job: "Hanvey", costCode: "3100", amountCents: 30000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1Er72-aeARrxmeqccWWywjtHz2WZOW8yD/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Jose Arellano", job: "Washburn", costCode: "3100", amountCents: 30000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1XOeVHPM4Wv-sloV34ZRLMDIioF3nckSk/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Southern Floors of Texas LLC", job: "Washburn", costCode: "1800", amountCents: 755658, status: "pending", invoiceLink: "https://drive.google.com/file/d/11SvoaNAQPCAZecMLF7xX7lJqRWNyD2H4/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Serrano Brick", job: "O'Dell", costCode: "0700", amountCents: 20000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1iBwixEPZOKcAgGf7bm5lr0iboRdHLD6d/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Serrano Brick", job: "Whennen", costCode: "0700", amountCents: 330000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1Oz2ElofQxsDLsVkz9AYlKuCy658fK4D8/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Whennen", costCode: "0600", amountCents: 53955, status: "paid", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: "Invoice #QB-4641", paidAmountCents: 53955, paidDate: "2026-07-10", createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Womack, L", costCode: "0600", amountCents: 9472, status: "paid", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: "Invoice #QB-4642", paidAmountCents: 9472, paidDate: "2026-07-10", createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Hanvey", costCode: "0600", amountCents: 75928, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Hanvey", costCode: "0600", amountCents: 24742, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Hanvey", costCode: "0600", amountCents: 32475, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Hanvey", costCode: "0600", amountCents: 19515, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Hanvey", costCode: "0600", amountCents: 48714, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Owens", costCode: "0600", amountCents: 2595, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Owens", costCode: "0600", amountCents: 15155, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Redden", costCode: "0600", amountCents: 7989, status: "paid", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: "Invoice #QB-4638", paidAmountCents: 7989, paidDate: "2026-07-10", createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Simmons", costCode: "0600", amountCents: 13856, status: "paid", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: "Invoice #QB-4639", paidAmountCents: 13856, paidDate: "2026-07-10", createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Black", costCode: "0600", amountCents: 840081, status: "paid", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: "Invoice #QB-4635", paidAmountCents: 840081, paidDate: "2026-07-10", createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Todd", costCode: "0600", amountCents: 5772, status: "paid", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: "Invoice #QB-4640", paidAmountCents: 5772, paidDate: "2026-07-10", createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Plybon", costCode: "0600", amountCents: 2093920, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Plybon", costCode: "0600", amountCents: 129173, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Plybon", costCode: "0600", amountCents: 2141747, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KXOd5Rlsr_EdcvyY7okKM7IQ6l-LBvZq/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Collins", costCode: "0600", amountCents: 135313, status: "pending", invoiceLink: "https://drive.google.com/file/d/1U3v-Vd2zPPPuq3y90ll52jM58c--jk95/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Collins", costCode: "0600", amountCents: 20000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1U3v-Vd2zPPPuq3y90ll52jM58c--jk95/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Simmons", costCode: "0600", amountCents: 204751, status: "pending", invoiceLink: "https://drive.google.com/file/d/1U3v-Vd2zPPPuq3y90ll52jM58c--jk95/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Anthony", costCode: "0600", amountCents: 3223867, status: "pending", invoiceLink: "https://drive.google.com/file/d/1U3v-Vd2zPPPuq3y90ll52jM58c--jk95/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Black", costCode: "0600", amountCents: 377426, status: "pending", invoiceLink: "https://drive.google.com/file/d/1U3v-Vd2zPPPuq3y90ll52jM58c--jk95/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Black", costCode: "0600", amountCents: 10000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1U3v-Vd2zPPPuq3y90ll52jM58c--jk95/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Builders FirstSource", job: "Owens", costCode: "2100", amountCents: 690808, status: "pending", invoiceLink: "https://drive.google.com/file/d/14kdqNGNYARbpNoWHff00d16cM5iM88XB/view", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Builders FirstSource", job: "Owens", costCode: "2100", amountCents: 95966, status: "pending", invoiceLink: "https://drive.google.com/file/d/14kdqNGNYARbpNoWHff00d16cM5iM88XB/view", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Builders FirstSource", job: "Owens", costCode: "2100", amountCents: 39766, status: "pending", invoiceLink: "https://drive.google.com/file/d/14kdqNGNYARbpNoWHff00d16cM5iM88XB/view", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Builders FirstSource", job: "Anthony", costCode: "2100", amountCents: 75528, status: "pending", invoiceLink: "https://drive.google.com/file/d/14kdqNGNYARbpNoWHff00d16cM5iM88XB/view", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Builders FirstSource", job: "Anthony", costCode: "2100", amountCents: 92950, status: "pending", invoiceLink: "https://drive.google.com/file/d/14kdqNGNYARbpNoWHff00d16cM5iM88XB/view", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Builders FirstSource", job: "Owens", costCode: "2100", amountCents: 56432, status: "pending", invoiceLink: "https://drive.google.com/file/d/14kdqNGNYARbpNoWHff00d16cM5iM88XB/view", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Builders FirstSource", job: "Owens", costCode: "2100", amountCents: 285293, status: "pending", invoiceLink: "https://drive.google.com/file/d/14kdqNGNYARbpNoWHff00d16cM5iM88XB/view", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Builders FirstSource", job: "Owens", costCode: "2100", amountCents: 111409, status: "pending", invoiceLink: "https://drive.google.com/file/d/14kdqNGNYARbpNoWHff00d16cM5iM88XB/view", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Builders FirstSource", job: "Hanvey", costCode: "2100", amountCents: 2650, status: "pending", invoiceLink: "https://drive.google.com/file/d/14kdqNGNYARbpNoWHff00d16cM5iM88XB/view", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Moore Supply", job: "Simmons", costCode: "1150", amountCents: 216649, status: "pending", invoiceLink: "https://drive.google.com/file/d/1oi-R0SDYwAwzK6718bV8xawro3C0lReZ/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Bomberos Drywall", job: "Rocky", costCode: "1400", amountCents: 30000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1uE9DpcTjxLpuxh1zDC9gROmP-eB9bsSG/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-07" },
  { vendor: "Texas Building Supply", job: "Anthony", costCode: "0600", amountCents: 385204, status: "pending", invoiceLink: "https://drive.google.com/file/d/1OP_GzyAjym4eikUvH1I0qZj25O4gyPMu/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Texas Building Supply", job: "Plybon", costCode: "0600", amountCents: 64500, status: "pending", invoiceLink: "https://drive.google.com/file/d/1-U3jvNXap-8QXLjeTn26C-KwArz8LYk-/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Southern Floors of Texas LLC", job: "Rocky", costCode: "1800", amountCents: 62710, status: "pending", invoiceLink: "https://drive.google.com/file/d/1bIdyvdFjFeDhWf9iRtYaNrkjRNGZZXkU/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Southern Floors of Texas LLC", job: "Taylor, L", costCode: "1800", amountCents: 413760, status: "paid", invoiceLink: "https://drive.google.com/file/d/1bk9ybyeSPI58TYS68F3tI5Nlm6mOwOc4/view?usp=drivesdk", note: "Invoice #QB-4568", paidAmountCents: 413760, paidDate: "2026-07-02", createdDate: "2026-07-08" },
  { vendor: "Southern Floors of Texas LLC", job: "Hanvey", costCode: "1800", amountCents: 143822, status: "pending", invoiceLink: "https://drive.google.com/file/d/19he_D3Ocp4EyTY6WQohmhThXYNC-fYb1/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Moore Supply", job: "Anthony", costCode: "1150", amountCents: 65769, status: "pending", invoiceLink: null, note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Moore Supply", job: "O'Dell", costCode: "1150", amountCents: 82181, status: "pending", invoiceLink: null, note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Texas Building Supply", job: "Graham", costCode: "0600", amountCents: 7889, status: "pending", invoiceLink: "https://drive.google.com/file/d/1-U3jvNXap-8QXLjeTn26C-KwArz8LYk-/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Builders FirstSource", job: "Washburn", costCode: "1500", amountCents: 276256, status: "pending", invoiceLink: "https://drive.google.com/file/d/132TSKsJrSEGTWAGyouvxBchbIJEM_RG3/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-08" },
  { vendor: "Texas Building Supply", job: "Washburn", costCode: "0600", amountCents: 109645, status: "pending", invoiceLink: "https://drive.google.com/file/d/1lDJTEyJvixw_fwtMf0z-uUvuYVgJqohZ/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-09" },
  { vendor: "Moore Supply", job: "Taylor, L", costCode: "2400", amountCents: 2205919, status: "pending", invoiceLink: "https://drive.google.com/file/d/1AloZrs9YRsZJMUGhCce_8jN51VSvcT9Y/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-09" },
  { vendor: "PREFERRED GLASS DFW LLC", job: "Hanvey", costCode: "3100", amountCents: 418000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1WJSLaykNPpwS0pd6dgGstmH5Az_Oddej/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-09" },
  { vendor: "Top Quality trim", job: "Black", costCode: "2100", amountCents: 737500, status: "pending", invoiceLink: "https://drive.google.com/file/d/1sLQdffGIm-TXaglkpR3Dq9QJDqh3oGnU/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-09" },
  { vendor: "GYPSUM SUPPLY", job: "Black", costCode: "1400", amountCents: 589776, status: "pending", invoiceLink: "https://drive.google.com/file/d/1wjpZpc7aTcWdTDdiS7jOZGHD_ZhHSC7S/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-09" },
  { vendor: "Texas Building Supply", job: "Collins", costCode: "2200", amountCents: 10000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1vYOvxRRlM0B_qUKxao8Ajs29j4-YS4FU/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-09" },
  { vendor: "Texas Building Supply", job: "Anthony", costCode: "2200", amountCents: 5000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1vYOvxRRlM0B_qUKxao8Ajs29j4-YS4FU/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-09" },
  { vendor: "Texas Building Supply", job: "Hanvey", costCode: "2200", amountCents: 2834, status: "pending", invoiceLink: "https://drive.google.com/file/d/1E4wr0-6qQvsvMfwqZTk6oLAv760WQ_Rn/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-10" },
  { vendor: "Action Gypsum Supply", job: "Collins", costCode: "1400", amountCents: 407548, status: "pending", invoiceLink: "https://drive.google.com/file/d/19woglqaQrVi2jaZNz_zfnxIKu2934hU-/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-10" },
  { vendor: "Bomberos Drywall", job: "Rocky", costCode: "1400", amountCents: 30000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1ZzZbehTTBgbQcRmyL_JUBs1ZmOz2Uctp/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-10" },
  { vendor: "JM Dump and Construct", job: "Black", costCode: "3100", amountCents: 58500, status: "pending", invoiceLink: "https://drive.google.com/file/d/1xDtZVasYE-tc45uZsgNLZLhnBkSOyLZS/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-11" },
  { vendor: "Rock Materials", job: "Whennen", costCode: "0700", amountCents: 5414, status: "pending", invoiceLink: "https://drive.google.com/file/d/1qhhOwOWxPaxC2xtEjWBsUVX0GHdoWM7H/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-11" },
  { vendor: "Rock Materials", job: "Black", costCode: "0700", amountCents: 179362, status: "pending", invoiceLink: "https://drive.google.com/file/d/13H-N7_MrtgQPGD-Gdpny0OwCnGF7R8I3/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-11" },
  { vendor: "Texas Building Supply", job: "Anthony", costCode: "0600", amountCents: 45454, status: "pending", invoiceLink: "https://drive.google.com/file/d/12S47cnnHcPehsubvAFtCGbO3RuhxJGP9/view?usp=drivesdk", note: null, paidAmountCents: null, paidDate: null, createdDate: "2026-07-11" },
  { vendor: "XVERT Demo & Dirt", job: "Rivera", costCode: "0300", amountCents: 700000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1u4d62Xx3UQ9KeXXs4frM9U3xYIVmyx7W/view?usp=drivesdk", note: "Invoice #1116", paidAmountCents: null, paidDate: null, createdDate: "2026-07-12" },
  { vendor: "Texas Building Supply", job: "Plybon", costCode: "0600", amountCents: 365609, status: "pending", invoiceLink: "https://drive.google.com/file/d/1UCn6JqSHLMkrVB_GFuxROkA2Sa8ALNAF/view?usp=drivesdk", note: "Invoice #15662568-053", paidAmountCents: null, paidDate: null, createdDate: "2026-07-12" },
  { vendor: "Builders FirstSource", job: "Washburn", costCode: "2100", amountCents: 51733, status: "pending", invoiceLink: "https://drive.google.com/file/d/1XUnrypt4JeKRQNsIIrCrRcqIP2-U1S5X/view?usp=drivesdk", note: "Invoice #900841982", paidAmountCents: null, paidDate: null, createdDate: "2026-07-14" },
  { vendor: "BEE Builders Supply, Inc.", job: "Hanvey", costCode: "1500", amountCents: 263, status: "pending", invoiceLink: "https://drive.google.com/file/d/1GCdC8dIhNct4pcGylm1QhBnlMDvOyS9S/view?usp=drivesdk", note: "Invoice #182119-01", paidAmountCents: null, paidDate: null, createdDate: "2026-07-14" },
  { vendor: "RNC Plumbing LLC", job: "Hanvey", costCode: "1100", amountCents: 516750, status: "paid", invoiceLink: "https://drive.google.com/file/d/1bLpwRIhhk0mSMyMtAyCDEZ2bnc1GZ7UH/view?usp=drivesdk", note: "Invoice #QB-4653", paidAmountCents: 516750, paidDate: "2026-07-10", createdDate: "2026-07-14" },
  { vendor: "Southern Floors of Texas LLC", job: "Graham", costCode: "1800", amountCents: 1160496, status: "pending", invoiceLink: "https://drive.google.com/file/d/1g8rzT58gL3oBgORiU3HW0NLuK8VkVFRm/view?usp=drivesdk", note: "Invoice #26431", paidAmountCents: null, paidDate: null, createdDate: "2026-07-15" },
  { vendor: "BEE Builders Supply, Inc.", job: "Simmons", costCode: "1500", amountCents: 67136, status: "pending", invoiceLink: "https://drive.google.com/file/d/18WBO8yF0oi12YvQSdxZWxuA8rm1kLiqZ/view?usp=drivesdk", note: "Invoice #182150-01", paidAmountCents: null, paidDate: null, createdDate: "2026-07-16" },
  { vendor: "Moore Supply", job: "Whennen", costCode: "1150", amountCents: 789581, status: "pending", invoiceLink: "https://drive.google.com/file/d/1IyuB3cOjKwNX9ZWvbhEG__57mIne6xUg/view?usp=drivesdk", note: "Invoice #S176976148.005", paidAmountCents: null, paidDate: null, createdDate: "2026-07-16" },
  { vendor: "Moore Supply", job: "Whennen", costCode: "1150", amountCents: 8362, status: "pending", invoiceLink: "https://drive.google.com/file/d/1PQ6ZXMd2vXSX9fBsL-rrcL6l8fE1mfpP/view?usp=drivesdk", note: "Invoice #S176976148.006", paidAmountCents: null, paidDate: null, createdDate: "2026-07-16" },
  { vendor: "Texas Building Supply", job: "Plybon", costCode: "0600", amountCents: 10000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1uy1hxZ2TAlDRMAZRvbGB3wXLD0Xw0TIB/view?usp=drivesdk", note: "Invoice #15674481-053", paidAmountCents: null, paidDate: null, createdDate: "2026-07-17" },
  { vendor: "Bomberos Drywall", job: "Graham", costCode: "1400", amountCents: 50000, status: "pending", invoiceLink: "https://drive.google.com/file/d/19VWnMYaoSDqIN7MVozfQE3aJAZQ-uRSn/view?usp=drivesdk", note: "Invoice #1254", paidAmountCents: null, paidDate: null, createdDate: "2026-07-17" },
  { vendor: "BEE Builders Supply, Inc.", job: "Hanvey", costCode: "2100", amountCents: 783, status: "pending", invoiceLink: "https://drive.google.com/file/d/1HFMYXipPQ3uf_3_n9FQ9sOU9TTYjbwTH/view?usp=drivesdk", note: "Invoice #182944-01", paidAmountCents: null, paidDate: null, createdDate: "2026-07-17" },
  { vendor: "Southern Floors of Texas LLC", job: "Washburn", costCode: "1700", amountCents: 1035924, status: "pending", invoiceLink: "https://drive.google.com/file/d/1z9Bj1gGjCxCXGTepZzIwky65lSDFlFfJ/view?usp=drivesdk", note: "Invoice #26078", paidAmountCents: null, paidDate: null, createdDate: "2026-07-18" },
  { vendor: "Southern Floors of Texas LLC", job: "Washburn", costCode: "1700", amountCents: 226300, status: "pending", invoiceLink: "https://drive.google.com/file/d/1rTvIW8XX0ZmjNmk5eMA_WAFOT998mG-l/view?usp=drivesdk", note: "Invoice #26079", paidAmountCents: null, paidDate: null, createdDate: "2026-07-18" },
  { vendor: "Southern Floors of Texas LLC", job: "Redden", costCode: "1800", amountCents: 939308, status: "pending", invoiceLink: "https://drive.google.com/file/d/1T8ka9KSbcR63mxc2akbQ1jFWj75ZLmTo/view?usp=drivesdk", note: "Invoice #26082", paidAmountCents: null, paidDate: null, createdDate: "2026-07-18" },
  { vendor: "Southern Floors of Texas LLC", job: "Rocky", costCode: "1800", amountCents: 62710, status: "pending", invoiceLink: "https://drive.google.com/file/d/14flWORQUnBTpu4m2vHZhlcbXzmyQRcdx/view?usp=drivesdk", note: "Invoice #26775", paidAmountCents: null, paidDate: null, createdDate: "2026-07-18" },
  { vendor: "Southern Floors of Texas LLC", job: "Taylor, L", costCode: "1800", amountCents: 413760, status: "pending", invoiceLink: "https://drive.google.com/file/d/1wGELRPOFTqJwxpFrTHGj_tC2KQmkXDfv/view?usp=drivesdk", note: "Invoice #26601", paidAmountCents: null, paidDate: null, createdDate: "2026-07-18" },
  { vendor: "Southern Floors of Texas LLC", job: "Washburn", costCode: "1800", amountCents: 755658, status: "pending", invoiceLink: "https://drive.google.com/file/d/1KKGbogcFPsLcmunNbo8jVJi4W0Of72PO/view?usp=drivesdk", note: "Invoice #26035", paidAmountCents: null, paidDate: null, createdDate: "2026-07-18" },
  { vendor: "Southern Floors of Texas LLC", job: "Whennen", costCode: "1700", amountCents: 562294, status: "pending", invoiceLink: "https://drive.google.com/file/d/1S5Wx8h2X8kuFkyC1r6vehiiJPCdjmDE6/view?usp=drivesdk", note: "Invoice #25862", paidAmountCents: null, paidDate: null, createdDate: "2026-07-18" },
  { vendor: "Southern Floors of Texas LLC", job: "Hanvey", costCode: "1700", amountCents: 143822, status: "pending", invoiceLink: "https://drive.google.com/file/d/1t4dv-5pOX2zktOIqjOmwyF7UmN1z-H4S/view?usp=drivesdk", note: "Invoice #25847", paidAmountCents: null, paidDate: null, createdDate: "2026-07-18" },
  { vendor: "JM Dump and Construct", job: "Owens", costCode: "3100", amountCents: 60000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1F1qJmWLXK1KyEFeWmjb3MuasO0ut4sdT/view?usp=drivesdk", note: "Invoice #376", paidAmountCents: null, paidDate: null, createdDate: "2026-07-18" },
  { vendor: "Texas Building Supply", job: "McDade", costCode: "3200", amountCents: 30000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1RFTDPf3LvyZPZBEJffsgjuItu14u_uGX/view?usp=drivesdk", note: "Invoice #15681937-053", paidAmountCents: null, paidDate: null, createdDate: "2026-07-18" },
  { vendor: "ELO Air Conditioning & Heating", job: "Plybon", costCode: "1200", amountCents: 1316000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1IEwqZsB5ACUjIwtz-3HrHn85Ns8I31du/view?usp=drivesdk", note: "Invoice #INV0654", paidAmountCents: null, paidDate: null, createdDate: "2026-07-19" },
  { vendor: "ELO Air Conditioning & Heating", job: "Plybon", costCode: "1200", amountCents: 1880000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1VD_RqSuo48uAI2Z8pe5VSElM1g8yzeJF/view?usp=drivesdk", note: "Invoice #INV0654", paidAmountCents: null, paidDate: null, createdDate: "2026-07-19" },
  { vendor: "ELO Air Conditioning & Heating", job: "Plybon", costCode: "1200", amountCents: 1302000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1cFEfLG2RHY16lU6CRGcSI-PGfc8r3Jb5/view?usp=drivesdk", note: "Invoice #INV0654", paidAmountCents: null, paidDate: null, createdDate: "2026-07-19" },
  { vendor: "ELO Air Conditioning & Heating", job: "Plybon", costCode: "1200", amountCents: 1860000, status: "pending", invoiceLink: "https://drive.google.com/file/d/1MQ7wkV8nBvzL5-qgHTI5694jVxnMEDXX/view?usp=drivesdk", note: "Invoice #INV0654", paidAmountCents: null, paidDate: null, createdDate: "2026-07-19" },
];
