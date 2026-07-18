// EAH-specific configuration. This is the ONLY place client data (jobs, cost
// codes, people) should live — prisma/seed.ts itself is generic and knows
// nothing about Elijah Anthony Homes. To onboard a future client, copy this
// file, edit the values, and point prisma/seed.ts at the new file.

export const DEFAULT_PASSWORD = "ChangeMe123!";
// ^ Every seeded account starts with this password. There is no self-service
//   reset flow in v1 — have each person sign in and note their password was
//   set by an admin. Change this (and re-seed, or update via Prisma Studio)
//   before handing accounts to real users.

export const costCodes = [
  { code: "01", label: "Site Work / Excavation" },
  { code: "02", label: "Foundation" },
  { code: "03", label: "Framing Labor" },
  { code: "04", label: "Framing Lumber" },
  { code: "05", label: "Roofing" },
  { code: "06", label: "Windows & Doors" },
  { code: "07", label: "Exterior Trim & Siding" },
  { code: "08", label: "Masonry / Stone" },
  { code: "09", label: "Stucco" },
  { code: "10", label: "Plumbing Rough-In" },
  { code: "11", label: "Plumbing Finish" },
  { code: "12", label: "Electrical Rough-In" },
  { code: "13", label: "Electrical Finish" },
  { code: "14", label: "HVAC" },
  { code: "15", label: "Insulation" },
  { code: "16", label: "Drywall" },
  { code: "17", label: "Interior Trim & Doors" },
  { code: "18", label: "Cabinets" },
  { code: "19", label: "Countertops" },
  { code: "20", label: "Painting - Interior" },
  { code: "21", label: "Painting - Exterior" },
  { code: "22", label: "Flooring - Tile" },
  { code: "23", label: "Flooring - Wood" },
  { code: "24", label: "Flooring - Carpet" },
  { code: "25", label: "Appliances" },
  { code: "26", label: "Garage Doors" },
  { code: "27", label: "Fireplace" },
  { code: "28", label: "Gutters" },
  { code: "29", label: "Landscaping" },
  { code: "30", label: "Irrigation" },
  { code: "31", label: "Pool" },
  { code: "32", label: "Fencing" },
  { code: "33", label: "Driveway / Concrete Flatwork" },
  { code: "34", label: "Permits & Fees" },
  { code: "35", label: "Survey & Engineering" },
  { code: "36", label: "Cleanup / Punch List" },
] as const;

export type SeedUser = {
  name: string;
  email: string;
  isSuperintendent: boolean;
  isAdmin: boolean;
};

export const users: SeedUser[] = [
  { name: "Nick Allen", email: "nick.allen@elijahanthonyhomes.com", isSuperintendent: true, isAdmin: false },
  { name: "David Marshall", email: "david.marshall@elijahanthonyhomes.com", isSuperintendent: true, isAdmin: false },
  { name: "Dan Bromley", email: "dan.bromley@elijahanthonyhomes.com", isSuperintendent: true, isAdmin: false },
  { name: "Jon Bryan", email: "jonkbryan@yahoo.com", isSuperintendent: false, isAdmin: true },
  { name: "Allie Russell", email: "allie.russell@elijahanthonyhomes.com", isSuperintendent: false, isAdmin: true },
  { name: "Haley Anthony", email: "haley.anthony@elijahanthonyhomes.com", isSuperintendent: false, isAdmin: true },
  { name: "Eli Anthony", email: "eli.anthony@elijahanthonyhomes.com", isSuperintendent: true, isAdmin: true },
  { name: "Phil Anthony", email: "phil.anthony@elijahanthonyhomes.com", isSuperintendent: true, isAdmin: true },
];

export const jobs = [
  {
    name: "412 Windridge Ct, Prosper, TX",
    superintendentEmail: "nick.allen@elijahanthonyhomes.com",
    budgetCents: 85_000_000, // $850,000.00
  },
];

export const sampleInvoices = [
  {
    jobName: "412 Windridge Ct, Prosper, TX",
    costCode: "03", // Framing Labor
    vendorName: "Crossroads Framing Co.",
    amountCents: 1_250_000, // $12,500.00
    note: "Framing labor draw #2",
  },
];
