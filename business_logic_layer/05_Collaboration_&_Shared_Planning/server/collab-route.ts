/** 默认行程（多 Tab 场景下由 ?tripId 覆盖） */
export const DEFAULT_TRIP_ID = "trip_langkawi";
/** 兼容旧引用 */
export const ACTIVE_TRIP_ID = DEFAULT_TRIP_ID;

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function error(message: string, status = 400): Response {
  return json({ success: false, message }, status);
}

/** 从请求 URL 参数、Body 或 Header 提取动态 tripId */
export function extractTripId(req: Request, body?: { tripId?: string; trip_id?: string }): string {
  if (body?.tripId?.trim()) return body.tripId.trim();
  if (body?.trip_id?.trim()) return body.trip_id.trim();
  try {
    const url = new URL(req.url);
    const fromQuery = url.searchParams.get("tripId") || url.searchParams.get("trip");
    if (fromQuery?.trim()) return fromQuery.trim();
  } catch {
    // ignore
  }
  const fromHeader = req.headers.get("x-trip-id");
  if (fromHeader?.trim()) return fromHeader.trim();
  return DEFAULT_TRIP_ID;
}