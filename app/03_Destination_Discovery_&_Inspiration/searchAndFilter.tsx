"use client";
//1. 搜索与筛选区域 (Bento 卡片)
// 数据来源：Business Logic Layer（筛选候选项经 Presentation hooks 注入）
// 搜索联想：真实 Geoapify autocomplete（经 BL discoveryService.getSuggestions）

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { searchPagePath } from "./routes";
import type {
  activeType,
  FilterOptions,
  SuggestionItem,
} from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

export type { activeType };

interface SearchAndFilterProps {
  activeTab: activeType;
  setActiveTab: React.Dispatch<React.SetStateAction<activeType>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  /** 联想建议列表（真实 Geoapify autocomplete 结果） */
  suggestions: SuggestionItem[];
  /** 联想请求进行中 */
  isSuggesting: boolean;
  /** 选中联想建议：回填搜索框并触发真实搜索 */
  onSelectSuggestion: (suggestion: SuggestionItem) => void;
  selectedExperienceType: string;
  setSelectedExperienceType: React.Dispatch<React.SetStateAction<string>>;
  isMuslimFriendly: boolean;
  setIsMuslimFriendly: React.Dispatch<React.SetStateAction<boolean>>;
  filterOptions: FilterOptions;
}

export default function SearchAndFilter({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  suggestions,
  isSuggesting,
  onSelectSuggestion,
  selectedExperienceType,
  setSelectedExperienceType,
  isMuslimFriendly,
  setIsMuslimFriendly,
  filterOptions,
}: SearchAndFilterProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const router = useRouter();

  const showDropdown =
    isFocused &&
    searchQuery.trim().length >= 2 &&
    (suggestions.length > 0 || isSuggesting);

  /** 跳转搜索结果页（Enter / 点击联想建议触发） */
  const goToSearchPage = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setIsFocused(false);
    setHighlightedIndex(-1);
    router.push(searchPagePath(q));
  };

  /** 选中联想建议：回填输入框（hooks selectSuggestion）并跳转搜索结果页 */
  const handleSelectSuggestion = (suggestion: SuggestionItem) => {
    onSelectSuggestion(suggestion);
    goToSearchPage(suggestion.name);
  };

  /** 键盘导航：↑/↓ 移动高亮，Enter 选中建议（无建议时直接搜索），Esc 关闭下拉 */
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setHighlightedIndex(
        (i) => (i - 1 + suggestions.length) % suggestions.length
      );
    } else if (
      e.key === "Enter" &&
      highlightedIndex >= 0 &&
      suggestions[highlightedIndex]
    ) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      goToSearchPage(searchQuery);
    } else if (e.key === "Escape") {
      setIsFocused(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]">
      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        {/* 搜索栏（带 Geoapify 自动联想下拉） */}
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
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // 延迟关闭以允许建议项 click 先触发
              setTimeout(() => {
                setIsFocused(false);
                setHighlightedIndex(-1);
              }, 120);
            }}
            placeholder="Search destinations, landmarks, or themes..."
            className="focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-2xl border border-gray-200 py-3 pr-4 pl-12 text-base text-gray-800 placeholder-gray-500 focus:ring-2 focus:outline-none"
          />

          {/* 联想下拉（真实 Geoapify 建议） */}
          {showDropdown && (
            <ul className="isolate absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white opacity-100 shadow-2xl">
              {isSuggesting ? (
                <li className="px-4 py-3 text-sm text-gray-500">
                  Searching…
                </li>
              ) : (
                suggestions.map((suggestion, index) => (
                  <li key={suggestion.placeId}>
                    <button
                      type="button"
                      // 阻止 mousedown 触发 input blur，保证 click 正常执行
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        handleSelectSuggestion(suggestion);
                      }}
                      className={`group relative flex w-full flex-col items-start overflow-hidden px-4 py-3 text-left transition-all duration-150 ${
                        index === highlightedIndex
                          ? "bg-primary-500/10"
                          : "hover:bg-primary-500/10 active:bg-primary-500/20"
                      }`}
                    >
                      {/* hover / 键盘高亮指示条 */}
                      <span
                        className={`absolute top-0 left-0 h-full w-1 bg-primary-500 transition-opacity duration-150 ${
                          index === highlightedIndex
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      ></span>
                      <span
                        className={`text-sm font-semibold transition-colors duration-150 ${
                          index === highlightedIndex
                            ? "text-primary-500"
                            : "text-gray-800 group-hover:text-primary-500"
                        }`}
                      >
                        {suggestion.name}
                      </span>
                      <span className="line-clamp-1 text-xs text-gray-500 transition-colors duration-150 group-hover:text-gray-600">
                        {suggestion.formatted}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      {/* 多维筛选面板 */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={selectedExperienceType}
          onChange={(e) => setSelectedExperienceType(e.target.value)}
          className="focus:border-primary-500 focus:ring-primary-500/20 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 focus:ring-2 focus:outline-none"
        >
          <option value="">Experience Type</option>
          {filterOptions.experienceTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={isMuslimFriendly}
            onChange={(e) => setIsMuslimFriendly(e.target.checked)}
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
