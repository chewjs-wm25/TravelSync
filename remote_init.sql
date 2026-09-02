-- 01 用户与账号系统 (Module 01)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  ic_hash TEXT,
  profile_picture TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_locked INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  lock_until TEXT,
  last_login TEXT,
  created_at TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  has_password INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'light',
  privacy_level TEXT NOT NULL DEFAULT 'private',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  ip_address TEXT,
  details TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 预设测试用户数据 (密码统一为 Demo123!)
INSERT INTO users (id, username, email, password_hash, full_name, profile_picture, is_verified, is_active, failed_attempts, is_locked, lock_until, created_at, role)
VALUES 
('dev-user-001', 'flandre', 'flandre@travelsync.com', 'travelsyncsalt1234567890abcdef12.bx7fGP2LsHhlJe7ejDq4D0YYQaEqPAmdVW4l3SI0StQ', 'Flandre Scarlet', '/images.jpg', 1, 1, 0, 0, NULL, datetime('now'), 'admin'),
('m_marcus', 'marcus', 'marcus@travelsync.com', 'travelsyncsalt1234567890abcdef12.bx7fGP2LsHhlJe7ejDq4D0YYQaEqPAmdVW4l3SI0StQ', 'Marcus Vance', NULL, 1, 1, 0, 0, NULL, datetime('now'), 'user'),
('m_elena', 'elena', 'elena@travelsync.com', 'travelsyncsalt1234567890abcdef12.bx7fGP2LsHhlJe7ejDq4D0YYQaEqPAmdVW4l3SI0StQ', 'Elena Rostova', NULL, 1, 1, 0, 0, NULL, datetime('now'), 'user'),
('m_jordan', 'jordan', 'jordan@travelsync.com', 'travelsyncsalt1234567890abcdef12.bx7fGP2LsHhlJe7ejDq4D0YYQaEqPAmdVW4l3SI0StQ', 'Jordan Lee', NULL, 1, 1, 0, 0, NULL, datetime('now'), 'user')
ON CONFLICT(id) DO NOTHING;

-- 05 多人协作系统 (Module 05)
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

CREATE TABLE IF NOT EXISTS Itinerary (
  ItineraryID TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  Title       TEXT NOT NULL,
  Date        TEXT,
  TripID      TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS Collaborators (
  collaborator_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  role            TEXT NOT NULL DEFAULT 'Viewer'
                  CHECK (role IN ('Owner', 'Editor', 'Viewer')),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'pending', 'removed')),
  joined_at       TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_seen       TEXT,
  trip_id         TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id),
  invited_by      TEXT REFERENCES users(id),
  UNIQUE (trip_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS chats (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id    TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id),
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id    TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id),
  action     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS trip_likes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  trip_id TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(trip_id, user_id)
);

-- 预设协作演示数据
INSERT INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID) VALUES
  ('trip_langkawi', 'Langkawi Island Escape', '2026-12-20', '2026-12-27', 'Langkawi, Kedah, Malaysia', 'planning', NULL, 'dev-user-001')
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
  ('c_flandre', 'Owner',  'active', 'trip_langkawi', 'dev-user-001', NULL),
  ('c_marcus',  'Editor', 'active', 'trip_langkawi', 'm_marcus', 'dev-user-001'),
  ('c_elena',   'Editor', 'active', 'trip_langkawi', 'm_elena',  'dev-user-001'),
  ('c_jordan',  'Viewer', 'active', 'trip_langkawi', 'm_jordan', 'dev-user-001')
ON CONFLICT(collaborator_id) DO NOTHING;

INSERT INTO Collaboration_Invitations (invitation_id, Token, receiver_email, role, status, expires_at, trip_id, sender_id) VALUES
  ('inv_seed', 'seed-token-langkawi', 'sam.lee@outlook.com', 'Viewer', 'pending',
   strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+25 days'), 'trip_langkawi', 'dev-user-001')
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
