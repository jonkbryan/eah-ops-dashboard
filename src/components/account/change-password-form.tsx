"use client";

import { useState, useTransition, type FormEvent } from "react";
import { changePassword } from "@/lib/actions/user-actions";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    startTransition(async () => {
      try {
        await changePassword({ currentPassword, newPassword });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
    >
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Current Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">New Password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500">At least 8 characters.</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Password updated.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 text-white font-medium py-3.5 text-base active:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Change Password"}
      </button>
    </form>
  );
}
