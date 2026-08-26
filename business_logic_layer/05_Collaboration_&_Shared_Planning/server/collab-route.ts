/** 当前 demo 固定行程（后续接入模块 02 后改为动态读取） */
export const ACTIVE_TRIP_ID = "trip_langkawi";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function error(message: string, status = 400): Response {
  return json({ success: false, message }, status);
}