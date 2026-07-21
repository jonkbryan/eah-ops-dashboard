// EAH pays every Thursday; funds process/land Friday morning, so "which
// Friday" is how the team actually talks about a payment batch and the unit
// the payment hub is organized around. This is specific to EAH's cadence,
// not a generic reusable concept.

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function nextFridayOnOrAfter(date: Date): Date {
  const d = startOfDay(date);
  while (d.getDay() !== 5) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function getUpcomingFridays(count: number, from: Date = new Date()): string[] {
  const cursor = nextFridayOnOrAfter(from);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}

export function formatFriday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Every unpaid invoice is bucketed into a payment Friday so it shows up
// somewhere in the payment hub even before anyone has explicitly scheduled
// it: an admin-set scheduledPaymentDate wins, otherwise it defaults to the
// next Friday on/after the invoice was created.
export function dueFridayIso(invoice: {
  scheduledPaymentDate: Date | null;
  createdAt: Date;
}): string {
  const due = invoice.scheduledPaymentDate
    ? startOfDay(invoice.scheduledPaymentDate)
    : nextFridayOnOrAfter(invoice.createdAt);
  return due.toISOString().slice(0, 10);
}
