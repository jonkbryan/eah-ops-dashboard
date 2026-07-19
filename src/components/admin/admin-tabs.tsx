import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "invoices", label: "Invoices", href: "/admin/invoices" },
  { key: "jobs", label: "Jobs", href: "/admin/jobs" },
  { key: "users", label: "Users", href: "/admin/users" },
] as const;

export function AdminTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <div className="flex items-center gap-4 text-sm border-b border-gray-200">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={
            tab.key === active
              ? "pb-2 border-b-2 border-blue-600 text-blue-600 font-medium"
              : "pb-2 border-b-2 border-transparent text-gray-500 hover:text-gray-900"
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
