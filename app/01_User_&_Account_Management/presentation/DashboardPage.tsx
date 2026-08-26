"use client";

import { useState } from "react";
import ProfileTab from "./ProfileTab";
import SecurityTab from "./SecurityTab";
import SettingsTab, { AccountSettings } from "./SettingsTab";
import DeleteAccountTab from "./DeleteAccountTab";

export interface DashboardUser {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  profilePicture: string | null;
  createdAt: string;
  isVerified: boolean;
}

export type AccountAction = (action: string, data?: Record<string, unknown>) => Promise<{ success: boolean; user?: DashboardUser; message?: string }>;

type Tab = "profile" | "security" | "settings" | "delete";

export default function DashboardPage({ user, request, onUserChange, onLogout }: { user: DashboardUser; request: AccountAction; onUserChange: (user: DashboardUser) => void; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("profile");
  const [message, setMessage] = useState("");
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
    { id: "settings", label: "Settings" },
    { id: "delete", label: "Delete account" },
  ];

  async function run(action: string, data?: Record<string, unknown>) {
    const result = await request(action, data);
    if (result.user) onUserChange(result.user);
    setMessage(result.message ?? "Saved successfully.");
  }

  return <main className="mx-auto w-full max-w-5xl px-4 py-10"><div className="flex flex-col gap-8 md:flex-row"><aside className="md:w-56"><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Account</p><h1 className="mt-2 text-2xl font-semibold text-slate-900">Settings</h1><nav className="mt-8 space-y-2">{tabs.map((item) => <button key={item.id} type="button" onClick={() => { setTab(item.id); setMessage(""); }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${tab === item.id ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-600 hover:bg-slate-50"}`}>{item.label}</button>)}</nav><button type="button" onClick={onLogout} className="mt-8 text-sm font-medium text-red-700 hover:underline">Sign out</button></aside><section className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-500">@{user.username}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{tabs.find((item) => item.id === tab)?.label}</h2></div>{message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}</div><div className="mt-6">{tab === "profile" && <ProfileTab user={user} onSave={(data) => run("profile", data)} />}{tab === "security" && <SecurityTab onSave={(data) => run("password", data)} />}{tab === "settings" && <SettingsTab onSave={(data) => run("settings", data as unknown as Record<string, unknown>)} />}{tab === "delete" && <DeleteAccountTab onDelete={(password) => run("delete-account", { password }).then(onLogout)} />}</div></section></div></main>;
}
