import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 与根目录 schema.sql 保持一致；CREATE TABLE IF NOT EXISTS 幂等，
// 保证本地 dev（wrangler getPlatformProxy）与云端首次运行时表一定存在。
const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

type MessageRow = {
  id: number;
  content: string;
  created_at: string;
};

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.TEST_DB;

    await db.prepare(CREATE_TABLE_SQL).run();
    const { results } = await db
      .prepare(
        "SELECT id, content, created_at FROM messages ORDER BY id DESC LIMIT 20"
      )
      .all<MessageRow>();

    return NextResponse.json({ ok: true, messages: results });
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
      content?: unknown;
    } | null;
    const content =
      typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { ok: false, error: "`content` is required (non-empty string)" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.TEST_DB;

    await db.prepare(CREATE_TABLE_SQL).run();
    const { meta } = await db
      .prepare("INSERT INTO messages (content) VALUES (?)")
      .bind(content)
      .run();

    const { results } = await db
      .prepare(
        "SELECT id, content, created_at FROM messages WHERE id = ?"
      )
      .bind(meta.last_row_id)
      .all<MessageRow>();

    return NextResponse.json({ ok: true, message: results[0] ?? null });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
