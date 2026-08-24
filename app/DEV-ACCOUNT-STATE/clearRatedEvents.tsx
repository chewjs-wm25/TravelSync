"use client";
/**
 * clearRatedEvents.tsx — DEV 页面按钮（Presentation Layer）
 *
 * 职责（单一）：触发"清空所有 Quality Ratings 与 Events 数据"
 *              （D1 的 official_quality_ratings / events 表），
 *              仅调用 Business Logic Layer 的两个 SyncService 并展示结果，
 *              不含任何业务/数据逻辑。
 */

import { useState } from "react";
import { eventSyncService } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/EventSyncService";
import { qualityRatingSyncService } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/QualityRatingSyncService";

export default function ClearRatedEventsBTN() {
  const [isClearing, setIsClearing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClear = async () => {
    if (isClearing) return;
    setIsClearing(true);
    setResult(null);
    setError(null);
    try {
      const [ratingsCleared, eventsCleared] = await Promise.all([
        qualityRatingSyncService.clearQualityRatings(),
        eventSyncService.clearEvents(),
      ]);
      setResult(
        `Cleared ${ratingsCleared} quality ratings · ${eventsCleared} events`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleClear}
        disabled={isClearing}
        className="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isClearing ? "Clearing…" : "Clear Quality Ratings & Events Data"}
      </button>
      {result && <p className="text-sm text-gray-700">{result}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
