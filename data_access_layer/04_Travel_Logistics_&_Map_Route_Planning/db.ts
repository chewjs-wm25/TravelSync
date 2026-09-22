import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";
import { ensureAccountSchema } from "@/data_access_layer/01_User_&_Account_Management/AccountSchema";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS logistics_vehicles (
    vehicle_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'car' CHECK (category IN ('car', 'motorcycle')),
    fuel_consumption REAL NOT NULL CHECK (fuel_consumption > 0),
    fuel_type TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (user_id, vehicle_id)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_vehicles_one_default
   ON logistics_vehicles(user_id) WHERE is_default = 1`,
  `CREATE INDEX IF NOT EXISTS idx_logistics_vehicles_user
   ON logistics_vehicles(user_id)`,
  `CREATE TABLE IF NOT EXISTS logistics_saved_routes (
    route_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    origin_id TEXT,
    origin_name TEXT,
    origin_lat REAL,
    origin_lng REAL,
    destination_id TEXT,
    destination_name TEXT,
    destination_lat REAL,
    destination_lng REAL,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('car', 'walk', 'public transport')),
    optimization_mode TEXT NOT NULL DEFAULT 'fastest'
      CHECK (optimization_mode IN ('fastest', 'shortest', 'cheapest')),
    vehicle_id TEXT,
    route_points TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(route_points)),
    public_transport_stops TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(public_transport_stops)),
    public_transport_legs TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(public_transport_legs)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (vehicle_id) REFERENCES logistics_vehicles(vehicle_id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_logistics_saved_routes_user
   ON logistics_saved_routes(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_logistics_saved_routes_vehicle
   ON logistics_saved_routes(user_id, vehicle_id)`,
  `CREATE TABLE IF NOT EXISTS logistics_route_analysis (
    analysis_id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    distance_km REAL NOT NULL CHECK (distance_km >= 0),
    time_minutes REAL NOT NULL CHECK (time_minutes >= 0),
    fuel_liters REAL NOT NULL DEFAULT 0 CHECK (fuel_liters >= 0),
    fuel_cost REAL NOT NULL DEFAULT 0 CHECK (fuel_cost >= 0),
    energy_kwh REAL NOT NULL DEFAULT 0 CHECK (energy_kwh >= 0),
    energy_cost REAL NOT NULL DEFAULT 0 CHECK (energy_cost >= 0),
    carbon_kg REAL NOT NULL DEFAULT 0 CHECK (carbon_kg >= 0),
    generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (route_id) REFERENCES logistics_saved_routes(route_id) ON DELETE CASCADE,
    UNIQUE (user_id, route_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_logistics_route_analysis_user
   ON logistics_route_analysis(user_id, generated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_logistics_route_analysis_route
   ON logistics_route_analysis(route_id)`,
];

let initialized: Promise<void> | null = null;

async function initialize(db: D1Database): Promise<void> {
  await ensureAccountSchema(db);
  for (const statement of SCHEMA_STATEMENTS) {
    await db.prepare(statement).run();
  }
}

export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { TEST_DB?: D1Database }).TEST_DB;
  if (!db) throw new Error("D1 binding TEST_DB is required");

  if (!initialized) {
    initialized = initialize(db).catch((error) => {
      initialized = null;
      throw error;
    });
  }
  await initialized;
  return db;
}
