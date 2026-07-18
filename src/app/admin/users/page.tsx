import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AdminTabs } from "@/components/admin/admin-tabs";

function roleLabel(isSuperintendent: boolean, isAdmin: boolean) {
  if (isSuperintendent && isAdmin) return "Superintendent + Admin";
  if (isAdmin) return "Admin";
  if (isSuperintendent) return "Superintendent";
  return "No role assigned";
}

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const users = await db.user.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500">{users.length} account(s)</p>
          </div>
          <Link
            href="/admin/users/new"
            className="shrink-0 rounded-lg bg-blue-600 text-white font-medium px-4 py-2.5 text-sm active:bg-blue-700"
          >
            + New User
          </Link>
        </div>
        <AdminTabs active="users" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {users.map((user) => (
          <Link
            key={user.id}
            href={`/admin/users/${user.id}/edit`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <p className="text-xs text-gray-500 shrink-0">
              {roleLabel(user.isSuperintendent, user.isAdmin)}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
