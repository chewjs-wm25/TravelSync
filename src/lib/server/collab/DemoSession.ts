import * as AccountRepo from "@/src/lib/db/repositories/collab/AccountRepo";

/**
 * Demo 会话：前端通过 `x-demo-user-id` 头声明"当前用户"。
 * 未提供时回退到默认 demo 用户 m_marcus。
 * 未来接模块 01 正式会话后，仅需替换此函数内部实现。
 */
export async function resolveDemoUser(
  userId: string | null
): Promise<AccountRepo.AccountRow> {
  const id = userId || "m_marcus";
  const account = await AccountRepo.findAccountById(id);
  if (account) return account;

  const marcus = await AccountRepo.findAccountById("m_marcus");
  if (marcus) return marcus;

  const any = await AccountRepo.findAccountByEmail("marcus@travelsync.com");
  if (any) return any;

  throw new Error("No demo user available. Run schema.sql seed first.");
}

export function extractUserId(req: Request): string | null {
  return req.headers.get("x-demo-user-id");
}