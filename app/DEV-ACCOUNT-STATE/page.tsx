"use client";
import LogoutBTN from "./logout";
import LoginBTN from "./login";
import SyncQualityRatingsBTN from "./syncQualityRatings";
import SyncEventsBTN from "./syncEvents";
import ClearImageCachesBTN from "./clearImageCaches";
import ClearRatedEventsBTN from "./clearRatedEvents";

export default function AccountSettingsPage() {
  return (
    <div>
      <h1>DEV LOGIN/LOGOUT PAGE</h1>
      <br />
      {/* 使用 flex 和 gap 设置水平间距 */}
      <div className="flex gap-4">
        <LoginBTN />
        <LogoutBTN />
      </div>
      <br />
      {/* 官方品质评级同步（hardcode JSON → Geoapify 补全 → D1） */}
      <SyncQualityRatingsBTN />
      <br />
      {/* 节日/活动同步（parsed_events.json → D1） */}
      <SyncEventsBTN />
      <br />
      {/* 清空全部地点图片缓存（内存 + sessionStorage + Cloudflare KV） */}
      <ClearImageCachesBTN />
      <br />
      {/* 清空全部 Quality Ratings 与 Events 数据（D1） */}
      <ClearRatedEventsBTN />
    </div>
  );
}
