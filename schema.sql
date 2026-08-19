CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 模块 03 收藏夹（Favourite List）
-- 每个用户只有一个收藏夹：不区分文件夹，条目按 user_id 归属。
CREATE TABLE IF NOT EXISTS favorite_items (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  place_id        TEXT NOT NULL,
  name            TEXT NOT NULL,
  thumbnail_url   TEXT NOT NULL DEFAULT '',
  experience_type TEXT NOT NULL DEFAULT '',
  created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_favorite_items_user ON favorite_items(user_id);

-- 模块 03 官方品质评级（Official Quality Rating）
-- 来源：官方评级 hardcode JSON（人工爬取），经 Geoapify 补全地点详情后写入。
-- json_id 为 JSON 原始条目 id（主键）；place_id 为 Geoapify Place ID；其余为地点详情字段。
CREATE TABLE IF NOT EXISTS official_quality_ratings (
  json_id         TEXT PRIMARY KEY,
  company_name    TEXT NOT NULL,
  company_address TEXT NOT NULL,
  company_phone   TEXT,
  duration        TEXT NOT NULL,
  award_category  TEXT NOT NULL,
  place_id        TEXT,
  name            TEXT,
  formatted       TEXT,
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT,
  country_code    TEXT,
  category        TEXT,
  result_type     TEXT,
  lat             REAL,
  lon             REAL,
  confidence      REAL,
  synced_at       INTEGER NOT NULL
);

-- 模块 03 节日/活动（Festivals & Events）
-- 来源：parsed_events.json（人工爬取），由 DEV 页同步按钮写入。
-- id 为活动 title 生成的稳定 slug（主键）；categories 以 JSON 字符串存储。
CREATE TABLE IF NOT EXISTS events (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  categories TEXT NOT NULL DEFAULT '[]',
  date       TEXT NOT NULL,
  location   TEXT NOT NULL,
  url        TEXT NOT NULL,
  synced_at  INTEGER NOT NULL
);