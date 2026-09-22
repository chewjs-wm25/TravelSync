import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";

export const INVITE_TTL_DAYS = 30;
export const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;

/** 生成安全随机 token（Web Crypto，可在 Workers 环境运行） */
export async function generateToken(): Promise<string> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function createInvite(input: {
  trip_id: string;
  sender_id: string;
  receiver_email: string;
  role: InviteRepo.InviteRoleDB;
  receiver_user_id?: string | null;
}): Promise<InviteRepo.InviteRow> {
  const token = await generateToken();
  const expires_at = isoDaysFromNow(INVITE_TTL_DAYS);
  return InviteRepo.insertInvite({
    Token: token,
    receiver_email: input.receiver_email.trim().toLowerCase(),
    role: input.role,
    expires_at,
    trip_id: input.trip_id,
    sender_id: input.sender_id,
    receiver_user_id: input.receiver_user_id ?? null,
  });
}