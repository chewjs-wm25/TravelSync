"use client";
/**
 * syncQualityRatings.tsx — DEV 页面按钮（Presentation Layer）
 *
 * 职责（单一）：触发"官方品质评级同步"（hardcode JSON → Geoapify 补全 → D1），
 *              仅调用 Business Logic Layer 的 qualityRatingSyncService 并展示结果统计，
 *              不含任何业务/数据逻辑。
 */

import { useState } from "react";
import {
  qualityRatingSyncService,
  type QualityRatingSyncResult,
} from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/QualityRatingSyncService";

export default function SyncQualityRatingsBTN() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<QualityRatingSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number | null>(null);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setResult(null);
    setError(null);
    const start = Date.now();
    try {
      const res = await qualityRatingSyncService.syncQualityRatings();
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
        {isSyncing ? "Syncing…" : "Sync Quality Ratings"}
      </button>
      {result && (
        <p className="text-sm text-gray-700">
          Synced {result.synced}/{result.total} · newly geocoded{" "}
          {result.newlyGeocoded} · skipped {result.failed} · took{" "}
          {elapsedSec?.toFixed(1)}s
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
