"use client";

import { FormEvent, useState } from "react";

export interface AccountSettings { notificationsEnabled: boolean; language: "en" | "ms" | "zh"; theme: "light" | "dark"; privacyLevel: "private" | "contacts" | "public" }

export default function SettingsTab({ onSave }: { onSave: (data: AccountSettings) => Promise<void> }) {
  const [settings, setSettings] = useState<AccountSettings>({ notificationsEnabled: true, language: "en", theme: "light", privacyLevel: "private" });
  async function submit(event: FormEvent) { event.preventDefault(); await onSave(settings); }
  return <form onSubmit={submit} className="max-w-lg space-y-5"><label className="flex items-center justify-between border-b pb-4 text-sm font-medium text-slate-700">Notifications<input type="checkbox" checked={settings.notificationsEnabled} onChange={(event) => setSettings({ ...settings, notificationsEnabled: event.target.checked })} /></label><label className="block text-sm font-medium text-slate-700">Language<select value={settings.language} onChange={(event) => setSettings({ ...settings, language: event.target.value as AccountSettings["language"] })} className="mt-1 w-full rounded-lg border p-2.5"><option value="en">English</option><option value="ms">Bahasa Melayu</option><option value="zh">Chinese</option></select></label><label className="block text-sm font-medium text-slate-700">Theme<select value={settings.theme} onChange={(event) => setSettings({ ...settings, theme: event.target.value as AccountSettings["theme"] })} className="mt-1 w-full rounded-lg border p-2.5"><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="block text-sm font-medium text-slate-700">Privacy level<select value={settings.privacyLevel} onChange={(event) => setSettings({ ...settings, privacyLevel: event.target.value as AccountSettings["privacyLevel"] })} className="mt-1 w-full rounded-lg border p-2.5"><option value="private">Private</option><option value="contacts">Contacts</option><option value="public">Public</option></select></label><button className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white">Save settings</button></form>;
}
