"use client";
import LogoutBTN from "./logout";
import LoginBTN from "./login";
import SyncQualityRatingsBTN from "./syncQualityRatings";

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
    </div>
  );
}
