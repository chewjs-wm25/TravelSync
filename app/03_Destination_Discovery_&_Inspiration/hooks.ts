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
import {
  inspirationsService,
  MAX_COLLECTIONS_DISPLAYED,
} from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/InspirationsService";
import type {
  activeType,
  Collection,
  CollectionDetail,
  EventFeedItem,
  FilterOptions,
  NearbyInspiration,
  PlaceImageResult,
  PoiItem,
  SavedItem,
  SuggestionItem,
} from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

/** useSearchAndFilter 的初始筛选状态（搜索结果页从 URL 参数恢复时传入） */
export interface SearchAndFilterInitial {
  query?: string;
  experienceType?: string;
  scene?: activeType;
  state?: string;
}

/** 搜索与多维筛选：筛选状态 + 结果 POI 列表 + 输入联想 */
export function useSearchAndFilter(initial?: SearchAndFilterInitial) {
  const [activeTab, setActiveTab] = useState<activeType>(
    initial?.scene ?? "all"
  );
  const [searchQuery, setSearchQuery] = useState(initial?.query ?? "");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedExperienceType, setSelectedExperienceType] = useState(
    initial?.experienceType ?? ""
  );
  const [selectedState, setSelectedState] = useState(initial?.state ?? "");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    experienceTypes: [],
    states: [],
  });
  const [pois, setPois] = useState<PoiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // 推荐地点（Recommended Places）：仅搜索框为空时拉取；与搜索栏筛选完全
  // 解绑——数据源为 Cloudflare D1 官方品质评级地点（经 Route API 读取），
  // 无论筛选状态如何始终返回全部官方评级数据（BL 层 getQualityRatedPois
  // 不接受筛选条件），故不依赖 buildFilters、筛选变化不触发重新请求。
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed) return;
    let cancelled = false;
    discoveryService
      .getQualityRatedPois()
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
  }, [searchQuery]);

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
      try {
        await favoritesService.togglePoiFavourite(poi);
        if (!searchQuery.trim()) {
          setPois(await discoveryService.getQualityRatedPois());
        }
      } catch (err) {
        // 未登录（401）等失败：提示用户，不中断页面、不刷新列表
        window.alert(
          err instanceof Error ? err.message : "Failed to toggle favourite"
        );
      }
    },
    [searchQuery]
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
    selectedState,
    setSelectedState,
    filterOptions,
    pois,
    isLoading,
    toggleFavourite,
  };
}

/** 合辑展示状态缓存键（sessionStorage：浏览器会话内记住已展示的合辑数量；关闭浏览器即清除） */
const COLLECTIONS_STATE_KEY = "module03:collections-state:v1";

/** 校验 sessionStorage 反序列化条目是否为合法 Collection */
function isCollection(value: unknown): value is Collection {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.subtitle === "string" &&
    typeof item.imageUrl === "string" &&
    typeof item.memberCount === "number" &&
    typeof item.starCount === "number" &&
    (item.source === "category" ||
      item.source === "topics" ||
      item.source === "itineraries")
  );
}

/** 从 sessionStorage 恢复合辑展示状态（缺失/损坏返回 null） */
function loadCollectionsState(): Collection[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(COLLECTIONS_STATE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isCollection)) return parsed;
    return null;
  } catch {
    return null;
  }
}

/** 合辑展示状态写入 sessionStorage（尽力而为，失败不影响功能） */
function persistCollectionsState(collections: Collection[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      COLLECTIONS_STATE_KEY,
      JSON.stringify(collections)
    );
  } catch {
    // 忽略：缓存写入失败不影响功能
  }
}

/** 灵感合辑（默认批 + Generate more 追加；数据源：Wikivoyage 主题自动发现） */
export function useCollections() {
  /** 会话内恢复已展示的合辑（返回主页/刷新保留数量；关闭浏览器后重新默认 3 个） */
  const [collections, setCollections] = useState<Collection[]>(
    () => loadCollectionsState() ?? []
  );
  /** 首次初始化：无会话缓存时才走首屏请求 */
  const [isLoading, setIsLoading] = useState(
    () => loadCollectionsState() === null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasMore, setHasMore] = useState(() => {
    const restored = loadCollectionsState();
    return (
      restored !== null &&
      restored.length > 0 &&
      restored.length < MAX_COLLECTIONS_DISPLAYED
    );
  });

  useEffect(() => {
    if (!isLoading) return;
    let cancelled = false;
    inspirationsService
      .getCollections()
      .then((result) => {
        if (!cancelled) {
          setCollections(result);
          persistCollectionsState(result);
          setHasMore(
            result.length > 0 && result.length < MAX_COLLECTIONS_DISPLAYED
          );
        }
      })
      .catch(() => {
        // 合辑加载失败不打断页面：保持空列表，由组件展示降级文案
        if (!cancelled) {
          setCollections([]);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading]);

  /** 生成更多合辑（追加下一批；进行中禁用，累计达上限后 hasMore=false） */
  const generateMore = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const more = await inspirationsService.getMoreCollections();
      const next = [...collections, ...more];
      setCollections(next);
      persistCollectionsState(next);
      setHasMore(
        more.length > 0 && next.length < MAX_COLLECTIONS_DISPLAYED
      );
    } catch {
      // 追加失败：保留现有列表与 hasMore，用户可重试
    } finally {
      setIsGenerating(false);
    }
  }, [collections, isGenerating]);

  return { collections, isLoading, isGenerating, hasMore, generateMore };
}

/** 合辑详情（数据源：Wikivoyage 主题聚合；跨会话直连详情页时按需聚合） */
export function useCollectionDetail(collectionId: string) {
  /** 结果携带所属 collectionId：路由切换期间的过渡态由派生逻辑显示加载 */
  const [result, setResult] = useState(() => ({
    collectionId,
    detail: null as CollectionDetail | null,
    isLoading: true,
    error: false,
  }));

  useEffect(() => {
    if (!collectionId) return;
    let cancelled = false;
    inspirationsService
      .getCollectionDetail(collectionId)
      .then((detail) => {
        if (!cancelled) {
          setResult({ collectionId, detail, isLoading: false, error: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({
            collectionId,
            detail: null,
            isLoading: false,
            error: true,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  // collectionId 已变化但新结果未到：显示加载过渡态
  if (result.collectionId !== collectionId) {
    return { detail: null, isLoading: true, error: false };
  }
  return {
    detail: result.detail,
    isLoading: result.isLoading,
    error: result.error,
  };
}

/** 附近灵感（geosearch 附近目的地；坐标为空时不请求） */
export function useNearbyInspirations(lat?: number, lon?: number) {
  const hasCoords = typeof lat === "number" && typeof lon === "number";
  const coordKey = hasCoords ? `${lat}|${lon}` : "";
  /** 结果携带来源坐标键：切换成员期间的过渡态由派生逻辑显示加载 */
  const [result, setResult] = useState(() => ({
    coordKey: "",
    nearby: [] as NearbyInspiration[],
    isLoading: false,
  }));

  useEffect(() => {
    if (typeof lat !== "number" || typeof lon !== "number") {
      // 无坐标：不请求、不改状态（附近区仅在选中成员有坐标时渲染）
      return;
    }
    let cancelled = false;
    inspirationsService
      .getNearbyInspirations(lat, lon)
      .then((list) => {
        if (!cancelled) {
          setResult({ coordKey, nearby: list, isLoading: false });
        }
      })
      .catch(() => {
        // 附近推荐失败不打扰用户：空列表即可
        if (!cancelled) {
          setResult({ coordKey, nearby: [], isLoading: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [coordKey, lat, lon]);

  if (!hasCoords) {
    return { nearby: [], isLoading: false };
  }
  // 坐标已变化但新结果未到：显示加载过渡态
  if (result.coordKey !== coordKey) {
    return { nearby: [], isLoading: true };
  }
  return { nearby: result.nearby, isLoading: result.isLoading };
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

  /** 删除一条收藏（未登录/会话失效时提示用户，不中断页面） */
  const removeItem = useCallback(
    async (id: string) => {
      try {
        await favoritesService.removeSavedItem(id);
        await refresh();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Failed to remove favourite"
        );
      }
    },
    [refresh]
  );

  /** 切换地点收藏状态（收藏/取消收藏）并刷新列表（未登录时提示用户） */
  const toggleItem = useCallback(
    async (poi: PoiItem) => {
      try {
        await favoritesService.togglePoiFavourite(poi);
        await refresh();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Failed to toggle favourite"
        );
      }
    },
    [refresh]
  );

  /** 将单个地点加入行程（经 RoutePlannerBridge 调用模块 02 导入接口，返回结果供 UI 反馈） */
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

/** 图片请求并发上限（免费配额保护：Wikimedia 匿名配额、Mapillary 免费套餐） */
const IMAGE_FETCH_CONCURRENCY = 4;

/**
 * 地点图片懒加载（Recommended Places 与 Search&Filter 的统一封装）：
 * 对传入地点分批并发（IMAGE_FETCH_CONCURRENCY）请求图片，返回 id → 图片结果
 * 映射（PlaceImageResult：url + 作者/许可署名 attribution）；加载中/无图结果
 * 为 null/undefined（前端展示无图 Icon）。
 * 统一经 discoveryService.getPlaceImage（单一查询链：Wikivoyage 条目配图 →
 * Wikipedia 条目配图 → Wikimedia Commons Geosearch → Mapillary 兜底，均带
 * 马来西亚范围、地点/景点过滤与开源协议署名；内部缓存：内存 URL 短期缓存 +
 * 内存/sessionStorage/KV 引用缓存），重复浏览/翻页不重复消耗免费 API 额度。
 * 开源协议合规：结果携带 attribution（原作者 + 许可声明，如 CC BY-SA 4.0），
 * 展示图片时必须一并展示（见 PlaceImageAttribution 组件）。
 * 缓存键：place.placeId（Geoapify place_id）优先，缺失时用 place.id
 * （如 Recommended Places 的 json-{jsonId}）。
 * 依赖地点 id 列表（序列化 key）：仅当地点集合变化时重新加载。
 * lat/lon：可选；有坐标时查询链追加 Commons Geosearch 与 Mapillary
 * （按经纬度搜索，马来西亚限定），无坐标跳过（Wikivoyage/Wikipedia 搜索仍可用）。
 */
export function usePlaceImages(
  places: Array<{
    id: string;
    placeId?: string;
    name: string;
    /** 纬度（可选；Commons Geosearch / Mapillary 兜底需要，无坐标时跳过） */
    lat?: number;
    /** 经度（可选；Commons Geosearch / Mapillary 兜底需要，无坐标时跳过） */
    lon?: number;
  }>
): Record<string, PlaceImageResult> {
  const [images, setImages] = useState<Record<string, PlaceImageResult>>({});
  /** 地点 id 集合序列化键（避免每次渲染的数组引用变化触发重复请求） */
  const placeKey = useMemo(
    () => places.map((place) => place.id).join("|"),
    [places]
  );

  useEffect(() => {
    let cancelled = false;
    setImages({}); // 地点集合变化时重置，未加载完成的卡片显示占位

    const run = async () => {
      for (let i = 0; i < places.length; i += IMAGE_FETCH_CONCURRENCY) {
        const chunk = places.slice(i, i + IMAGE_FETCH_CONCURRENCY);
        const results = await Promise.all(
          chunk.map(async (place) => ({
            id: place.id,
            result: await discoveryService.getPlaceImage(
              place.placeId ?? place.id,
              place.name,
              place.lat,
              place.lon
            ),
          }))
        );
        if (cancelled) return;
        setImages((prev) => {
          const next = { ...prev };
          for (const item of results) {
            next[item.id] = item.result ?? { url: "" };
          }
          return next;
        });
      }
    };
    // getPlaceImage 内部已全部降级（失败返回 null），此处仅防御
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
