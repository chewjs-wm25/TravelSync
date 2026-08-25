-- ============================================================
-- TravelSync · 模块 05 Collaboration & Shared Planning
-- Cloudflare D1 (SQLite) schema
-- 来源：ERD 相关 6 张表 + 补齐 UI 现有评论(chats)/动态(activity)
-- ENUM → TEXT CHECK; VARCHAR → TEXT; Date/DATETIME → TEXT(ISO8601)
-- 
-- 注意：用户表(users)由模块01管理，此处复用
-- ============================================================

PRAGMA foreign_keys = ON;

-- ---------- 01 用户 ----------
-- 注意：users 表由模块01_User_&_Account_Management管理
-- 结构：id, username, email, password_hash, full_name, phone, ic_hash,
--        profile_picture, is_verified, is_active, is_locked, failed_attempts,
--        lock_until, last_login, created_at, role

-- ---------- 02 行程 (Trip) ----------
CREATE TABLE IF NOT EXISTS Trip (
  TripID       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  TripName     TEXT NOT NULL,
  StartDate    TEXT,
  EndDate      TEXT,
  Region       TEXT,
  Status       TEXT NOT NULL DEFAULT 'planning'
               CHECK (Status IN ('planning', 'active', 'completed', 'cancelled')),
  TripNote     TEXT,
  UserID       TEXT NOT NULL REFERENCES users(id)
);

-- ---------- 03 行程日程 (Itinerary) ----------
CREATE TABLE IF NOT EXISTS Itinerary (
  ItineraryID TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  Title       TEXT NOT NULL,
  Date        TEXT,
  TripID      TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE
);

-- ---------- 04 明细 (Itinerary_Item) ----------
CREATE TABLE IF NOT EXISTS Itinerary_Item (
  ItemID        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ItemName      TEXT NOT NULL,
  Type          TEXT NOT NULL DEFAULT 'attraction'
                CHECK (Type IN ('attraction', 'restaurant', 'hotel', 'transport', 'activity', 'other')),
  ReferenceID   TEXT,
  Destination   TEXT,
  StartTime     TEXT,
  EndTime       TEXT,
  Status        TEXT NOT NULL DEFAULT 'planned'
                CHECK (Status IN ('planned', 'booked', 'completed', 'cancelled')),
  ItineraryNote TEXT,
  ItineraryID   TEXT NOT NULL REFERENCES Itinerary(ItineraryID) ON DELETE CASCADE
);

-- ---------- 05 协作成员 (Collaborators) ----------
CREATE TABLE IF NOT EXISTS Collaborators (
  collaborator_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  role            TEXT NOT NULL DEFAULT 'Viewer'
                  CHECK (role IN ('Owner', 'Editor', 'Viewer')),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'pending', 'removed')),
  joined_at       TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  trip_id         TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id),
  invited_by      TEXT REFERENCES users(id),
  UNIQUE (trip_id, user_id)
);

-- ---------- 06 协作邀请 (Collaboration_Invitations) ----------
CREATE TABLE IF NOT EXISTS Collaboration_Invitations (
  invitation_id     TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  Token             TEXT NOT NULL UNIQUE,
  receiver_email    TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'Viewer'
                    CHECK (role IN ('Editor', 'Viewer')),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at        TEXT NOT NULL,
  sent_at           TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  trip_id           TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  sender_id         TEXT NOT NULL REFERENCES users(id),
  receiver_user_id  TEXT REFERENCES users(id)
);

-- ---------- 07 群聊 / 评论 (chats) — 补充表 ----------
CREATE TABLE IF NOT EXISTS chats (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id    TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id),
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ---------- 08 动态日志 (activity_logs) — 补充表 ----------
CREATE TABLE IF NOT EXISTS activity_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id    TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id),
  action     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ============================================================
-- Seed 数据（demo：与旧 CollabStore 界面一致）
-- 注意：users 表数据需要由模块01管理，此处仅插入协作相关数据
-- ============================================================

-- Trip seed data
INSERT INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID) VALUES
  ('trip_langkawi', 'Langkawi Island Escape', '2026-12-20', '2026-12-27', 'Langkawi, Kedah, Malaysia', 'planning', NULL, 'm_marcus')
ON CONFLICT(TripID) DO NOTHING;

INSERT INTO Itinerary (ItineraryID, Title, Date, TripID) VALUES
  ('itin_day1', 'Day 1', '2026-12-20', 'trip_langkawi'),
  ('itin_day2', 'Day 2', '2026-12-21', 'trip_langkawi'),
  ('itin_day3', 'Day 3', '2026-12-22', 'trip_langkawi')
ON CONFLICT(ItineraryID) DO NOTHING;

INSERT INTO Itinerary_Item (ItemID, ItemName, Type, ItineraryNote, ItineraryID) VALUES
  ('it_1', 'Arrive Langkawi, check in at Cenang',       'hotel',     'SkyCab cable car',                 'itin_day1'),
  ('it_2', 'Sunset dinner at Pantai Cenang',             'restaurant', NULL,                             'itin_day1'),
  ('it_3', 'Island hopping (Pulau Dayang Bunting)',      'activity',  'Bring sunscreen',                 'itin_day2'),
  ('it_4', 'Kilim Karst Geoforest mangrove tour',        'activity',  NULL,                             'itin_day2'),
  ('it_5', 'Underwater World Langkawi',                  'attraction', NULL,                            'itin_day3')
ON CONFLICT(ItemID) DO NOTHING;

INSERT INTO Collaborators (collaborator_id, role, status, trip_id, user_id, invited_by) VALUES
  ('c_marcus', 'Owner',  'active', 'trip_langkawi', 'm_marcus', NULL),
  ('c_elena',  'Editor', 'active', 'trip_langkawi', 'm_elena',  'm_marcus'),
  ('c_jordan', 'Viewer', 'active', 'trip_langkawi', 'm_jordan', 'm_marcus')
ON CONFLICT(collaborator_id) DO NOTHING;

INSERT INTO Collaboration_Invitations (invitation_id, Token, receiver_email, role, status, expires_at, trip_id, sender_id) VALUES
  ('inv_seed', 'seed-token-langkawi', 'sam.lee@outlook.com', 'Viewer', 'pending',
   strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+25 days'), 'trip_langkawi', 'm_marcus')
ON CONFLICT(invitation_id) DO NOTHING;

INSERT INTO chats (trip_id, user_id, text, created_at)
SELECT 'trip_langkawi', 'm_marcus', 'I''ve updated the cable car timing for Day 1.', strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-30 minutes')
WHERE NOT EXISTS (SELECT 1 FROM chats WHERE trip_id = 'trip_langkawi' AND user_id = 'm_marcus' AND text = 'I''ve updated the cable car timing for Day 1.');

INSERT INTO chats (trip_id, user_id, text, created_at)
SELECT 'trip_langkawi', 'm_elena',  'Perfect! Just checked the PDF export.',        strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-27 minutes')
WHERE NOT EXISTS (SELECT 1 FROM chats WHERE trip_id = 'trip_langkawi' AND user_id = 'm_elena' AND text = 'Perfect! Just checked the PDF export.');

INSERT INTO activity_logs (trip_id, user_id, action, created_at)
SELECT 'trip_langkawi', 'm_marcus', 'created the trip',                       strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-6 days')
WHERE NOT EXISTS (SELECT 1 FROM activity_logs WHERE trip_id = 'trip_langkawi' AND user_id = 'm_marcus' AND action = 'created the trip');

INSERT INTO activity_logs (trip_id, user_id, action, created_at)
SELECT 'trip_langkawi', 'm_marcus', 'invited sam.lee@outlook.com as Viewer',  strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-5 days')
WHERE NOT EXISTS (SELECT 1 FROM activity_logs WHERE trip_id = 'trip_langkawi' AND user_id = 'm_marcus' AND action = 'invited sam.lee@outlook.com as Viewer');

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
