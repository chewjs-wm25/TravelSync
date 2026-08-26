"use client";

import { FormEvent, useState } from "react";

export default function SecurityTab({ onSave }: { onSave: (data: Record<string, unknown>) => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await onSave({ currentPassword, newPassword });
      setSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password change failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      <p className="text-sm text-slate-500">
        Choose a password with at least 8 characters, including uppercase, lowercase, number, and special character.
      </p>
      {(error || success) && (
        <p className={`rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {error || success}
        </p>
      )}
      <label className="block text-sm font-medium text-slate-700">
        Current password
        <input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        New password
        <input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Confirm new password
        <input required minLength={8} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" />
      </label>
      <button disabled={loading} className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">
        {loading ? "Changing..." : "Change password"}
      </button>
    </form>
  );
}
