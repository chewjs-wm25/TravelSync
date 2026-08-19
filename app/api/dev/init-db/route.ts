import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";
import fs from "fs/promises";

export async function GET() {
  try {
    const schemaPath = `${process.cwd()}/schema.sql`;
    const sql = await fs.readFile(schemaPath, "utf-8");
    const { env } = await getCloudflareContext({ async: true });
    const db: any = env.TEST_DB;
    if (!db) return new Response(JSON.stringify({ ok: false, message: "TEST_DB binding not found" }), { status: 500 });
    // Execute all statements in schema.sql
    if (typeof db.batch === "function") {
      // Some D1 implementations expect an array of statements
      const statements = sql
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        await db.prepare(stmt).run();
      }
    } else if (typeof db.exec === "function") {
      await db.exec(sql);
    } else {
      return new Response(JSON.stringify({ ok: false, message: "D1 binding does not support batch/exec" }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true, message: "DB initialized" }));
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
}
