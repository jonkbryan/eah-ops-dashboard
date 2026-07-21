"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createVendor, updateVendor } from "@/lib/actions/vendor-actions";

type Props =
  | { mode: "create"; vendorId?: undefined; initial?: undefined }
  | { mode: "edit"; vendorId: string; initial: { name: string; aliases: string[] } };

export function VendorForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState(props.initial?.name ?? "");
  const [aliases, setAliases] = useState((props.initial?.aliases ?? []).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Vendor name is required.");
      return;
    }

    startTransition(async () => {
      try {
        if (props.mode === "create") {
          await createVendor({ name, aliases });
        } else {
          await updateVendor({ vendorId: props.vendorId, name, aliases });
        }
        router.push("/admin/vendors");
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
        <label className="text-sm font-medium text-gray-700">Vendor Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Texas Building Supply"
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">
          Other names this vendor comes in as (optional)
        </label>
        <p className="text-xs text-gray-500">
          One per line. Invoices ingested from Make.com/QuickBooks match against these too, not
          just the name above — case does not matter.
        </p>
        <textarea
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          rows={3}
          placeholder={"US LBM\nPreferred Glass DFW"}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
        {pending ? "Saving..." : props.mode === "create" ? "Create Vendor" : "Save Changes"}
      </button>
    </form>
  );
}
