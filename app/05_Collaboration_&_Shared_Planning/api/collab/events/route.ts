/**
 * SSE (Server-Sent Events) 端点
 * 用于实时协作：成员上下线、评论同步、行程变更通知
 *
 * GET /api/collab/events?userId=xxx&tripId=xxx
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  const body = encoder.encode(": SSE disabled in serverless environment\n\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "close",
    },
  });
}
