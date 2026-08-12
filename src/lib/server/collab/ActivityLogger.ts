import * as ActivityLogRepo from "@/src/lib/db/repositories/collab/ActivityLogRepo";

/** 服务端动态日志帮手：统一写入 activity_logs */
export async function logActivity(input: {
  trip_id: string;
  user_id: string;
  action: string;
}): Promise<void> {
  await ActivityLogRepo.insertActivity(input);
}