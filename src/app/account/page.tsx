import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">My Account</h1>
        <p className="text-sm text-gray-500">
          {session.user.name} · {session.user.email}
        </p>
      </div>

      <ChangePasswordForm />
    </main>
  );
}
