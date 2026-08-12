"use client";

/**
 * hooks.ts — 模块 03 Presentation 数据 hooks
 *
 * 职责：封装对 Business Logic Layer 的调用（异步数据加载 + 本地交互状态），
 *       使 UI 组件保持纯展示，不直接触碰下层（BL 以下）任何模块。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { discoveryService } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";
import { favoritesService } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/FavoritesService";
import type {
  activeType,
  Collection,
  EventFeedItem,
  FilterOptions,
  PoiItem,
  SavedItem,
  SearchFilters,
  SuggestionItem,
} from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

/** 搜索与多维筛选：筛选状态 + 结果 POI 列表 + 输入联想 */
export function useSearchAndFilter() {
  const [activeTab, setActiveTab] = useState<activeType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedExperienceType, setSelectedExperienceType] = useState("");
  const [isMuslimFriendly, setIsMuslimFriendly] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    experienceTypes: [],
  });
  const [pois, setPois] = useState<PoiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const buildFilters = useCallback(
    (): SearchFilters => ({
      query: searchQuery,
      experienceType: selectedExperienceType,
      isMuslimFriendly,
      scene: activeTab,
    }),
    [searchQuery, selectedExperienceType, isMuslimFriendly, activeTab]
  );

  // 筛选面板候选项
  useEffect(() => {
    let cancelled = false;
    discoveryService.getFilterOptions().then((options) => {
      if (!cancelled) setFilterOptions(options);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 推荐地点（Recommended Places）：仅搜索框为空时拉取
  // 数据源：Cloudflare D1 中官方品质评级地点（经 Route API 读取）
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed) return;
    let cancelled = false;
    discoveryService
      .getQualityRatedPois(buildFilters())
      .then((result) => {
        if (!cancelled) setPois(result);
      })
      .catch(() => {
        if (!cancelled) setPois([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildFilters, searchQuery]);

  // 输入联想：≥2 字符后防抖 300ms 调真实 Geoapify autocomplete
  // （<2 字符时不请求也不清空 state，由组件显示条件 searchQuery 长度控制下拉显隐）
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setIsSuggesting(true);
      discoveryService
        .getSuggestions(trimmed)
        .then((result) => {
          if (!cancelled) setSuggestions(result);
        })
        .catch(() => {
          // 联想失败不打扰用户：清空建议，搜索结果仍可正常提交
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setIsSuggesting(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  /** 选中联想建议：回填搜索框（地点名称）并触发真实搜索 */
  const selectSuggestion = useCallback((suggestion: SuggestionItem) => {
    setSearchQuery(suggestion.name);
    setSuggestions([]);
  }, []);

  // 切换收藏状态后刷新列表（重新合并收藏标记；仅空搜索时主页展示列表）
  const toggleFavourite = useCallback(
    async (poi: PoiItem) => {
      await favoritesService.togglePoiFavourite(poi);
      if (!searchQuery.trim()) {
        setPois(await discoveryService.getQualityRatedPois(buildFilters()));
      }
    },
    [buildFilters, searchQuery]
  );

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    suggestions,
    isSuggesting,
    selectSuggestion,
    selectedExperienceType,
    setSelectedExperienceType,
    isMuslimFriendly,
    setIsMuslimFriendly,
    filterOptions,
    pois,
    isLoading,
    toggleFavourite,
  };
}

/** 灵感合辑 */
export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    discoveryService
      .getCollections()
      .then((result) => {
        if (!cancelled) setCollections(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { collections, isLoading };
}

/** 节日活动流（活动 + 周边推荐） */
export function useEventFeed() {
  const [events, setEvents] = useState<EventFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    discoveryService
      .getEventFeed()
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { events, isLoading };
}

/** 收藏夹（Favourite List）：列表、计数、类型过滤、删除、切换收藏与加入行程 */
export function useFavorites() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [activeType, setActiveType] = useState<string>("All");

  const refresh = useCallback(async () => {
    setSavedItems(await favoritesService.getSavedItems());
  }, []);

  useEffect(() => {
    let cancelled = false;
    favoritesService
      .getSavedItems()
      .then((items) => {
        if (!cancelled) setSavedItems(items);
      })
      .catch(() => {
        // 收藏加载失败不打断页面：保持空列表即可
        if (!cancelled) setSavedItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 类型过滤选项：自动从收藏夹内条目的体验类型去重生成 */
  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set(savedItems.map((item) => item.experienceType).filter(Boolean))
      ),
    [savedItems]
  );

  /** 删除一条收藏 */
  const removeItem = useCallback(
    async (id: string) => {
      await favoritesService.removeSavedItem(id);
      await refresh();
    },
    [refresh]
  );

  /** 切换地点收藏状态（收藏/取消收藏）并刷新列表 */
  const toggleItem = useCallback(
    async (poi: PoiItem) => {
      await favoritesService.togglePoiFavourite(poi);
      await refresh();
    },
    [refresh]
  );

  /** 将单个地点加入行程（经 RoutePlannerBridge stub，返回结果供 UI 反馈） */
  const addToTrip = useCallback(
    async (item: SavedItem) => {
      return favoritesService.addToTrip(item);
    },
    []
  );

  /** 按当前类型过滤后的可见列表（"All" 显示全部） */
  const visibleItems =
    activeType === "All"
      ? savedItems
      : savedItems.filter((item) => item.experienceType === activeType);

  return {
    savedItems,
    visibleItems,
    typeOptions,
    activeType,
    setActiveType,
    savedItemsCount: savedItems.length,
    removeItem,
    toggleItem,
    addToTrip,
    refresh,
  };
}

/** 图片请求并发上限（免费配额保护：Geoapify 3000/天、Unsplash 50/小时） */
const IMAGE_FETCH_CONCURRENCY = 4;

/**
 * 地点图片懒加载：对传入地点分批并发（IMAGE_FETCH_CONCURRENCY）请求图片，
 * 返回 id → imageUrl 映射；加载中/无图结果为 ""（前端展示占位图）。
 * 依赖 discoveryService.getPlaceImage 内部缓存（内存 + sessionStorage），
 * 重复浏览/翻页不重复消耗免费 API 额度。
 * 依赖地点 id 列表（序列化 key）：仅当地点集合变化时重新加载。
 */
export function usePlaceImages(
  places: Array<{ id: string; placeId?: string; name: string }>
): Record<string, string> {
  const [images, setImages] = useState<Record<string, string>>({});
  /** 地点 id 集合序列化键（避免每次渲染的数组引用变化触发重复请求） */
  const placeKey = useMemo(
    () => places.map((place) => place.id).join("|"),
    [places]
  );

  useEffect(() => {
    let cancelled = false;
    setImages({}); // 地点集合变化时重置，未加载完成的卡片显示占位

    const pending = places.filter((place) => place.placeId);
    const run = async () => {
      for (let i = 0; i < pending.length; i += IMAGE_FETCH_CONCURRENCY) {
        const chunk = pending.slice(i, i + IMAGE_FETCH_CONCURRENCY);
        const results = await Promise.all(
          chunk.map(async (place) => ({
            id: place.id,
            url: await discoveryService.getPlaceImage(
              place.placeId as string,
              place.name
            ),
          }))
        );
        if (cancelled) return;
        setImages((prev) => {
          const next = { ...prev };
          for (const result of results) next[result.id] = result.url;
          return next;
        });
      }
    };
    // getPlaceImage 内部已全部降级（失败返回 ""），此处仅防御
    run().catch(() => {
      if (!cancelled) setImages({});
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey]);

  return images;
}
