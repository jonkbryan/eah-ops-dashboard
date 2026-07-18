"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUserRoles } from "@/lib/actions/user-actions";

type Props =
  | {
      mode: "create";
      userId?: undefined;
      initial?: undefined;
    }
  | {
      mode: "edit";
      userId: string;
      initial: {
        name: string;
        email: string;
        isSuperintendent: boolean;
        isAdmin: boolean;
      };
    };

export function UserForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState(props.initial?.name ?? "");
  const [email, setEmail] = useState(props.initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [isSuperintendent, setIsSuperintendent] = useState(
    props.initial?.isSuperintendent ?? false
  );
  const [isAdmin, setIsAdmin] = useState(props.initial?.isAdmin ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!isSuperintendent && !isAdmin) {
      setError("Select at least one role.");
      return;
    }

    startTransition(async () => {
      try {
        if (props.mode === "create") {
          if (!email.trim()) {
            setError("Email is required.");
            return;
          }
          if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
          }
          await createUser({ name, email, password, isSuperintendent, isAdmin });
        } else {
          await updateUserRoles({ userId: props.userId, name, isSuperintendent, isAdmin });
        }
        router.push("/admin/users");
        router.refresh();
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
        <label className="text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Email</label>
        {props.mode === "create" ? (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <p className="text-sm text-gray-500 px-1 py-2">{email} (can&apos;t be changed here)</p>
        )}
      </div>

      {props.mode === "create" && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Initial Password</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">
            At least 8 characters. Share this with them — they can change it later from My
            Account.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Roles</label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isSuperintendent}
            onChange={(e) => setIsSuperintendent(e.target.checked)}
            className="h-5 w-5"
          />
          Superintendent
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="h-5 w-5"
          />
          Admin
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 text-white font-medium py-3.5 text-base active:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Saving..." : props.mode === "create" ? "Create User" : "Save Changes"}
      </button>
    </form>
  );
}
