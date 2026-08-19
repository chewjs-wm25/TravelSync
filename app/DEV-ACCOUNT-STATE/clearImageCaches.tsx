"use client";
/**
 * clearImageCaches.tsx — DEV 页面按钮（Presentation Layer）
 *
 * 职责（单一）：触发"清空全部地点图片缓存"（内存 + sessionStorage + Cloudflare KV），
 *              仅调用 Business Logic Layer 的 discoveryService.clearImageCaches
 *              并展示清除结果，不含任何业务/数据逻辑。
 */

import { useState } from "react";
import { discoveryService } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";

export default function ClearImageCachesBTN() {
  const [isClearing, setIsClearing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClear = async () => {
    if (isClearing) return;
    setIsClearing(true);
    setResult(null);
    setError(null);
    try {
      const cleared = await discoveryService.clearImageCaches();
      setResult(
        `Cleared ${cleared} KV entries (memory & sessionStorage caches cleared too)`
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
        {isClearing ? "Clearing…" : "Clear Image Caches"}
      </button>
      {result && <p className="text-sm text-gray-700">{result}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
