import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CollabRole } from "@/src/lib/client/collab/RolePermissions";
import {
  INVITE_TTL_MS,
  generateInviteToken,
  isInviteExpired,
} from "@/src/lib/client/collab/InvitationService";

export type InviteRole = "Editor" | "Viewer";
export type InviteStatus = "pending" | "accepted" | "rejected" | "expired";

export interface CollabMember {
  id: string;
  name: string;
  email: string;
  role: CollabRole;
  avatar: string;
  online: boolean;
}

export interface CollabInvite {
  id: string;
  token: string;
  email: string;
  role: InviteRole;
  status: InviteStatus;
  invitedAt: number;
  expiresAt: number;
  invitedBy: string;
}

export interface ItineraryItem {
  id: string;
  day: number;
  title: string;
  note?: string;
}

export interface CollabComment {
  id: string;
  authorId: string;
  authorName: string;
  avatar: string;
  time: string;
  text: string;
  own: boolean;
}

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  at: number;
}

export interface CollabTrip {
  id: string;
  name: string;
  dates: string;
  region: string;
  members: CollabMember[];
  invites: CollabInvite[];
  items: ItineraryItem[];
  comments: CollabComment[];
  activity: ActivityEntry[];
}

export type InviteResult = { ok: boolean; message?: string; invite?: CollabInvite };

let seq = 0;
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}_${Math.random().toString(36).slice(2, 8)}`;
}

function seedTrip(): CollabTrip {
  const now = Date.now();
  return {
    id: "trip_langkawi",
    name: "Langkawi Island Escape",
    dates: "Dec 20-27, 2026",
    region: "Langkawi, Kedah, Malaysia",
    members: [
      {
        id: "m_marcus",
        name: "Marcus Chen",
        email: "marcus@travelsync.com",
        role: "Owner",
        avatar: "/images/collab/avatar-marcus.png",
        online: true,
      },
      {
        id: "m_elena",
        name: "Elena Rodriguez",
        email: "elena.r@globetrot.co",
        role: "Editor",
        avatar: "/images/collab/avatar-elena.png",
        online: true,
      },
      {
        id: "m_jordan",
        name: "Jordan Smyth",
        email: "jsmyth.finance@org.com",
        role: "Viewer",
        avatar: "/images/collab/avatar-jordan.png",
        online: false,
      },
    ],
    invites: [
      {
        id: uid("inv"),
        token: generateInviteToken(),
        email: "sam.lee@outlook.com",
        role: "Viewer",
        status: "pending",
        invitedAt: now - 5 * 24 * 60 * 60 * 1000,
        expiresAt: now + INVITE_TTL_MS - 5 * 24 * 60 * 60 * 1000,
        invitedBy: "Marcus Chen",
      },
    ],
    items: [
      { id: uid("it"), day: 1, title: "Arrive Langkawi, check in at Cenang", note: "SkyCab cable car" },
      { id: uid("it"), day: 1, title: "Sunset dinner at Pantai Cenang" },
      { id: uid("it"), day: 2, title: "Island hopping (Pulau Dayang Bunting)", note: "Bring sunscreen" },
      { id: uid("it"), day: 2, title: "Kilim Karst Geoforest mangrove tour" },
      { id: uid("it"), day: 3, title: "Underwater World Langkawi" },
    ],
    comments: [
      {
        id: uid("c"),
        authorId: "m_marcus",
        authorName: "Marcus",
        avatar: "/images/collab/comment-marcus.png",
        time: "10:42 AM",
        text: "I've updated the cable car timing for Day 1.",
        own: false,
      },
      {
        id: uid("c"),
        authorId: "m_elena",
        authorName: "Elena",
        avatar: "/images/collab/comment-elena.png",
        time: "10:45 AM",
        text: "Perfect! Just checked the PDF export.",
        own: false,
      },
    ],
    activity: [
      { id: uid("a"), actor: "Marcus Chen", action: "created the trip", at: now - 6 * 24 * 60 * 60 * 1000 },
      { id: uid("a"), actor: "Marcus Chen", action: "invited sam.lee@outlook.com as Viewer", at: now - 5 * 24 * 60 * 60 * 1000 },
    ],
  };
}

interface CollabState {
  currentUserId: string;
  activeTripId: string;
  trips: CollabTrip[];

  setCurrentUser: (id: string) => void;
  setActiveTrip: (id: string) => void;

  inviteCollaborator: (email: string, role: InviteRole) => InviteResult;
  cancelInvite: (inviteId: string) => void;
  acceptInvite: (inviteId: string) => void;
  rejectInvite: (inviteId: string) => void;
  expirePendingInvites: () => void;

  changeRole: (memberId: string, role: Exclude<CollabRole, "Owner">) => void;
  removeMember: (memberId: string) => void;
  leaveTrip: () => void;

  addItem: (day: number, title: string, note?: string) => void;
  removeItem: (itemId: string) => void;
  addComment: (text: string) => void;
}

export const useCollabStore = create<CollabState>()(
  persist(
    (set, get) => {
      const trip = () => get().trips.find((t) => t.id === get().activeTripId) ?? get().trips[0];
      const me = () => trip()?.members.find((m) => m.id === get().currentUserId);

      const log = (actor: string, action: string) =>
        set((state) => ({
          trips: state.trips.map((t) =>
            t.id === state.activeTripId
              ? { ...t, activity: [{ id: uid("a"), actor, action, at: Date.now() }, ...t.activity] }
              : t
          ),
        }));

      return {
        currentUserId: "m_marcus",
        activeTripId: "trip_langkawi",
        trips: [seedTrip()],

        setCurrentUser: (id) => set({ currentUserId: id }),
        setActiveTrip: (id) => set({ activeTripId: id }),

        inviteCollaborator: (email, role) => {
          const normalized = email.trim().toLowerCase();
          if (!normalized) return { ok: false, message: "Email is required." };
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
            return { ok: false, message: "Please enter a valid email address." };
          }
          const now = Date.now();
          const invite: CollabInvite = {
            id: uid("inv"),
            token: generateInviteToken(),
            email: normalized,
            role,
            status: "pending",
            invitedAt: now,
            expiresAt: now + INVITE_TTL_MS,
            invitedBy: me()?.name ?? "Owner",
          };
          set((state) => ({
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId ? { ...tr, invites: [...tr.invites, invite] } : tr
            ),
          }));
          log(invite.invitedBy, `invited ${normalized} as ${role}`);
          return { ok: true, message: `Invitation sent to ${normalized} as ${role}.`, invite };
        },

        cancelInvite: (inviteId) => {
          const t = trip();
          const target = t?.invites.find((i) => i.id === inviteId);
          if (!target) return;
          set((state) => ({
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId
                ? { ...tr, invites: tr.invites.filter((i) => i.id !== inviteId) }
                : tr
            ),
          }));
          log(me()?.name ?? "Someone", `cancelled the invite to ${target.email}`);
        },

        acceptInvite: (inviteId) => {
          const t = trip();
          const target = t?.invites.find((i) => i.id === inviteId);
          if (!target || target.status !== "pending") return;
          const member: CollabMember = {
            id: uid("m"),
            name: displayNameFromEmail(target.email),
            email: target.email,
            role: target.role,
            avatar: "",
            online: true,
          };
          set((state) => ({
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId
                ? {
                    ...tr,
                    members: [...tr.members, member],
                    invites: tr.invites.map((i) =>
                      i.id === inviteId ? { ...i, status: "accepted" } : i
                    ),
                  }
                : tr
            ),
          }));
          log(member.name, `accepted the invite as ${target.role}`);
        },

        rejectInvite: (inviteId) => {
          const t = trip();
          const target = t?.invites.find((i) => i.id === inviteId);
          if (!target) return;
          set((state) => ({
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId
                ? {
                    ...tr,
                    invites: tr.invites.map((i) =>
                      i.id === inviteId ? { ...i, status: "rejected" } : i
                    ),
                  }
                : tr
            ),
          }));
          log(target.email, `declined the invite to join as ${target.role}`);
        },

        expirePendingInvites: () => {
          set((state) => ({
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId
                ? {
                    ...tr,
                    invites: tr.invites.map((i) =>
                      i.status === "pending" && isInviteExpired(i.expiresAt)
                        ? { ...i, status: "expired" }
                        : i
                    ),
                  }
                : tr
            ),
          }));
        },

        changeRole: (memberId, role) => {
          const t = trip();
          const target = t?.members.find((m) => m.id === memberId);
          if (!target || target.role === "Owner") return;
          set((state) => ({
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId
                ? {
                    ...tr,
                    members: tr.members.map((m) =>
                      m.id === memberId ? { ...m, role } : m
                    ),
                  }
                : tr
            ),
          }));
          log(me()?.name ?? "Someone", `changed ${target.name}'s role to ${role}`);
        },

        removeMember: (memberId) => {
          const t = trip();
          const target = t?.members.find((m) => m.id === memberId);
          if (!target || target.role === "Owner") return;
          set((state) => ({
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId
                ? { ...tr, members: tr.members.filter((m) => m.id !== memberId) }
                : tr
            ),
          }));
          log(me()?.name ?? "Someone", `removed ${target.name} from the trip`);
        },

        leaveTrip: () => {
          const self = me();
          if (!self || self.role === "Owner") return;
          set((state) => ({
            currentUserId:
              state.currentUserId === self.id ? "m_marcus" : state.currentUserId,
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId
                ? { ...tr, members: tr.members.filter((m) => m.id !== self.id) }
                : tr
            ),
          }));
          log(self.name, "left the trip");
        },

        addItem: (day, title, note) => {
          const actor = me()?.name ?? "Someone";
          set((state) => ({
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId
                ? { ...tr, items: [...tr.items, { id: uid("it"), day, title, note }] }
                : tr
            ),
          }));
          log(actor, `added "${title}" to Day ${day}`);
        },

        removeItem: (itemId) => {
          const target = trip()?.items.find((i) => i.id === itemId);
          set((state) => ({
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId
                ? { ...tr, items: tr.items.filter((i) => i.id !== itemId) }
                : tr
            ),
          }));
          log(me()?.name ?? "Someone", `removed "${target?.title ?? "item"}" from the itinerary`);
        },

        addComment: (text) => {
          const self = me();
          if (!self) return;
          set((state) => ({
            trips: state.trips.map((tr) =>
              tr.id === state.activeTripId
                ? {
                    ...tr,
                    comments: [
                      ...tr.comments,
                      {
                        id: uid("c"),
                        authorId: self.id,
                        authorName: self.name.split(" ")[0],
                        avatar: self.avatar || "",
                        time: new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                        text,
                        own: true,
                      },
                    ],
                  }
                : tr
            ),
          }));
        },
      };
    },
    {
      name: "travelsync-collab-storage",
      version: 1,
    }
  )
);

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0];
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
