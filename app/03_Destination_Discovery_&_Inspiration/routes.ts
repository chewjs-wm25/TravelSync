/**
 * routes.ts — 模块 03 页面路由常量（Presentation Layer）
 * 供主页搜索框跳转、搜索结果页、地点详情页共用，避免路径散落硬编码。
 */

import type { activeType } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

/** 模块 03 首页（探索主页） */
export const MODULE_03_HOME = "/03_Destination_Discovery_&_Inspiration";

/** 搜索结果页（query 参数 q 为搜索词） */
export const SEARCH_PAGE = `${MODULE_03_HOME}/search`;

/** 搜索结果页 URL 上的筛选参数（与 SearchAndFilter 筛选面板一一对应） */
export interface SearchUrlFilters {
  experienceType?: string;
  scene?: activeType;
  state?: string;
}

/**
 * 搜索结果页路径（搜索词 + 可选筛选参数）。
 * 筛选参数仅在实际选中时写入（scene 为 "all" 时不写），
 * 保证 URL 简洁且旧链接（仅 q）完全兼容。
 */
export const searchPagePath = (
  q: string,
  filters?: SearchUrlFilters
): string => {
  const params = new URLSearchParams();
  const trimmed = q.trim();
  if (trimmed) params.set("q", trimmed);
  if (filters?.experienceType) params.set("exp", filters.experienceType);
  if (filters?.scene && filters.scene !== "all")
    params.set("scene", filters.scene);
  if (filters?.state) params.set("state", filters.state);
  const query = params.toString();
  return query ? `${SEARCH_PAGE}?${query}` : SEARCH_PAGE;
};

/** 地点详情页路径（placeId + 原始搜索词 q，详情页据此重查 API） */
export const placeDetailPath = (placeId: string, q: string): string =>
  `${MODULE_03_HOME}/place/${encodeURIComponent(placeId)}?q=${encodeURIComponent(q)}`;

/** Google Maps 搜索 URL（Recommended Places 卡片点击后新标签页打开） */
export const googleMapsUrl = (query: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/** 合辑详情页路径（collectionId 为合辑主题源标识） */
export const collectionDetailPath = (collectionId: string): string =>
  `${MODULE_03_HOME}/collections/${encodeURIComponent(collectionId)}`;

/** Wikivoyage 主站（合辑数据来源署名 / “浏览全部”外链） */
export const WIKIVOYAGE_HOME = "https://en.wikivoyage.org/";
