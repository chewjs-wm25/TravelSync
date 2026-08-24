"use client";

import { FormEvent, useState } from "react";

export default function SecurityTab({ onSave }: { onSave: (data: Record<string, unknown>) => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); await onSave({ currentPassword, newPassword }); setCurrentPassword(""); setNewPassword(""); }
  return <form onSubmit={submit} className="max-w-lg space-y-4"><p className="text-sm text-slate-500">Choose a password with at least 8 characters, including uppercase, lowercase, number, and special character.</p><label className="block text-sm font-medium text-slate-700">Current password<input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label><label className="block text-sm font-medium text-slate-700">New password<input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label><button className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white">Change password</button></form>;
}
