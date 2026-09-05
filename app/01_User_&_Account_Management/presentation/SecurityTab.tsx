"use client";

import { FormEvent, useState } from "react";
import { DashboardUser } from "./DashboardPage";

export default function SecurityTab({
  user,
  onSave,
}: {
  user: DashboardUser;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasPassword = user.hasPassword;

  // Validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordValid =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isPasswordValid) {
      setError(
        "New password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-5">
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          {success}
        </p>
      )}

      {!hasPassword && (
        <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
          <h3 className="text-sm font-semibold text-teal-900">Set your account password</h3>
          <p className="mt-1 text-xs text-teal-700">
            You signed in with Google and have not set an account password yet. Set a password below to enable password login and account deletion.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">
          {hasPassword
            ? "Manage your login password to keep your account secure."
            : "Enter and confirm your new password."}
        </p>
        <button
          type="button"
          onClick={() => setShowPasswords(!showPasswords)}
          className="text-xs font-semibold text-teal-700 transition-colors hover:text-teal-800 hover:underline active:opacity-70"
        >
          {showPasswords ? "Hide passwords" : "Show passwords"}
        </button>
      </div>

      {hasPassword && (
        <label className="block text-sm font-medium text-slate-700">
          Current Password
          <input
            required
            type={showPasswords ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </label>
      )}

      <label className="block text-sm font-medium text-slate-700">
        {hasPassword ? "New Password" : "Password"}
        <input
          required
          minLength={8}
          type={showPasswords ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={hasPassword ? "Enter new password" : "Enter a strong password"}
          className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        />
      </label>

      {/* Password Requirements Checklist */}
      <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
        <p className="font-semibold text-slate-600 mb-1">Password Requirements:</p>
        <div className="grid grid-cols-2 gap-1 text-slate-500">
          <span className={hasMinLength ? "text-emerald-700 font-medium" : ""}>
            {hasMinLength ? "✓" : "•"} At least 8 characters
          </span>
          <span className={hasUppercase ? "text-emerald-700 font-medium" : ""}>
            {hasUppercase ? "✓" : "•"} 1 Uppercase letter
          </span>
          <span className={hasLowercase ? "text-emerald-700 font-medium" : ""}>
            {hasLowercase ? "✓" : "•"} 1 Lowercase letter
          </span>
          <span className={hasNumber ? "text-emerald-700 font-medium" : ""}>
            {hasNumber ? "✓" : "•"} 1 Number
          </span>
          <span className={hasSpecial ? "text-emerald-700 font-medium" : ""}>
            {hasSpecial ? "✓" : "•"} 1 Special character
          </span>
        </div>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        {hasPassword ? "Confirm New Password" : "Confirm Password"}
        <input
          required
          minLength={8}
          type={showPasswords ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat password"
          className={`mt-1 w-full rounded-lg border p-2.5 text-sm outline-none transition ${
            confirmPassword && !passwordsMatch
              ? "border-red-400 focus:border-red-600 focus:ring-1 focus:ring-red-600"
              : "border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          }`}
        />
        {confirmPassword && !passwordsMatch && (
          <span className="text-xs text-red-600 mt-1 block">Passwords do not match</span>
        )}
      </label>

      <button
        type="submit"
        disabled={saving || !isPasswordValid || !passwordsMatch}
        className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}
