/**
 * routes.ts — 模块 03 页面路由常量（Presentation Layer）
 * 供主页搜索框跳转、搜索结果页、地点详情页共用，避免路径散落硬编码。
 */

/** 模块 03 首页（探索主页） */
export const MODULE_03_HOME = "/03_Destination_Discovery_&_Inspiration";

/** 搜索结果页（query 参数 q 为搜索词） */
export const SEARCH_PAGE = `${MODULE_03_HOME}/search`;

/** 地点详情页路径（placeId + 原始搜索词 q，详情页据此重查 API） */
export const placeDetailPath = (placeId: string, q: string): string =>
  `${MODULE_03_HOME}/place/${encodeURIComponent(placeId)}?q=${encodeURIComponent(q)}`;

/** Google Maps 搜索 URL（Recommended Places 卡片点击后新标签页打开） */
export const googleMapsUrl = (query: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/** 搜索结果页路径（搜索词） */
export const searchPagePath = (q: string): string =>
  `${SEARCH_PAGE}?q=${encodeURIComponent(q)}`;
