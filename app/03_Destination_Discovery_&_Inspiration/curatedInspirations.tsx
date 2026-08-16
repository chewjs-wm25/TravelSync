"use client";
//2. 灵感合辑与节日活动区域
// 数据来源：Business Logic Layer（经 Presentation hooks 获取）
// 灵感合辑：Wikivoyage 主题自动发现（InspirationsService），默认 3 个，
//           Generate more 追加至累计 9 个；节日活动：Cloudflare D1。

import { useRef } from "react";
import Link from "next/link";
import { Compass, Star } from "lucide-react";
import { useCollections, useEventFeed } from "./hooks";
import { collectionDetailPath, WIKIVOYAGE_HOME } from "./routes";

/** 合辑封面占位色块（imageUrl 未就绪时的展示占位；就绪后显示真实图片） */
const COLLECTION_COVER_CLASSES = [
  "bg-accent-400/20",
  "bg-secondary-500/20",
  "bg-primary-500/20",
];

/** 兜底滚动步进（卡片宽度不可测量时使用） */
const EVENT_SCROLL_STEP = 320;

export default function CuratedInspirations() {
  const {
    collections,
    isLoading: collectionsLoading,
    isGenerating,
    hasMore,
    generateMore,
  } = useCollections();
  const { events, isLoading: eventsLoading } = useEventFeed();
  /** 活动列表横向滚动容器引用（左右按钮驱动） */
  const eventsScrollerRef = useRef<HTMLDivElement>(null);

  /**
   * 向左/右平滑移动活动列表：
   * 步进动态取「首张卡片宽度 + 当前列间隙」，使平滑滚动的终点精确落在
   * snap 吸附点上，避免固定步进滚动结束后被 snap 强制纠正造成的跳变。
   */
  const scrollEvents = (direction: 1 | -1) => {
    const container = eventsScrollerRef.current;
    if (!container) return;
    const firstCard = container.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
    const step = firstCard ? firstCard.offsetWidth + gap : EVENT_SCROLL_STEP;
    container.scrollTo({
      left: container.scrollLeft + direction * step,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-6">
      {/* 灵感合辑（Wikivoyage 主题自动发现：默认 3 个，可生成更多） */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Curated Inspirations
          </h2>
          {hasMore ? (
            <button
              type="button"
              onClick={generateMore}
              disabled={isGenerating}
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Compass className="h-5 w-5" aria-hidden="true" />
              {isGenerating ? "Loading…" : "Generate more"}
            </button>
          ) : (
            collections.length > 0 && (
              <a
                href={WIKIVOYAGE_HOME}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.94]"
              >
                Browse all regions on Wikivoyage
              </a>
            )
          )}
        </div>
        {collectionsLoading && (
          <p className="text-sm text-gray-400">Loading collections...</p>
        )}
        {!collectionsLoading && collections.length === 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-500">
              Couldn&apos;t load inspirations. Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.94]"
            >
              Retry
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {collections.map((item, i) => (
            <Link
              key={item.id}
              href={collectionDetailPath(item.id)}
              className="group relative h-52 overflow-hidden rounded-3xl border border-gray-200 p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div
                  className={`absolute inset-0 ${
                    COLLECTION_COVER_CLASSES[i % COLLECTION_COVER_CLASSES.length]
                  }`}
                ></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-800/70 via-gray-800/20 to-transparent"></div>
              <div className="relative z-10 flex h-full flex-col justify-end">
                <h3 className="text-xl font-semibold text-white">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="mt-1 line-clamp-2 text-sm text-white/90">
                    {item.subtitle}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-gray-800">
                    {item.memberCount} place
                    {item.memberCount === 1 ? "" : "s"}
                  </span>
                  {item.starCount > 0 && (
                    <span className="flex items-center gap-1 rounded-md bg-accent-400/90 px-2 py-1 text-xs font-semibold text-gray-800">
                      <Star
                        className="h-3 w-3 fill-current"
                        aria-hidden="true"
                      />
                      {item.starCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 活动与节日区域（数据来自 Cloudflare D1，点击卡片外部打开官方 url） */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Upcoming Festivals & Events
          </h2>
          {/* 左右移动按钮（仅在存在活动时显示） */}
          {events.length > 0 && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => scrollEvents(-1)}
                aria-label="Scroll events left"
                className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.94]"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => scrollEvents(1)}
                aria-label="Scroll events right"
                className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.94]"
              >
                Next →
              </button>
            </div>
          )}
        </div>
        {eventsLoading && (
          <p className="text-sm text-gray-400">Loading events...</p>
        )}
        {!eventsLoading && events.length === 0 && (
          <p className="text-sm text-gray-500">
            No events available yet. Sync them via the DEV page.
          </p>
        )}
        {/* 横向滚动列表：触摸/触控板可滑动，亦可使用上方左右按钮移动 */}
        <div
          ref={eventsScrollerRef}
          className="flex snap-x scroll-smooth gap-4 overflow-x-auto pb-2 md:gap-6"
        >
          {events.map((event) => (
            <a
              key={event.id}
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-[300px] max-w-[300px] snap-start rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <span className="bg-primary-500/10 text-primary-500 mb-2 inline-block rounded-md px-2 py-1 text-xs font-semibold">
                    {event.date}
                  </span>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {event.title}
                  </h3>
                </div>
              </div>
              <p className="mb-4 text-base text-gray-500">{event.location}</p>

              {/* 活动分类标签（数据来自 D1 中 parsed_events.json 的 categories） */}
              {event.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.categories.map((category) => (
                    <span
                      key={category}
                      className="rounded-md border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 shadow-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
