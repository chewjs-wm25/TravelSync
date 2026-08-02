import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_KEY = "test-key";

export async function GET(request: NextRequest) {
  try {
    const key =
      request.nextUrl.searchParams.get("key")?.trim() || DEFAULT_KEY;

    const { env } = await getCloudflareContext({ async: true });
    const kv = env.TEST_KV;

    const value = await kv.get(key);

    return NextResponse.json({ ok: true, key, value });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      key?: unknown;
      value?: unknown;
    } | null;
    const key = typeof body?.key === "string" ? body.key.trim() : "";
    const value =
      typeof body?.value === "string" ? body.value : "";

    if (!key || !value) {
      return NextResponse.json(
        { ok: false, error: "Both `key` and `value` are required" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext({ async: true });
    const kv = env.TEST_KV;

    await kv.put(key, value);

    return NextResponse.json({ ok: true, key, value });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const key =
      request.nextUrl.searchParams.get("key")?.trim() || DEFAULT_KEY;

    const { env } = await getCloudflareContext({ async: true });
    const kv = env.TEST_KV;

    await kv.delete(key);

    return NextResponse.json({ ok: true, key, deleted: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
