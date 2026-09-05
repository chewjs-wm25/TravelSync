"use client";

import { FormEvent, useEffect, useState } from "react";

export interface AccountSettings {
  notificationsEnabled: boolean;
  language: "en" | "ms" | "zh";
  theme: "light" | "dark";
  privacyLevel: "private" | "contacts" | "public";
}

const defaultSettings: AccountSettings = {
  notificationsEnabled: true,
  language: "en",
  theme: "light",
  privacyLevel: "private",
};

export default function SettingsTab({
  onSave,
}: {
  onSave: (data: AccountSettings) => Promise<void>;
}) {
  const [settings, setSettings] = useState<AccountSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/01_User_&_Account_Management/account-actions?action=settings")
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { settings?: AccountSettings };
          if (isMounted && data.settings) {
            setSettings({
              notificationsEnabled: Boolean(data.settings.notificationsEnabled),
              language: data.settings.language || "en",
              theme: data.settings.theme || "light",
              privacyLevel: data.settings.privacyLevel || "private",
            });
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await onSave(settings);
      setFeedback({ ok: true, msg: "Settings saved successfully." });
    } catch (err) {
      setFeedback({
        ok: false,
        msg: err instanceof Error ? err.message : "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-lg" />
        <div className="h-10 bg-slate-100 rounded-lg" />
        <div className="h-10 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-6">
      {feedback && (
        <p
          className={`rounded-lg p-3 text-sm font-medium ${
            feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.msg}
        </p>
      )}

      {/* Notifications Switch */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h4 className="text-sm font-medium text-slate-900">Email Notifications</h4>
          <p className="text-xs text-slate-500">
            Receive trip collaboration updates and system alerts via email
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) =>
              setSettings({ ...settings, notificationsEnabled: e.target.checked })
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
        </label>
      </div>

      {/* Language */}
      <label className="block text-sm font-medium text-slate-700">
        Preferred Language
        <select
          value={settings.language}
          onChange={(e) =>
            setSettings({
              ...settings,
              language: e.target.value as AccountSettings["language"],
            })
          }
          className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm bg-white outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        >
          <option value="en">English (US / MY)</option>
          <option value="ms">Bahasa Melayu</option>
          <option value="zh">中文 (Chinese)</option>
        </select>
      </label>

      {/* Theme */}
      <label className="block text-sm font-medium text-slate-700">
        Appearance Theme
        <select
          value={settings.theme}
          onChange={(e) =>
            setSettings({
              ...settings,
              theme: e.target.value as AccountSettings["theme"],
            })
          }
          className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm bg-white outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        >
          <option value="light">Light Mode</option>
          <option value="dark">Dark Mode</option>
        </select>
      </label>

      {/* Privacy Level */}
      <label className="block text-sm font-medium text-slate-700">
        Privacy & Visibility
        <select
          value={settings.privacyLevel}
          onChange={(e) =>
            setSettings({
              ...settings,
              privacyLevel: e.target.value as AccountSettings["privacyLevel"],
            })
          }
          className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-sm bg-white outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        >
          <option value="private">Private (Only you & invited collaborators)</option>
          <option value="contacts">Contacts (Visible to friends & collaborators)</option>
          <option value="public">Public (Visible in discovery explore)</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 active:scale-95 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
