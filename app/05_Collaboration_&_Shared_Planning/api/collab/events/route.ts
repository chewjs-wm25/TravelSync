/**
 * SSE (Server-Sent Events) 端点
 * 用于实时协作：成员上下线、评论同步、行程变更通知
 *
 * GET /api/collab/events?userId=xxx
 * 
 * 连接后会收到以下事件：
 * - member_joined: 新成员加入
 * - member_left: 成员退出
 * - role_changed: 角色变更
 * - comment_added: 新评论
 * - item_added: 新增行程项
 * - item_removed: 删除行程项
 * - invite_created: 新邀请
 * - invite_cancelled: 取消邀请
 * - heartbeat: 心跳保活（30秒）
 */

import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { ACTIVE_TRIP_ID } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return new Response("Missing userId parameter", { status: 400 });
  }

  // 创建 SSE 流
  const stream = new ReadableStream({
    start(controller) {
      // 添加监听器
      broadcaster.addListener(userId, ACTIVE_TRIP_ID, controller);

      // 发送初始连接确认
      const connectEvent = JSON.stringify({
        type: "connected",
        userId,
        tripId: ACTIVE_TRIP_ID,
        timestamp: Date.now(),
      });
      controller.enqueue(`data: ${connectEvent}\n\n`);
    },
    cancel() {
      // 连接关闭时移除监听器
      broadcaster.removeListener(userId, ACTIVE_TRIP_ID);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // 禁用 nginx 缓冲
    },
  });
}
