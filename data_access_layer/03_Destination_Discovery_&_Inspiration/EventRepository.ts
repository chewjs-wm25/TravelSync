/**
 * EventRepository — 模块 03 节日/活动仓储接口（Data Access Layer）
 *
 * 职责（单一）：
 *   - 封装"节日/活动"数据的持久化读写（来源：parsed_events.json，
 *     由 DEV 同步按钮写入 Cloudflare D1）；
 *   - 不包含任何业务判断（映射/编排由 Business Logic Layer 负责）。
 *
 * 实现类：
 *   - HardcodedEventRepository（浏览器端）：直接读取 parsed_events.json；
 *   - D1EventRepository（服务端）：操作 Cloudflare D1（SQL 内聚于此）；
 *   - RemoteEventRepository（浏览器端）：经 Route API 转发到服务端实现。
 *
 * 调用方（Business Logic Layer）只依赖本接口，切换实现时无需改动。
 */

// ---------------------------------------------------------------------------
// 实体类型（对应 D1 表 events 的一行）
// ---------------------------------------------------------------------------

/** 节日/活动条目：由 parsed_events.json 解析而来 */
export interface EventEntity {
  /** 活动唯一标识（由 title 生成的稳定 slug，D1 主键） */
  id: string;
  /** 活动名称 */
  title: string;
  /** 活动分类（如 "Arts & Culture"、"Sports"），D1 中以 JSON 字符串存储 */
  categories: string[];
  /** 活动举办日期区间（如 "19 Jun 2026 - 25 Apr 2027"） */
  date: string;
  /** 活动举办地点 */
  location: string;
  /** 活动官方页面 URL */
  url: string;
  /** 写入/更新时间戳（毫秒） */
  syncedAt: number;
}

// ---------------------------------------------------------------------------
// 仓储接口
// ---------------------------------------------------------------------------

export interface EventRepository {
  /** 列出全部活动条目 */
  listAll(): Promise<EventEntity[]>;
  /** 批量写入/更新（按 id upsert）；返回实际写入条数 */
  upsertAll(items: EventEntity[]): Promise<number>;
  /** 清空全部活动数据；返回删除条数 */
  clearAll(): Promise<number>;
}
