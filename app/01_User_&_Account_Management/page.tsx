"use client";

import { FormEvent, useEffect, useState } from "react";

type User = { id: string; email: string; fullName: string; phone: string | null; profilePicture: string | null; isVerified: boolean; isActive: boolean; role: string };

async function accountRequest(action: string, data?: Record<string, unknown>) {
  const response = await fetch(`/01_User_&_Account_Management/account-actions?action=${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data ?? {}) });
  const result = await response.json() as { user?: User; message?: string; verificationUrl?: string | null; error?: string };
  if (!response.ok) throw new Error(result.error ?? "Request failed");
  return result;
}

export default function AccountSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ fullName: "", identifier: "", email: "", phone: "", icNumber: "", password: "", rememberMe: false, acceptTerms: false });
  const [notice, setNotice] = useState("");
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { fetch("/01_User_&_Account_Management/account-actions").then(async (response) => { if (response.ok) setUser((await response.json() as { user: User }).user); }).catch(() => undefined); }, []);
  function update(name: string, value: string | boolean) { setForm((current) => ({ ...current, [name]: value })); }
  function resetMessages() { setNotice(""); setVerificationUrl(null); setError(""); }
  function switchMode(nextRegistering: boolean) { setRegistering(nextRegistering); setShowPassword(false); setForm({ fullName: "", identifier: "", email: "", phone: "", icNumber: "", password: "", rememberMe: false, acceptTerms: false }); resetMessages(); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); resetMessages();
    try {
      if (registering) {
        const result = await accountRequest("register", { fullName: form.fullName, email: form.email || undefined, phone: form.phone, icNumber: form.icNumber, password: form.password, acceptTerms: form.acceptTerms });
        setNotice(result.message ?? "Account created."); setVerificationUrl(result.verificationUrl ?? null);
      } else {
        const result = await accountRequest("login", { identifier: form.identifier, password: form.password, rememberMe: form.rememberMe });
        setUser(result.user ?? null); setNotice("Signed in successfully.");
      }
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Request failed"); }
  }

  async function deleteTestAccount() {
    resetMessages();
    try { const result = await accountRequest("delete-test-account", { identifier: registering ? (form.email || form.phone) : form.identifier, password: form.password }); setNotice(result.message ?? "Test account deleted."); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Could not delete test account"); }
  }

  if (!user) return <main className="mx-auto flex min-h-[calc(100vh-220px)] max-w-md items-center px-4 py-10"><section className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm [&_input:invalid]:border-red-500 [&_input:invalid]:ring-1 [&_input:invalid]:ring-red-200"><div className="mb-7 flex gap-6 border-b border-slate-200"><button type="button" onClick={() => switchMode(false)} className={`border-b-2 pb-3 text-sm font-semibold ${!registering ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500"}`}>Sign in</button><button type="button" onClick={() => switchMode(true)} className={`border-b-2 pb-3 text-sm font-semibold ${registering ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500"}`}>Register</button></div><h1 className="text-2xl font-semibold text-slate-900">{registering ? "Create your account" : "Welcome back"}</h1><p className="mt-2 text-xs text-slate-500">{registering ? "Required: name, IC number, password, terms, and either email or phone." : "Use your email or phone number to sign in."}</p>{(error || notice) && <p className={`mt-4 break-words rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || notice}{verificationUrl && <a href={verificationUrl} className="mt-2 block font-semibold underline">Verify email now</a>}</p>}<form onSubmit={submit} className="mt-6 space-y-4">{registering && <><label className="block text-sm font-medium">Full name<input required value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label><label className="block text-sm font-medium">Email <span className="font-normal text-slate-500">(optional if phone is provided)</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label><label className="block text-sm font-medium">Phone number<input required={!form.email} value={form.phone} onChange={(event) => update("phone", event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label><label className="block text-sm font-medium">IC number<input required value={form.icNumber} onChange={(event) => update("icNumber", event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /><span className="text-xs text-slate-500">Stored securely as a hash.</span></label></>} {!registering && <label className="block text-sm font-medium">Email or phone<input required value={form.identifier} onChange={(event) => update("identifier", event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label>}<label className="block text-sm font-medium">Password<div className="relative mt-1"><input required type={showPassword ? "text" : "password"} minLength={8} value={form.password} onChange={(event) => update("password", event.target.value)} className="w-full rounded-lg border p-2.5 pr-20" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-xs font-semibold text-teal-700">{showPassword ? "Hide" : "Show"}</button></div>{registering && <span className="text-xs text-slate-500">8+ characters, uppercase, lowercase, number, and special character.</span>}</label>{registering ? <label className="flex gap-2 text-sm"><input required type="checkbox" checked={form.acceptTerms} onChange={(event) => update("acceptTerms", event.target.checked)} />Accept terms and privacy policy</label> : <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.rememberMe} onChange={(event) => update("rememberMe", event.target.checked)} />Remember me</label>}<button className="w-full rounded-lg bg-teal-700 py-2.5 font-semibold text-white">{registering ? "Create account" : "Sign in"}</button></form>{!registering && <><button type="button" onClick={() => accountRequest("forgot-password", { email: form.identifier }).then((result) => setNotice(result.message ?? "Reset email sent.")).catch((forgotError) => setError(forgotError instanceof Error ? forgotError.message : "Request failed"))} className="mt-4 text-sm text-teal-700 hover:underline">Forgot password?</button><a href="/01_User_&_Account_Management/account-actions?action=google" className="mt-4 block rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">Continue with Google</a></>}{(form.email || form.phone || form.identifier) && <button type="button" onClick={deleteTestAccount} className="mt-5 text-xs text-red-700 underline">Delete this test account</button>}</section></main>;
  return <main className="mx-auto max-w-4xl px-4 py-10"><section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Account</p><h1 className="mt-2 text-2xl font-semibold">Account settings</h1><p className="mt-1 text-sm text-slate-500">{user.fullName} · {user.phone ?? user.email}</p></div><button type="button" onClick={() => accountRequest("logout").then(() => setUser(null))} className="text-sm font-semibold text-red-700">Sign out</button></div><div className="mt-8 grid gap-4 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">Profile</p><p className="mt-1 text-sm text-slate-500">Name, phone and profile picture</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">Preferences</p><p className="mt-1 text-sm text-slate-500">Notifications, language and theme</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">Security</p><p className="mt-1 text-sm text-slate-500">Password and account protection</p></div></div></section></main>;
}
