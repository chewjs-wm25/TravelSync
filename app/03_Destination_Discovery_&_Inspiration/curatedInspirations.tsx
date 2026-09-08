"use client";
//2. 灵感合辑与节日活动区域
// 数据来源：Business Logic Layer（经 Presentation hooks 获取）
// 灵感合辑：Wikivoyage 主题自动发现（InspirationsService），默认 3 个，
//           Generate more 追加至累计 9 个；节日活动：Cloudflare D1。

import { useRef } from "react";
import Link from "next/link";
import { AlertCircle, Compass, RefreshCw, Star } from "lucide-react";
import { useCollections, useEventFeed } from "./hooks";
import { collectionDetailPath, WIKIVOYAGE_HOME } from "./routes";
import { safeHttpUrl } from "./safeUrl";

/** 合辑封面占位色块（imageUrl 未就绪时的展示占位；就绪后显示真实图片） */
const COLLECTION_COVER_CLASSES = [
  "bg-accent-400/20",
  "bg-secondary-500/20",
  "bg-primary-500/20",
];

/** 兜底滚动步进（卡片宽度不可测量时使用） */
const EVENT_SCROLL_STEP = 320;

function LoadingCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] ${className}`}
      aria-hidden="true"
    >
      <div className="h-4 w-24 rounded-full bg-gray-200" />
      <div className="mt-5 h-6 w-4/5 rounded bg-gray-200" />
      <div className="mt-3 h-4 w-3/5 rounded bg-gray-100" />
      <div className="mt-8 h-8 w-24 rounded-md bg-gray-100" />
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
      <AlertCircle className="h-8 w-8 text-semantic-warning" aria-hidden="true" />
      <p className="mt-3 text-base font-semibold text-gray-800">{message}</p>
      <p className="mt-1 text-sm text-gray-500">Please try again in a moment.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-primary-500/90 active:scale-[0.96]"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

export default function CuratedInspirations() {
  const {
    collections,
    isLoading: collectionsLoading,
    error: collectionsError,
    retry: retryCollections,
    isGenerating,
    hasMore,
    generateMore,
  } = useCollections();
  const {
    events,
    isLoading: eventsLoading,
    error: eventsError,
    retry: retryEvents,
  } = useEventFeed();
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6" aria-label="Loading inspirations">
            {Array.from({ length: 3 }, (_, index) => (
              <LoadingCard key={index} className="h-52" />
            ))}
          </div>
        )}
        {!collectionsLoading && collectionsError && (
          <InlineError
            message="We couldn’t load travel inspirations."
            onRetry={retryCollections}
          />
        )}
        {!collectionsLoading && !collectionsError && collections.length === 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
            <p className="text-base font-semibold text-gray-800">No inspirations available right now.</p>
            <p className="mt-1 text-sm text-gray-500">Check back soon for more ideas.</p>
          </div>
        )}
        {!collectionsLoading && !collectionsError && collections.length > 0 && (
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
                  src={safeHttpUrl(item.imageUrl)}
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
        )}
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
                className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => scrollEvents(1)}
                aria-label="Scroll events right"
                className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
        </div>
        {eventsLoading && (
          <div className="flex gap-4 overflow-hidden pb-2 md:gap-6" aria-label="Loading events">
            {Array.from({ length: 3 }, (_, index) => (
              <LoadingCard key={index} className="min-w-[300px] max-w-[300px]" />
            ))}
          </div>
        )}
        {!eventsLoading && eventsError && (
          <InlineError
            message="We couldn’t load upcoming events."
            onRetry={retryEvents}
          />
        )}
        {!eventsLoading && !eventsError && events.length === 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
            <p className="text-base font-semibold text-gray-800">No upcoming events found.</p>
            <p className="mt-1 text-sm text-gray-500">New festivals and activities will appear here soon.</p>
          </div>
        )}
        {/* 横向滚动列表：触摸/触控板可滑动，亦可使用上方左右按钮移动 */}
        {!eventsLoading && !eventsError && events.length > 0 && (
          <div
            ref={eventsScrollerRef}
            className="flex snap-x scroll-smooth gap-4 overflow-x-auto pb-2 md:gap-6"
          >
            {events.map((event) => (
            <a
              key={event.id}
              href={safeHttpUrl(event.url)}
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

              {/* 活动分类标签（数据来自 D1 中官网活动爬虫同步的 categories） */}
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
        )}
      </div>
    </section>
  );
}
