import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserForm } from "@/components/admin/user-form";

export default async function NewUserPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">New User</h1>
        <p className="text-sm text-gray-500">Add a team member and assign their role(s)</p>
      </div>

      <UserForm mode="create" />
    </main>
  );
}
