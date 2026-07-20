"use client";

import { useRef, useState, useTransition } from "react";
import { uploadQuickBooksCsv } from "@/lib/actions/quickbooks-actions";

export function QuickBooksCsvUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        await uploadQuickBooksCsv(formData);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-900">Upload QuickBooks CSV</p>
        <p className="text-xs text-gray-500">
          Reports → Transaction List, exported to CSV. Replaces the previous upload.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="flex-1 text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-blue-600 text-white font-medium px-4 py-2.5 text-sm active:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Uploading..." : "Upload"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </form>
  );
}
