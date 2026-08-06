"use client";
//1. 搜索与筛选区域 (Bento 卡片)

import React from "react";

export type activeType = "indoor" | "outdoor" | "all";

interface ChildProbs {
  activeTab: activeType;
  setActiveTab: React.Dispatch<React.SetStateAction<activeType>>;
}

export default function SearchAndFilter({
  activeTab,
  setActiveTab,
}: ChildProbs) {
  return (
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
        <button
          onClick={() => setActiveTab("all")}
          className={`rounded-full px-6 py-3 text-sm font-semibold transition-all duration-150 ${
            activeTab === "all"
              ? "bg-primary-500 text-white shadow-md"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          All
        </button>
      </div>
    </section>
  );
}
