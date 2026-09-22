import type { CollabTrip } from "@/api_layer/05_Collaboration_&_Shared_Planning/types";

const DAY = 86400000;

function chatTime(fromNowMs: number): string {
  return new Date(Date.now() - fromNowMs).toISOString();
}

/**
 * 本地 D1 不可用（全新电脑未初始化 / 初始化失败）时的前端兜底数据。
 * 数据与 schema.sql seed 一致，形状对齐 API 的 ReplyMapper 输出，
 * 保证页面在任何情况下都能渲染出完整 UI（非阻塞提示由 store 的 error 字段承载）。
 */
export function buildFallbackTrip(meUserId: string): CollabTrip {
  return {
    tripId: "trip_langkawi",
    tripName: "Langkawi Island Escape",
    startDate: "2026-12-20",
    endDate: "2026-12-27",
    region: "Langkawi, Kedah, Malaysia",
    members: [
      {
        id: "dev-user-001",
        name: "Flandre Scarlet",
        email: "flandre@travelsync.com",
        role: "Owner",
        avatar: "/images.jpg",
        online: true,
      },
      {
        id: "m_marcus",
        name: "Marcus Chen",
        email: "marcus@travelsync.com",
        role: "Editor",
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
        online: true,
      },
    ],
    invites: [
      {
        id: "inv_seed",
        token: "seed-token-langkawi",
        email: "sam.lee@outlook.com",
        role: "Viewer",
        status: "pending",
        invitedAt: Date.now() - 5 * DAY,
        expiresAt: Date.now() + 25 * DAY,
        invitedBy: "Flandre Scarlet",
      },
    ],
    items: [
      { itemId: "it_1", day: 1, name: "Arrive Langkawi, check in at Cenang", note: "SkyCab cable car" },
      { itemId: "it_2", day: 1, name: "Sunset dinner at Pantai Cenang" },
      { itemId: "it_3", day: 2, name: "Island hopping (Pulau Dayang Bunting)", note: "Bring sunscreen" },
      { itemId: "it_4", day: 2, name: "Kilim Karst Geoforest mangrove tour" },
      { itemId: "it_5", day: 3, name: "Underwater World Langkawi" },
    ],
    comments: [
      {
        id: "1",
        authorId: "m_marcus",
        authorName: "Marcus Chen",
        avatar: "/images/collab/avatar-marcus.png",
        time: chatTime(30 * 60000),
        text: "I've updated the cable car timing for Day 1.",
        own: meUserId === "m_marcus",
      },
      {
        id: "2",
        authorId: "m_elena",
        authorName: "Elena Rodriguez",
        avatar: "/images/collab/avatar-elena.png",
        time: chatTime(27 * 60000),
        text: "Perfect! Just checked the PDF export.",
        own: meUserId === "m_elena",
      },
    ],
    activity: [
      {
        id: "1",
        actor: "Flandre Scarlet",
        action: "created the trip",
        at: Date.now() - 6 * DAY,
      },
      {
        id: "2",
        actor: "Flandre Scarlet",
        action: "invited sam.lee@outlook.com as Viewer",
        at: Date.now() - 5 * DAY,
      },
    ],
  };
}
