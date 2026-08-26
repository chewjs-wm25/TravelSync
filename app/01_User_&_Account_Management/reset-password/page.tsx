"use client";

import { Suspense, FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-220px)] max-w-md items-center px-4 py-10">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Invalid Link</h1>
          <p className="mt-2 text-sm text-slate-500">
            This password reset link is invalid or missing a token. Please request a new one.
          </p>
          <a href="/01_User_&_Account_Management" className="mt-4 inline-block text-sm font-medium text-teal-700 hover:underline">
            Back to sign in
          </a>
        </section>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/01_User_&_Account_Management/account-actions?action=reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const result = await response.json() as { success?: boolean; error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Reset failed");
      setNotice(result.message ?? "Password has been reset. You can now sign in.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-220px)] max-w-md items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Reset Password</h1>
        <p className="mt-2 text-xs text-slate-500">Enter your new password below.</p>
        {(error || notice) && (
          <p className={`mt-4 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {error || notice}
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            New password
            <input
              required
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2.5"
            />
          </label>
          <label className="block text-sm font-medium">
            Confirm new password
            <input
              required
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2.5"
            />
          </label>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-teal-700 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
        {notice && (
          <a href="/01_User_&_Account_Management" className="mt-4 block text-center text-sm font-medium text-teal-700 hover:underline">
            Back to sign in
          </a>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="mx-auto flex min-h-[calc(100vh-220px)] max-w-md items-center px-4 py-10"><p className="text-sm text-slate-500">Loading...</p></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
