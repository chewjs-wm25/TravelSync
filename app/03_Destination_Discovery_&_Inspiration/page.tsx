"use client";

import React, { useState } from "react";

export default function TravelInspirationPage() {
  const [activeTab, setActiveTab] = useState("indoor");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <main className="relative min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-24 md:space-y-6">
        {/* =========================================
            1. 搜索与筛选区域 (Bento 卡片)
            ========================================= */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]">
          <div className="mb-6 flex flex-col gap-4 md:flex-row">
            {/* 搜索栏 */}
            <div className="relative flex-1">
              <svg
                className="absolute top-3 left-3 h-6 w-6 text-gray-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
              <input
                type="text"
                placeholder="Search destinations, landmarks, or themes..."
                className="focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-2xl border border-gray-200 py-3 pr-4 pl-12 text-base text-gray-800 placeholder-gray-500 focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          {/* 多维筛选面板 */}
          <div className="flex flex-wrap items-center gap-4">
            <select className="focus:border-primary-500 focus:ring-primary-500/20 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 focus:ring-2 focus:outline-none">
              <option>Experience Type</option>
              <option>Cultural Heritage</option>
              <option>Nature & Adventure</option>
            </select>
            <select className="focus:border-primary-500 focus:ring-primary-500/20 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 focus:ring-2 focus:outline-none">
              <option>Official Quality Rating</option>
              <option>Platinum Certified</option>
              <option>Gold Certified</option>
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                className="text-primary-500 focus:ring-primary-500 h-4 w-4 rounded-md border-gray-200"
              />
              Muslim-Friendly Facilities
            </label>
          </div>

          {/* 场景分类标签页 */}
          <div className="mt-6 flex gap-2 border-t border-gray-200 pt-4">
            <button
              onClick={() => setActiveTab("indoor")}
              className={`rounded-full px-6 py-3 text-sm font-semibold transition-all duration-150 ${
                activeTab === "indoor"
                  ? "bg-primary-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              Indoor Venues
            </button>
            <button
              onClick={() => setActiveTab("outdoor")}
              className={`rounded-full px-6 py-3 text-sm font-semibold transition-all duration-150 ${
                activeTab === "outdoor"
                  ? "bg-primary-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              Outdoor Scenes
            </button>
          </div>
        </section>

        {/* =========================================
            2. 专题合集与活动区域
            ========================================= */}
        <section className="space-y-6">
          {/* 主题合集轮播 */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-gray-800">
              Curated Inspirations
            </h2>
            <div className="flex snap-x gap-4 overflow-x-auto pb-4 md:gap-6">
              {[
                {
                  title: "Historic District Walking Guide",
                  img: "bg-accent-400/20",
                },
                { title: "Local Culinary Secrets", img: "bg-secondary-500/20" },
                { title: "Art & Museum Hopping", img: "bg-primary-500/20" },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`h-40 min-w-[280px] ${item.img} relative flex cursor-pointer snap-center items-end overflow-hidden rounded-3xl border border-gray-200 p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-800/60 to-transparent"></div>
                  <h3 className="relative z-10 text-xl font-semibold text-white">
                    {item.title}
                  </h3>
                </div>
              ))}
            </div>
          </div>

          {/* 活动与节日区域（含周边推荐） */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-gray-800">
              Upcoming Festivals & Events
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <span className="bg-primary-500/10 text-primary-500 mb-2 inline-block rounded-md px-2 py-1 text-xs font-semibold">
                      Sep 15 - Sep 20
                    </span>
                    <h3 className="text-xl font-semibold text-gray-800">
                      Annual City Lantern Festival
                    </h3>
                  </div>
                </div>
                <p className="mb-4 text-base text-gray-500">
                  Experience the spectacular light show at the central plaza.
                </p>

                {/* 周边推荐组件 */}
                <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    <svg
                      className="text-secondary-500 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      ></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      ></path>
                    </svg>
                    Nearby Recommendations
                  </h4>
                  <div className="flex gap-2">
                    <span className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm">
                      🏨 Plaza Hotel (0.2km)
                    </span>
                    <span className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm">
                      🍜 Night Market Eats (0.1km)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            3. 兴趣点（POI）决策视图 (Bento 网格)
            ========================================= */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold text-gray-800">
              Recommended Places
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {/* POI 主卡片（跨度根据规范按屏幕尺寸调整） */}
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]"
              >
                {/* 带质量徽章的图片占位符 */}
                <div className="relative m-2 h-48 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                  {/* 官方质量认证徽章 */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-gray-800/90 px-3 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-sm">
                    <svg
                      className="text-accent-400 h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                    </svg>
                    Platinum
                  </div>
                  {/* 收藏按钮 */}
                  <button className="hover:text-primary-500 absolute top-3 right-3 rounded-full bg-white/90 p-2 text-gray-500 shadow-sm backdrop-blur-sm transition-colors duration-150 hover:bg-white">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      ></path>
                    </svg>
                  </button>
                </div>

                <div className="p-6 pt-4">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="text-xl font-semibold text-gray-800">
                      Grand National Museum
                    </h3>
                  </div>

                  {/* 营业状态与核心信息 */}
                  <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1 font-medium text-[#10b981]">
                      <span className="h-2 w-2 rounded-full bg-[#10b981]"></span>{" "}
                      Open Now
                    </span>
                    <span className="flex items-center gap-1">⏱️ 2-3 hrs</span>
                    <span className="flex items-center gap-1">🎟️ $15</span>
                  </div>

                  {/* 设施与无障碍提示标签 */}
                  <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
                    <span className="flex items-center gap-1 rounded-md border border-[#3b82f6]/20 bg-[#3b82f6]/10 px-2 py-1 text-xs text-[#3b82f6]">
                      ♿ Wheelchair Accessible
                    </span>
                    <span className="flex items-center gap-1 rounded-md border border-[#f59e0b]/20 bg-[#f59e0b]/10 px-2 py-1 text-xs text-[#f59e0b]">
                      ⚠️ Limited Parking
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* =========================================
          4. 愿望清单与收藏夹区域
          ========================================= */}

      {/* 悬浮切换按钮 */}
      {!isDrawerOpen && (
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="bg-primary-500 fixed right-8 bottom-8 z-40 flex items-center gap-2 rounded-full px-6 py-3 text-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            ></path>
          </svg>
          <span className="font-semibold">Bucket List (3)</span>
        </button>
      )}

      {/* 愿望清单抽屉 / 悬浮面板 */}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-full transform flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-96 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
            <svg
              className="text-primary-500 h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              ></path>
            </svg>
            My Saved Items
          </h2>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 text-gray-500 transition-colors duration-150 hover:text-gray-800"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* 已保存项目列表 */}
          {[
            { name: "Grand National Museum", folder: "Cultural Trip" },
            { name: "Annual City Lantern Festival", folder: "Events" },
            { name: "Night Market Eats", folder: "Food" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-2xl border border-gray-200 p-4 transition-colors duration-150 hover:bg-gray-100"
            >
              <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-gray-200"></div>
              <div className="flex-1">
                <h4 className="line-clamp-1 text-base font-semibold text-gray-800">
                  {item.name}
                </h4>
                <span className="mt-1 inline-block rounded-md bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {item.folder}
                </span>
              </div>
              <button className="text-gray-500 transition-colors duration-150 hover:text-[#ef4444]">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* 批量导出 / 推送按钮 */}
        <div className="border-t border-gray-200 bg-white p-6">
          <button className="bg-primary-500 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
            Push to Route Planner
          </button>
          <p className="mt-3 text-center text-xs font-medium text-gray-500">
            Export 3 items to your itinerary planner
          </p>
        </div>
      </div>
    </main>
  );
}
