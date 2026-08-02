import { NextResponse } from "next/server";
import process from "node:process";
import { Buffer } from "node:buffer";
import { randomUUID, createHash } from "node:crypto";
import { format } from "node:util";

// 强制动态渲染，避免构建时被静态化（静态化阶段无法访问 worker 运行时）
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 逐项安全探测，workerd 的 nodejs_compat 下部分 Node API 可能缺失
function probe<T>(fn: () => T): T | string {
  try {
    return fn();
  } catch (err) {
    return `ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function GET() {
  const info = {
    // 运行时与版本
    nodeVersion: process.version,
    nodeVersions: probe(() => process.versions),
    platform: process.platform,
    arch: process.arch,
    // Node.js 核心 API 可用性
    bufferBase64: probe(() =>
      Buffer.from("TravelSync Node.js Test").toString("base64")
    ),
    randomUuid: probe(() => randomUUID()),
    sha256Hash: probe(() =>
      createHash("sha256").update("TravelSync").digest("hex")
    ),
    utilFormat: probe(() => format("%s scored %d/100", "TravelSync", 100)),
    cwd: probe(() => process.cwd()),
    memoryUsage: probe(() => process.memoryUsage()),
    uptimeSeconds: probe(() => process.uptime()),
    envNodeEnv: probe(() => process.env.NODE_ENV ?? "n/a"),
  };

  return NextResponse.json({ ok: true, info });
}
