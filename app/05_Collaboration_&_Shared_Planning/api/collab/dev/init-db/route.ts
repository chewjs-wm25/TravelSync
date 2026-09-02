import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";
import { ensureAccountSchema } from "@/data_access_layer/01_User_&_Account_Management/AccountSchema";

const DEMO_PASSWORD = "Demo123!";

const DEMO_USERS = [
  { id: "dev-user-001", username: "flandre", email: "flandre@travelsync.com", full_name: "Flandre Scarlet" },
  { id: "m_marcus", username: "marcus", email: "marcus@travelsync.com", full_name: "Marcus Chen" },
  { id: "m_elena", username: "elena", email: "elena@travelsync.com", full_name: "Elena Rodriguez" },
  { id: "m_jordan", username: "jordan", email: "jordan@travelsync.com", full_name: "Jordan Lee" },
];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS Trip (
    TripID TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    TripName TEXT NOT NULL, StartDate TEXT, EndDate TEXT, Region TEXT,
    Status TEXT NOT NULL DEFAULT 'planning' CHECK (Status IN ('planning','active','completed','cancelled')),
    TripNote TEXT, UserID TEXT NOT NULL REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS Itinerary (
    ItineraryID TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    Title TEXT NOT NULL, Date TEXT, TripID TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS Itinerary_Item (
    ItemID TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    ItemName TEXT NOT NULL,
    Type TEXT NOT NULL DEFAULT 'attraction' CHECK (Type IN ('attraction','restaurant','hotel','transport','activity','other')),
    ReferenceID TEXT, Destination TEXT, StartTime TEXT, EndTime TEXT,
    Status TEXT NOT NULL DEFAULT 'planned' CHECK (Status IN ('planned','booked','completed','cancelled')),
    ItineraryNote TEXT, ItineraryID TEXT NOT NULL REFERENCES Itinerary(ItineraryID) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS Collaborators (
    collaborator_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    role TEXT NOT NULL DEFAULT 'Viewer' CHECK (role IN ('Owner','Editor','Viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','removed')),
    joined_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    last_seen TEXT,
    trip_id TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    invited_by TEXT REFERENCES users(id),
    UNIQUE (trip_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS Collaboration_Invitations (
    invitation_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    Token TEXT NOT NULL UNIQUE, receiver_email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Viewer' CHECK (role IN ('Editor','Viewer')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
    expires_at TEXT NOT NULL,
    sent_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    trip_id TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id),
    receiver_user_id TEXT REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )`,
  `INSERT INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID)
   VALUES ('trip_langkawi','Langkawi Island Escape','2026-12-20','2026-12-27','Langkawi, Kedah, Malaysia','planning',NULL,'dev-user-001')
   ON CONFLICT(TripID) DO NOTHING`,
  `INSERT INTO Itinerary (ItineraryID, Title, Date, TripID) VALUES
   ('itin_day1','Day 1','2026-12-20','trip_langkawi'),
   ('itin_day2','Day 2','2026-12-21','trip_langkawi'),
   ('itin_day3','Day 3','2026-12-22','trip_langkawi')
   ON CONFLICT(ItineraryID) DO NOTHING`,
  `INSERT INTO Itinerary_Item (ItemID, ItemName, Type, ItineraryNote, ItineraryID) VALUES
   ('it_1','Arrive Langkawi, check in at Cenang','hotel','SkyCab cable car','itin_day1'),
   ('it_2','Sunset dinner at Pantai Cenang','restaurant',NULL,'itin_day1'),
   ('it_3','Island hopping (Pulau Dayang Bunting)','activity','Bring sunscreen','itin_day2'),
   ('it_4','Kilim Karst Geoforest mangrove tour','activity',NULL,'itin_day2'),
   ('it_5','Underwater World Langkawi','attraction',NULL,'itin_day3')
   ON CONFLICT(ItemID) DO NOTHING`,
  `INSERT INTO Collaborators (collaborator_id, role, status, trip_id, user_id, invited_by) VALUES
   ('c_flandre','Owner','active','trip_langkawi','dev-user-001',NULL),
   ('c_marcus','Editor','active','trip_langkawi','m_marcus','dev-user-001'),
   ('c_elena','Editor','active','trip_langkawi','m_elena','dev-user-001'),
   ('c_jordan','Viewer','active','trip_langkawi','m_jordan','dev-user-001')
   ON CONFLICT(collaborator_id) DO NOTHING`,
  `INSERT INTO Collaboration_Invitations (invitation_id, Token, receiver_email, role, status, expires_at, trip_id, sender_id)
   VALUES ('inv_seed','seed-token-langkawi','sam.lee@outlook.com','Viewer','pending',
   strftime('%Y-%m-%dT%H:%M:%SZ','now','+25 days'),'trip_langkawi','dev-user-001')
   ON CONFLICT(invitation_id) DO NOTHING`,
  `INSERT INTO chats (trip_id, user_id, text, created_at)
   SELECT 'trip_langkawi','m_marcus','I''ve updated the cable car timing for Day 1.',strftime('%Y-%m-%dT%H:%M:%SZ','now','-30 minutes')
   WHERE NOT EXISTS (SELECT 1 FROM chats WHERE trip_id='trip_langkawi' AND user_id='m_marcus' AND text='I''ve updated the cable car timing for Day 1.')`,
  `INSERT INTO chats (trip_id, user_id, text, created_at)
   SELECT 'trip_langkawi','m_elena','Perfect! Just checked the PDF export.',strftime('%Y-%m-%dT%H:%M:%SZ','now','-27 minutes')
   WHERE NOT EXISTS (SELECT 1 FROM chats WHERE trip_id='trip_langkawi' AND user_id='m_elena' AND text='Perfect! Just checked the PDF export.')`,
  `INSERT INTO activity_logs (trip_id, user_id, action, created_at)
   SELECT 'trip_langkawi','m_marcus','created the trip',strftime('%Y-%m-%dT%H:%M:%SZ','now','-6 days')
   WHERE NOT EXISTS (SELECT 1 FROM activity_logs WHERE trip_id='trip_langkawi' AND user_id='m_marcus' AND action='created the trip')`,
  `INSERT INTO activity_logs (trip_id, user_id, action, created_at)
   SELECT 'trip_langkawi','m_marcus','invited sam.lee@outlook.com as Viewer',strftime('%Y-%m-%dT%H:%M:%SZ','now','-5 days')
   WHERE NOT EXISTS (SELECT 1 FROM activity_logs WHERE trip_id='trip_langkawi' AND user_id='m_marcus' AND action='invited sam.lee@outlook.com as Viewer')`,
];

function base64Url(value: string): string {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return base64Url(binary);
}

async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt ?? randomSalt();
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  // 注意：迭代次数不能超过 Cloudflare Workers（workerd）crypto.subtle 的 100000 上限，
  // 且需与 AuthService 的 PBKDF2_ITERATIONS 保持一致。
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(s), iterations: 100000, hash: "SHA-256" }, key, 256);
  let binary = "";
  for (const byte of new Uint8Array(bits)) binary += String.fromCharCode(byte);
  return `${s}.${base64Url(binary)}`;
}

async function seedDemoUsers(db: D1Database) {
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const u of DEMO_USERS) {
    await db
      .prepare(
        `INSERT INTO users (id, username, email, password_hash, full_name, is_verified, is_active, created_at, role)
         VALUES (?, ?, ?, ?, ?, 1, 1, ?, 'user')
         ON CONFLICT(id) DO NOTHING`
      )
      .bind(u.id, u.username, u.email, passwordHash, u.full_name, now)
      .run();
  }
}

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.TEST_DB;
    if (!db) return new Response(JSON.stringify({ success: false, message: "TEST_DB binding not found" }), { status: 500 });
    await ensureAccountSchema(db);
    for (const stmt of SCHEMA_STATEMENTS) {
      try {
        await db.prepare(stmt).run();
      } catch {
        /* ignore */
      }
    }
    return new Response(JSON.stringify({ success: true, message: "DB initialized" }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
}
