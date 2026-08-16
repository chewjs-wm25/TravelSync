"use client";
//2. 专题合集与活动区域
// 数据来源：Business Logic Layer（经 Presentation hooks 获取）

import { useRef } from "react";
import { useCollections, useEventFeed } from "./hooks";

/** 合辑封面占位色块（imageUrl 未就绪时的展示占位；就绪后显示真实图片） */
const COLLECTION_COVER_CLASSES = [
  "bg-accent-400/20",
  "bg-secondary-500/20",
  "bg-primary-500/20",
];

/** 横向滚动时每次移动的像素量 */
const EVENT_SCROLL_STEP = 320;

export default function CuratedInspirations() {
  const { collections, isLoading: collectionsLoading } = useCollections();
  const { events, isLoading: eventsLoading } = useEventFeed();
  /** 活动列表横向滚动容器引用（左右按钮驱动） */
  const eventsScrollerRef = useRef<HTMLDivElement>(null);

  /** 向左/右平滑移动活动列表 */
  const scrollEvents = (direction: 1 | -1) => {
    eventsScrollerRef.current?.scrollBy({
      left: direction * EVENT_SCROLL_STEP,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-6">
      {/* 主题合集轮播 */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold text-gray-800">
          Curated Inspirations
        </h2>
        {collectionsLoading && (
          <p className="text-sm text-gray-400">Loading collections...</p>
        )}
        <div className="flex snap-x gap-4 overflow-x-auto pb-4 md:gap-6">
          {collections.map((item, i) => (
            <div
              key={item.id}
              className={`h-40 min-w-[280px] relative flex cursor-pointer snap-center items-end overflow-hidden rounded-3xl border border-gray-200 p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]`}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div
                  className={`absolute inset-0 ${
                    COLLECTION_COVER_CLASSES[i % COLLECTION_COVER_CLASSES.length]
                  }`}
                ></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-800/60 to-transparent"></div>
              <h3 className="relative z-10 text-xl font-semibold text-white">
                {item.title}
              </h3>
            </div>
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
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 transition-colors duration-150 hover:bg-gray-100"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => scrollEvents(1)}
                aria-label="Scroll events right"
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 transition-colors duration-150 hover:bg-gray-100"
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
          className="flex snap-x gap-4 overflow-x-auto pb-2 md:gap-6"
        >
          {events.map((event) => (
            <a
              key={event.id}
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-[300px] max-w-[300px] snap-start rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]"
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
