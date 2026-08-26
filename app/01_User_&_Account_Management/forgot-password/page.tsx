"use client";

import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const res = await fetch(`/01_User_&_Account_Management/account-actions?action=forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Request failed");
      setMessage(body.message || "If the account exists, a reset email has been sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-220px)] max-w-md items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Forgot Password</h1>
        <p className="mt-2 text-xs text-slate-500">Enter your email and we'll send password reset instructions if the account exists.</p>
        {(message || error) && <p className={`mt-4 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label>
          <div className="flex gap-3">
            <button className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white">Send reset email</button>
          </div>
        </form>
      </section>
    </main>
  );
}
