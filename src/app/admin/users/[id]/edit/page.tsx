import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { UserForm } from "@/components/admin/user-form";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Edit User</h1>
        <p className="text-sm text-gray-500">{user.name}</p>
      </div>

      <UserForm
        mode="edit"
        userId={user.id}
        initial={{
          name: user.name,
          email: user.email,
          isSuperintendent: user.isSuperintendent,
          isAdmin: user.isAdmin,
        }}
      />

      <ResetPasswordForm userId={user.id} />
    </main>
  );
}
