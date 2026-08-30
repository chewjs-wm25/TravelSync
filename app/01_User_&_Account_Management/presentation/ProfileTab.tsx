"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import type { DashboardUser } from "./DashboardPage";

/**
 * 将图片缩放并压缩至最大 256x256，以防止超大 Base64 导致存储溢出
 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSide = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSide) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          }
        } else {
          if (height > maxSide) {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(e.target?.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(String(e.target?.result));
      img.src = String(e.target?.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfileTab({
  user,
  onSave,
}: {
  user: DashboardUser;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [picture, setPicture] = useState(user.profilePicture ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectPicture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPicture(compressed);
    } catch {
      setError("Failed to read image file.");
    }
  }

  function removePicture() {
    setPicture("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Full name cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        fullName: name.trim(),
        phone: phone.trim() || null,
        profilePicture: picture || null,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={submit} className="max-w-lg space-y-5">
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {/* Profile Picture Upload & Preview */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Profile Photo
          </label>
          <div className="flex items-center gap-4">
            {picture ? (
              <img
                src={picture}
                alt="Profile Preview"
                className="h-16 w-16 rounded-full object-cover border-2 border-slate-200"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-xl font-bold text-teal-800 border-2 border-slate-200">
                {(name || user.fullName).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="space-y-1.5">
              <input
                type="file"
                accept="image/*"
                onChange={selectPicture}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
              />
              {picture && (
                <button
                  type="button"
                  onClick={removePicture}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove picture
                </button>
              )}
            </div>
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Full Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Phone Number <span className="font-normal text-slate-400">(optional)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+60 12-345 6789"
            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(user.fullName);
              setPhone(user.phone ?? "");
              setPicture(user.profilePicture ?? "");
              setError(null);
            }}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4">
        {user.profilePicture ? (
          <img
            src={user.profilePicture}
            alt="Profile"
            className="h-16 w-16 rounded-full object-cover border-2 border-slate-200 shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-xl font-bold text-teal-800 border-2 border-slate-200 shadow-sm">
            {user.fullName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{user.fullName}</h3>
          <p className="text-sm text-slate-500">@{user.username}</p>
        </div>
      </div>

      <dl className="mt-8 divide-y divide-slate-100 text-sm">
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-slate-500">Email Address</dt>
          <dd className="font-medium text-slate-800">{user.email ?? "Not provided"}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-slate-500">Phone Number</dt>
          <dd className="font-medium text-slate-800">{user.phone ?? "Not provided"}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-slate-500">Joined On</dt>
          <dd className="font-medium text-slate-800">
            {new Date(user.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-slate-500">Verification Status</dt>
          <dd>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                user.isVerified
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {user.isVerified ? "Verified" : "Unverified"}
            </span>
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-6 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
      >
        Edit profile
      </button>
    </div>
  );
}
