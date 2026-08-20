/**
 * MalaysiaBounds — 模块 03 马来西亚地理范围共享常量（API Layer）
 *
 * 职责（单一）：
 *   - 提供马来西亚大致边界框（bbox）常量与判定函数，供模块 03 所有
 *     需要"范围限制在马来西亚"的外部 API 客户端复用（单一事实来源）：
 *     Wikimedia Geosearch / Wikipedia 条目配图（前端直连）、Mapillary
 *     客户端（浏览器端预校验）与 Mapillary 代理 Route API（服务端强校验）。
 *
 * 范围说明：马来西亚实际边界约为 lat 0.85°–7.36°（半岛 + 东马）、
 * lon 99.64°–119.27°；本 bbox 取略外扩的矩形（lon 99.5–119.5、
 * lat 0.8–7.8），覆盖全境且不含邻国（新加坡、泰国南部、印尼加里曼丹
 * 边缘等），用于"图片必须位于马来西亚"的硬性过滤。
 *
 * 注意：bbox 是矩形近似。对 geosearch 等圆形搜索，除入口坐标校验外，
 * 上层还需对结果逐条校验（见 WikimediaGeosearchApi），防止边境附近
 * 半径越界（如柔佛南部 5km 半径可触及新加坡）。
 */

/** 马来西亚大致边界框（WGS84，略外扩覆盖全境，不含邻国） */
export const MALAYSIA_BBOX = {
  minLon: 99.5,
  maxLon: 119.5,
  minLat: 0.8,
  maxLat: 7.8,
} as const;

/**
 * 判定坐标是否位于马来西亚边界框内。
 * 返回语义：坐标必须为有限数值且落在 MALAYSIA_BBOX 内；非法坐标返回 false。
 */
export function isInMalaysiaBounds(lat: number, lon: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return (
    lat >= MALAYSIA_BBOX.minLat &&
    lat <= MALAYSIA_BBOX.maxLat &&
    lon >= MALAYSIA_BBOX.minLon &&
    lon <= MALAYSIA_BBOX.maxLon
  );
}
