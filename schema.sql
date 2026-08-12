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