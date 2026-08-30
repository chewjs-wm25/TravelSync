/**
 * SSE (Server-Sent Events) 端点
 * 用于实时协作：成员上下线、评论同步、行程变更通知
 *
 * GET /api/collab/events?userId=xxx&tripId=xxx
 */

import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { extractTripId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const targetTripId = extractTripId(req);

  if (!userId) {
    return new Response("Missing userId parameter", { status: 400 });
  }

  // 创建 SSE 流
  const stream = new ReadableStream({
    start(controller) {
      // 添加监听器
      broadcaster.addListener(userId, targetTripId, controller);

      // 发送初始连接确认
      const connectEvent = JSON.stringify({
        type: "connected",
        userId,
        tripId: targetTripId,
        timestamp: Date.now(),
      });
      controller.enqueue(`data: ${connectEvent}\n\n`);
    },
    cancel() {
      // 连接关闭时移除监听器
      broadcaster.removeListener(userId, targetTripId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
