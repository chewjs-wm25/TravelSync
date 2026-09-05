"use client";

import { FormEvent, useState } from "react";
import { DashboardUser } from "./DashboardPage";

export default function DeleteAccountTab({
  user,
  onDelete,
}: {
  user: DashboardUser;
  onDelete: (confirmation: string) => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirmed) return;
    setError(null);
    setDeleting(true);
    try {
      await onDelete(confirmation.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-lg rounded-xl border border-red-200 bg-red-50/60 p-6 space-y-4"
    >
      <div>
        <h3 className="text-base font-semibold text-red-900">
          Delete account permanently
        </h3>
        <p className="mt-1 text-sm text-red-700 leading-relaxed">
          This permanently removes your profile, settings, trips, active sessions, and personal data. This action cannot be undone.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-100 p-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      <label className="block text-sm font-medium text-red-900">
        Confirm deletion
        <span className="block mt-0.5 text-xs font-normal text-red-700">
          Enter your <strong>password</strong>, or type your username (<strong>{user.username}</strong>) to confirm.
        </span>
        <input
          required
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={`Enter password or "${user.username}"`}
          className="mt-1.5 w-full rounded-lg border border-red-300 bg-white p-2.5 text-sm outline-none transition focus:border-red-600 focus:ring-1 focus:ring-red-600"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-red-800 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500"
        />
        <span>I understand that deleting my account is permanent and irreversible.</span>
      </label>

      <button
        type="submit"
        disabled={!confirmed || !confirmation.trim() || deleting}
        className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? "Deleting account..." : "Permanently Delete Account"}
      </button>
    </form>
  );
}
