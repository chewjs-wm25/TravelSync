import * as AccountRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/AccountRepo";
import { getAuthSession } from "@/business_logic_layer/01_User_&_Account_Management/sessionHelper";

/**
 * 解析当前操作用户：
 * 1. 优先使用显式传入的 userId 或 x-demo-user-id
 * 2. 次选从真实 Cookie 会话 (travelsync_session) 中提取用户 ID
 * 3. 兜底回退到默认演示用户 m_marcus
 */
export async function resolveDemoUser(
  userId: string | null,
  req?: Request
): Promise<AccountRepo.AccountRow> {
  let targetId = userId;

  // 若未传入有效 userId 且提供了 req，尝试读取 HttpOnly Cookie 会话
  if ((!targetId || targetId === "undefined" || targetId === "null") && req) {
    try {
      const session = await getAuthSession(req).catch(() => null);
      if (session?.userId) {
        targetId = session.userId;
      }
    } catch {
      // ignore session error
    }
  }

  if (targetId && targetId !== "undefined" && targetId !== "null") {
    const account = await AccountRepo.findAccountById(targetId);
    if (account) return account;
  }

  const marcus = await AccountRepo.findAccountById("m_marcus");
  if (marcus) return marcus;

  const any = await AccountRepo.findAccountByEmail("marcus@travelsync.com");
  if (any) return any;

  throw new Error("No demo user available. Run schema.sql seed first.");
}

export function extractUserId(req: Request): string | null {
  const fromHeader = req.headers.get("x-demo-user-id");
  if (fromHeader && fromHeader !== "undefined" && fromHeader !== "null" && fromHeader.trim() !== "") {
    return fromHeader.trim();
  }

  try {
    const url = new URL(req.url);
    const fromQuery = url.searchParams.get("userId");
    if (fromQuery && fromQuery !== "undefined" && fromQuery !== "null" && fromQuery.trim() !== "") {
      return fromQuery.trim();
    }
  } catch {
    // ignore
  }

  return null;
}