"use client";

import { FormEvent, useState } from "react";

export default function DeleteAccountTab({ onDelete }: { onDelete: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (!confirmed) return; await onDelete(password); }
  return <form onSubmit={submit} className="max-w-lg rounded-xl border border-red-200 bg-red-50 p-5"><h3 className="font-semibold text-red-800">Delete account permanently</h3><p className="mt-2 text-sm text-red-700">This removes your profile, settings, sessions, and account data. This action cannot be undone.</p><label className="mt-5 block text-sm font-medium text-red-900">Confirm with your password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-red-300 bg-white p-2.5" /></label><label className="mt-4 flex gap-2 text-sm text-red-800"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I understand this action is permanent.</label><button disabled={!confirmed} className="mt-5 rounded-lg bg-red-700 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Delete account</button></form>;
}
