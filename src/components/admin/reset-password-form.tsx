"use client";

import { useState, useTransition, type FormEvent } from "react";
import { adminResetPassword } from "@/lib/actions/user-actions";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      try {
        await adminResetPassword({ userId, newPassword });
        setNewPassword("");
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3"
    >
      <div>
        <h2 className="text-sm font-medium text-gray-900">Reset Password</h2>
        <p className="text-xs text-gray-500">
          Use this if they&apos;re locked out. They can change it again from My Account afterward.
        </p>
      </div>

      <input
        type="text"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password (min. 8 characters)"
        className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Password reset.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-white border border-gray-300 text-gray-700 font-medium py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}
