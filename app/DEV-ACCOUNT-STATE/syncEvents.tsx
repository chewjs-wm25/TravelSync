"use client";
/**
 * syncEvents.tsx — DEV 页面按钮（Presentation Layer）
 *
 * 职责（单一）：触发"节日/活动同步"（parsed_events.json → D1），
 *              仅调用 Business Logic Layer 的 eventSyncService 并展示结果统计，
 *              不含任何业务/数据逻辑。
 */

import { useState } from "react";
import {
  eventSyncService,
  type EventSyncResult,
} from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/EventSyncService";

export default function SyncEventsBTN() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<EventSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number | null>(null);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setResult(null);
    setError(null);
    const start = Date.now();
    try {
      const res = await eventSyncService.syncEvents();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setElapsedSec((Date.now() - start) / 1000);
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSyncing ? "Syncing…" : "Sync Events"}
      </button>
      {result && (
        <p className="text-sm text-gray-700">
          Synced {result.synced}/{result.total} · failed {result.failed} · took{" "}
          {elapsedSec?.toFixed(1)}s
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
