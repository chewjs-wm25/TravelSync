"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import type { DashboardUser } from "./DashboardPage";

export default function ProfileTab({ user, onSave }: { user: DashboardUser; onSave: (data: Record<string, unknown>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [picture, setPicture] = useState(user.profilePicture ?? "");

  function selectPicture(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setPicture(String(reader.result)); reader.readAsDataURL(file); }
  async function submit(event: FormEvent) { event.preventDefault(); await onSave({ fullName: name, phone: phone || null, profilePicture: picture || null }); setEditing(false); }

  return editing ? <form onSubmit={submit} className="max-w-lg space-y-4"><label className="block text-sm font-medium text-slate-700">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label><label className="block text-sm font-medium text-slate-700">Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label><label className="block text-sm font-medium text-slate-700">Profile picture<input type="file" accept="image/*" onChange={selectPicture} className="mt-1 block w-full text-sm" /></label><div className="flex gap-3"><button className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white">Save changes</button><button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-4 py-2.5">Cancel</button></div></form> : <div className="max-w-lg"><div className="flex items-center gap-4">{user.profilePicture ? <img src={user.profilePicture} alt="Profile" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-xl font-semibold text-teal-800">{user.fullName.slice(0, 1).toUpperCase()}</div>}<div><h3 className="text-lg font-semibold text-slate-900">{user.fullName}</h3><p className="text-sm text-slate-500">@{user.username}</p></div></div><dl className="mt-8 divide-y divide-slate-100 text-sm"><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Email</dt><dd>{user.email ?? "Not provided"}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Phone</dt><dd>{user.phone ?? "Not provided"}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Joined</dt><dd>{new Date(user.createdAt).toLocaleDateString()}</dd></div></dl><button type="button" onClick={() => setEditing(true)} className="mt-6 rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white">Edit profile</button></div>;
}
