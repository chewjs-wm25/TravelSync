import type { InviteRole } from "@/src/store/collab/CollabStore";

export const INVITE_TTL_DAYS = 30;
export const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Generate a pseudo-random invite token (demo-grade; real backend uses crypto).
 */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface PendingInviteInfo {
  token: string;
  email: string;
  role: InviteRole;
  invitedAt: number;
  expiresAt: number;
}

/** An invite is expired once `expiresAt` passes (30 days after creation). */
export function isInviteExpired(expiresAt: number, now = Date.now()): boolean {
  return now > expiresAt;
}

/** Whole days remaining before the invite expires (0 if already expired). */
export function daysRemaining(expiresAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)));
}

/** Format an ISO-ish timestamp as a short date string. */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-MY", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
