"use client";
/**
 * placeImageAttribution.tsx — 模块 03 图片署名展示组件（开源协议合规）
 *
 * 职责（单一）：展示地点图片的作者与许可声明（如 CC BY-SA 4.0 的署名
 * 要求：保留原作者 + 许可名称，许可名可点击打开许可链接）。
 *
 * 用法：叠加在图片容器底部（absolute 定位，调用方保证容器 position:relative
 * 且有足够内边距）；无有效署名信息时返回 null（不渲染）。
 * 许可名若带链接则渲染为 <a target="_blank">，点击时阻止冒泡
 * （卡片本身可能是 <a>/<Link>，避免误触卡片跳转）。
 */

import type { PlaceImageAttribution } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

export default function PlaceImageAttribution({
  attribution,
}: {
  attribution?: PlaceImageAttribution;
}) {
  const artist = attribution?.artist?.trim();
  const licenseName = attribution?.licenseName?.trim();
  const licenseUrl = attribution?.licenseUrl?.trim();
  if (!artist && !licenseName) return null;

  return (
    <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent px-2 pt-5 pb-1 text-[10px] leading-tight text-white/90">
      <p className="line-clamp-2">
        {artist && <span>© {artist}</span>}
        {artist && licenseName && <span> · </span>}
        {licenseName &&
          (licenseUrl ? (
            <a
              href={licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(licenseUrl, "_blank", "noopener,noreferrer");
              }}
              className="underline decoration-white/50 underline-offset-1 transition-colors duration-150 hover:text-white hover:decoration-white active:opacity-70"
            >
              {licenseName}
            </a>
          ) : (
            <span>{licenseName}</span>
          ))}
      </p>
    </div>
  );
}
