"use client";
/**
 * syncQualityRatings.tsx — DEV 页面按钮（Presentation Layer）
 *
 * 职责（单一）：触发"官方品质评级同步"（hardcode JSON → Nominatim 补全 → D1），
 *              仅调用 Business Logic Layer 的 qualityRatingSyncService 并展示结果统计，
 *              不含任何业务/数据逻辑。
 *
 * 增强能力（DEV 工具体验）：
 *  1. 超时警告：运行超过 WARN_AFTER_MS 后显示黄色警告（不中断进程），并周期性在
 *     终端（浏览器 Console）提醒，配合进度 X/total 判断是否卡死；
 *  2. 终端错误打印：启动/完成/异常/超时均打印 console 日志；无法为某地点获取
 *     地点信息时，逐条明细（公司名/地址/原因）打印到 Console 并可在界面展开查看；
 *  3. 运行中检测防重复：localStorage 运行标记 + storage 事件联动（useSyncExternalStore），
 *     覆盖"同一页面重复点击、页面刷新、多标签页"场景——检测到同步进程在运行时
 *     按钮禁用，避免大量相同进程被反复触发；残留标记由 RUNNING_STALE_MS 过期兜底，
 *     并提供"强制解除"按钮供用户自愈。
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  qualityRatingSyncService,
  type QualityRatingSyncResult,
} from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/QualityRatingSyncService";

/** localStorage 运行标记键（跨刷新、跨标签页共享） */
const RUNNING_KEY = "travelsync:quality-rating-sync:running";
/** 运行标记过期阈值：超过视为残留（页面崩溃/强制关闭），自动清除并允许重新开始 */
const RUNNING_STALE_MS = 10 * 60 * 1000;
/** 超时警告阈值：129 条 × Nominatim 1 请求/秒限速 ≈ 2~4 分钟，超过预期即提醒 */
const WARN_AFTER_MS = 2 * 60 * 1000;
/** 超时后周期性重复提醒的间隔 */
const WARN_REPEAT_MS = 60 * 1000;
/** 超时计时器检查间隔 */
const TIMER_INTERVAL_MS = 10 * 1000;

/** 运行标记值形态 */
interface RunningMark {
  sessionId: string;
  startedAt: number;
}

/** 读取并解析运行标记；未过期返回解析值，否则返回 null（残留由调用方清除） */
function readRunningMark(): RunningMark | null {
  try {
    const raw = localStorage.getItem(RUNNING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RunningMark>;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.startedAt !== "number" ||
      Date.now() - parsed.startedAt >= RUNNING_STALE_MS
    ) {
      return null;
    }
    return parsed as RunningMark;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 运行标记外部 store（useSyncExternalStore）
//   - getSnapshot：布尔值稳定（无缓存问题），同步读 localStorage；
//   - subscribe：storage 事件 → 其他标签页写入/移除标记时本页实时联动；
//   - getServerSnapshot：SSR 阶段恒为 false（无 localStorage），hydrate 后
//     React 会自动用客户端快照重渲染，无 hydration mismatch。
// ---------------------------------------------------------------------------

function subscribeRunningMark(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getRunningMarkSnapshot(): boolean {
  return readRunningMark() !== null;
}

function getRunningMarkServerSnapshot(): boolean {
  return false;
}

export default function SyncQualityRatingsBTN() {
  const [isSyncing, setIsSyncing] = useState(false);
  /** 是否有其他同步进程在运行（其他标签页/上次刷新残留） */
  const isRunningElsewhere = useSyncExternalStore(
    subscribeRunningMark,
    getRunningMarkSnapshot,
    getRunningMarkServerSnapshot
  );
  /** 强制解除后触发的重渲染计数（同页清除标记不触发 storage 事件，需手动刷新快照） */
  const [, setUnlockTick] = useState(0);
  const [result, setResult] = useState<QualityRatingSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number | null>(null);
  /** 进度（done/total），null = 尚未开始 */
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  /** 是否已触发超时警告 */
  const [timedOut, setTimedOut] = useState(false);
  /** 当前已运行秒数（超时警告条展示用） */
  const [runSeconds, setRunSeconds] = useState(0);

  /** 镜像 isSyncing，供卸载清理时读取最新值 */
  const isSyncingRef = useRef(false);
  /** 本次同步的会话 id（写标记/删标记时校验，避免误删其他标签页或新进程的标记） */
  const sessionIdRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 生成会话 id（安全上下文下用 crypto.randomUUID，否则降级） */
  const newSessionId = (): string =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  /** 写入运行标记（其他标签页会经 storage 事件收到通知） */
  const setRunningMark = (mark: RunningMark): void => {
    try {
      localStorage.setItem(RUNNING_KEY, JSON.stringify(mark));
    } catch {
      // localStorage 不可用（隐私模式等）：仅本页内防重仍由 isSyncing 兜底
    }
  };

  /** 仅当标记属于本页会话时移除（不误删其他标签页/新进程的标记） */
  const clearOwnRunningMark = (): void => {
    try {
      const raw = localStorage.getItem(RUNNING_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<RunningMark>;
      if (parsed.sessionId === sessionIdRef.current) {
        localStorage.removeItem(RUNNING_KEY);
      }
    } catch {
      // 解析失败视为脏数据，直接清除
      try {
        localStorage.removeItem(RUNNING_KEY);
      } catch {
        /* ignore */
      }
    }
  };

  /** 清除过期/脏残留标记（挂载时执行一次；过期时按钮本就可用，此处仅清理存储） */
  const cleanupStaleMark = (): void => {
    try {
      const raw = localStorage.getItem(RUNNING_KEY);
      if (!raw) return;
      // 标记存在但已过期或无法解析 → 残留，移除
      if (readRunningMark() === null) {
        localStorage.removeItem(RUNNING_KEY);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    cleanupStaleMark();
    return () => {
      // 卸载清理：停止计时器；仅当本页自己正在同步时移除标记，
      // 避免误删其他标签页正在运行的进程标记
      if (timerRef.current) clearInterval(timerRef.current);
      if (isSyncingRef.current) clearOwnRunningMark();
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing || isRunningElsewhere) return;
    setIsSyncing(true);
    isSyncingRef.current = true;
    setResult(null);
    setError(null);
    setProgress(null);
    setTimedOut(false);
    setRunSeconds(0);
    setElapsedSec(null);

    // 写入运行标记（跨刷新/跨标签页防重）；同时开始超时计时
    sessionIdRef.current = newSessionId();
    setRunningMark({ sessionId: sessionIdRef.current, startedAt: Date.now() });
    const start = Date.now();
    let lastWarnAt = 0;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setRunSeconds(Math.floor(elapsed / 1000));
      if (elapsed >= WARN_AFTER_MS && elapsed - lastWarnAt >= WARN_REPEAT_MS) {
        lastWarnAt = elapsed;
        setTimedOut(true);
        console.warn(
          `[SyncQualityRatings] still running after ${Math.floor(elapsed / 1000)}s — Nominatim rate-limits to 1 request/s (129 items ≈ 2-4 min), please wait.`
        );
      }
    }, TIMER_INTERVAL_MS);

    console.info("[SyncQualityRatings] sync started…");
    try {
      const res = await qualityRatingSyncService.syncQualityRatings(
        (done, total) => setProgress({ done, total })
      );
      setResult(res);
      console.info("[SyncQualityRatings] sync finished:", {
        synced: res.synced,
        total: res.total,
        newlyGeocoded: res.newlyGeocoded,
        failed: res.failed,
      });
      if (res.failures.length > 0) {
        // 终端打印：哪些地点无法获取到地点信息（完整明细，Console 中可展开）
        console.warn(
          `[SyncQualityRatings] ${res.failures.length} location(s) could not be geocoded (see details below):`,
          res.failures
        );
      }
    } catch (err) {
      // 终端打印：同步整体异常（含 BLL 并发防重抛错）
      console.error(
        "[SyncQualityRatings] sync failed:",
        err instanceof Error ? err.message : err
      );
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      clearOwnRunningMark();
      setElapsedSec((Date.now() - start) / 1000);
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  };

  /** 强制解除：清除残留运行标记并恢复按钮（不自动启动同步） */
  const forceUnlock = () => {
    try {
      localStorage.removeItem(RUNNING_KEY);
    } catch {
      /* ignore */
    }
    // 同页清除标记不触发 storage 事件，手动 tick 触发重渲染刷新快照
    setUnlockTick((t) => t + 1);
    console.info("[SyncQualityRatings] running mark cleared (manual unlock).");
  };

  const disabled = isSyncing || isRunningElsewhere;

  return (
    <div className="space-y-2">
      <button
        onClick={handleSync}
        disabled={disabled}
        className="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSyncing
          ? "Syncing…"
          : isRunningElsewhere
            ? "Sync in progress (refreshed / another tab)"
            : "Sync Quality Ratings"}
      </button>

      {/* 进度（支撑超时判断） */}
      {isSyncing && progress && (
        <p className="text-sm text-gray-500">
          Processing {progress.done}/{progress.total}…
        </p>
      )}

      {/* 超时警告：不中断进程，仅提醒 */}
      {isSyncing && timedOut && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠ Sync has been running for {runSeconds}s and is still not finished.
          Nominatim rate-limits to 1 request/s (129 items ≈ 2-4 min) — please be
          patient, do NOT click again. If it hangs for long, check the network
          status in the Console.
        </p>
      )}

      {/* 运行中检测：其他进程在跑（刷新残留/其他标签页）时禁用按钮并说明 */}
      {isRunningElsewhere && !isSyncing && (
        <p className="text-sm text-gray-500">
          A Quality Ratings sync is already running (this tab was refreshed, or
          another tab is syncing). The button is disabled to avoid duplicate
          processes.
          <button
            onClick={forceUnlock}
            className="ml-2 text-primary-600 underline hover:opacity-80"
          >
            Force unlock
          </button>
        </p>
      )}

      {result && (
        <p className="text-sm text-gray-700">
          Synced {result.synced}/{result.total} · newly geocoded{" "}
          {result.newlyGeocoded} · skipped {result.failed} · took{" "}
          {elapsedSec?.toFixed(1)}s
        </p>
      )}

      {/* 失败地点明细（折叠展示前 10 条，完整明细见终端 Console） */}
      {result && result.failures.length > 0 && (
        <details className="text-sm text-amber-700">
          <summary>
            {result.failures.length} location(s) failed to geocode — see
            Console for full details
          </summary>
          <ul className="mt-1 list-disc pl-5">
            {result.failures.slice(0, 10).map((f) => (
              <li key={f.jsonId}>
                <span className="font-medium">{f.companyName}</span> —{" "}
                {f.companyAddress}: <span className="italic">{f.reason}</span>
              </li>
            ))}
            {result.failures.length > 10 && (
              <li>… and {result.failures.length - 10} more (see Console)</li>
            )}
          </ul>
        </details>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
