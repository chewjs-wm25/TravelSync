"use client";
import SyncQualityRatingsBTN from "./syncQualityRatings";
import SyncEventsBTN from "./syncEvents";
import ClearImageCachesBTN from "./clearImageCaches";
import ClearRatedEventsBTN from "./clearRatedEvents";

export default function DevToolsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Developer Tools</h1>
      <p className="text-sm text-slate-500">
        Internal tools for syncing data and clearing caches. Login/logout is now
        handled by the Account module.
      </p>
      <hr className="border-slate-200" />
      {/* 官方品质评级同步（hardcode JSON → Geoapify 补全 → D1） */}
      <SyncQualityRatingsBTN />
      {/* 节日/活动同步（parsed_events.json → D1） */}
      <SyncEventsBTN />
      {/* 清空全部地点图片缓存（内存 + sessionStorage + Cloudflare KV） */}
      <ClearImageCachesBTN />
      {/* 清空全部 Quality Ratings 与 Events 数据（D1） */}
      <ClearRatedEventsBTN />
    </div>
  );
}
