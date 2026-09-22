import type { PublicTransportLeg, PublicTransportStop } from "@/api_layer/04_Travel_Logistics_&_Map_Route_Planning/publicTransportApi";
import type { SavedRoute, Vehicle } from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";
import { getDB } from "./db";

export interface SavedRouteDB {
  route_id: string;
  user_id: string;
  name: string;
  origin_id: string | null;
  origin_name: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_id: string | null;
  destination_name: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  vehicle_type: string;
  optimization_mode: string;
  vehicle_id: string | null;
  route_points: string;
  public_transport_stops: string;
  public_transport_legs: string;
  distance_km: number;
  time_minutes: number;
  fuel_liters: number;
  fuel_cost: number;
  energy_kwh: number;
  energy_cost: number;
  carbon_kg: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleDB {
  vehicle_id: string;
  user_id: string;
  name: string;
  category: string;
  fuel_consumption: number;
  fuel_type: string;
  is_default: number;
  created_at: string;
  updated_at: string;
}

const routeSelect = `
  SELECT r.*, a.distance_km, a.time_minutes, a.fuel_liters, a.fuel_cost,
         a.energy_kwh, a.energy_cost, a.carbon_kg
  FROM logistics_saved_routes r
  JOIN logistics_route_analysis a ON a.route_id = r.route_id
`;

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapRoute(row: SavedRouteDB): SavedRoute {
  return {
    id: row.route_id,
    name: row.name,
    userId: row.user_id,
    origin: row.origin_lat !== null && row.origin_lng !== null
      ? {
          id: row.origin_id || `origin-${row.route_id}`,
          name: row.origin_name || "Origin",
          lat: row.origin_lat,
          lng: row.origin_lng,
        }
      : undefined,
    destination: row.destination_lat !== null && row.destination_lng !== null
      ? {
          id: row.destination_id || `destination-${row.route_id}`,
          name: row.destination_name || "Destination",
          lat: row.destination_lat,
          lng: row.destination_lng,
        }
      : undefined,
    summary: {
      distanceKm: row.distance_km,
      timeMinutes: row.time_minutes,
      fuelLiters: row.fuel_liters,
      fuelCost: row.fuel_cost,
      energyKwh: row.energy_kwh,
      energyCost: row.energy_cost,
      carbonKg: row.carbon_kg,
    },
    vehicleType: row.vehicle_type as SavedRoute["vehicleType"],
    optimizationMode: row.optimization_mode as SavedRoute["optimizationMode"],
    routePoints: parseJson(row.route_points, []),
    publicTransportStops: parseJson<PublicTransportStop[]>(row.public_transport_stops, []),
    publicTransportLegs: parseJson<PublicTransportLeg[]>(row.public_transport_legs, []),
    vehicleId: row.vehicle_id || undefined,
    createdAt: row.created_at,
  };
}

function mapVehicle(row: VehicleDB): Vehicle {
  return {
    id: row.vehicle_id,
    name: row.name,
    category: row.category as Vehicle["category"],
    fuelConsumption: row.fuel_consumption,
    fuelType: row.fuel_type,
    isDefault: row.is_default === 1,
  };
}

async function ownedVehicleId(vehicleId: string | undefined, userId: string): Promise<string | null> {
  if (!vehicleId) return null;
  const db = await getDB();
  const vehicle = await db
    .prepare("SELECT vehicle_id FROM logistics_vehicles WHERE vehicle_id = ? AND user_id = ? LIMIT 1")
    .bind(vehicleId, userId)
    .first<{ vehicle_id: string }>();
  return vehicle?.vehicle_id ?? null;
}

function routeValues(route: SavedRoute, userId: string, vehicleId: string | null) {
  return [
    route.id,
    userId,
    route.name,
    route.origin?.id ?? null,
    route.origin?.name ?? null,
    route.origin?.lat ?? null,
    route.origin?.lng ?? null,
    route.destination?.id ?? null,
    route.destination?.name ?? null,
    route.destination?.lat ?? null,
    route.destination?.lng ?? null,
    route.vehicleType,
    route.optimizationMode,
    vehicleId,
    JSON.stringify(route.routePoints),
    JSON.stringify(route.publicTransportStops ?? []),
    JSON.stringify(route.publicTransportLegs ?? []),
  ];
}

function analysisValues(route: SavedRoute, userId: string) {
  return [
    `analysis-${route.id}`,
    route.id,
    userId,
    route.summary.distanceKm,
    route.summary.timeMinutes,
    route.summary.fuelLiters,
    route.summary.fuelCost,
    route.summary.energyKwh,
    route.summary.energyCost,
    route.summary.carbonKg,
  ];
}

const routeColumns = `(route_id, user_id, name, origin_id, origin_name, origin_lat, origin_lng,
  destination_id, destination_name, destination_lat, destination_lng, vehicle_type,
  optimization_mode, vehicle_id, route_points, public_transport_stops, public_transport_legs)`;

export async function saveRouteDB(route: SavedRoute, userId: string): Promise<SavedRoute> {
  const db = await getDB();
  const vehicleId = await ownedVehicleId(route.vehicleId, userId);
  await db.batch([
    db.prepare(`INSERT INTO logistics_saved_routes ${routeColumns}
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(...routeValues(route, userId, vehicleId)),
    db.prepare(`INSERT INTO logistics_route_analysis
      (analysis_id, route_id, user_id, distance_km, time_minutes, fuel_liters, fuel_cost,
       energy_kwh, energy_cost, carbon_kg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(...analysisValues(route, userId)),
  ]);
  return { ...route, userId, vehicleId: vehicleId ?? undefined };
}

export async function getSavedRoutesDB(userId: string): Promise<SavedRoute[]> {
  const db = await getDB();
  const result = await db
    .prepare(`${routeSelect} WHERE r.user_id = ? ORDER BY r.created_at DESC`)
    .bind(userId)
    .all<SavedRouteDB>();
  return (result.results ?? []).map(mapRoute);
}

export async function getSavedRouteDB(userId: string, routeId: string): Promise<SavedRoute | null> {
  const db = await getDB();
  const row = await db
    .prepare(`${routeSelect} WHERE r.user_id = ? AND r.route_id = ? LIMIT 1`)
    .bind(userId, routeId)
    .first<SavedRouteDB>();
  return row ? mapRoute(row) : null;
}

export async function deleteRouteDB(userId: string, routeId: string): Promise<boolean> {
  const db = await getDB();
  const result = await db
    .prepare("DELETE FROM logistics_saved_routes WHERE user_id = ? AND route_id = ?")
    .bind(userId, routeId)
    .run();
  return result.meta.changes > 0;
}

export async function updateRouteDB(route: SavedRoute, userId: string): Promise<SavedRoute | null> {
  const db = await getDB();
  const vehicleId = await ownedVehicleId(route.vehicleId, userId);
  const values = routeValues(route, userId, vehicleId);
  await db.batch([
    db.prepare(`UPDATE logistics_saved_routes SET
      name = ?, origin_id = ?, origin_name = ?, origin_lat = ?, origin_lng = ?,
      destination_id = ?, destination_name = ?, destination_lat = ?, destination_lng = ?,
      vehicle_type = ?, optimization_mode = ?, vehicle_id = ?, route_points = ?,
      public_transport_stops = ?, public_transport_legs = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      WHERE route_id = ? AND user_id = ?`)
      .bind(...values.slice(2), route.id, userId),
    db.prepare(`UPDATE logistics_route_analysis SET
      distance_km = ?, time_minutes = ?, fuel_liters = ?, fuel_cost = ?, energy_kwh = ?,
      energy_cost = ?, carbon_kg = ?, generated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      WHERE route_id = ? AND user_id = ?`)
      .bind(
        route.summary.distanceKm,
        route.summary.timeMinutes,
        route.summary.fuelLiters,
        route.summary.fuelCost,
        route.summary.energyKwh,
        route.summary.energyCost,
        route.summary.carbonKg,
        route.id,
        userId
      ),
  ]);
  return getSavedRouteDB(userId, route.id);
}

export async function saveVehicleDB(vehicle: Vehicle, userId: string): Promise<Vehicle> {
  const db = await getDB();
  if (vehicle.isDefault) {
    await db.prepare("UPDATE logistics_vehicles SET is_default = 0 WHERE user_id = ?").bind(userId).run();
  }
  await db
    .prepare(`INSERT INTO logistics_vehicles
      (vehicle_id, user_id, name, category, fuel_consumption, fuel_type, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(vehicle.id, userId, vehicle.name, vehicle.category, vehicle.fuelConsumption, vehicle.fuelType, vehicle.isDefault ? 1 : 0)
    .run();
  return { ...vehicle };
}

export async function getVehiclesDB(userId: string): Promise<Vehicle[]> {
  const db = await getDB();
  const result = await db
    .prepare("SELECT * FROM logistics_vehicles WHERE user_id = ? ORDER BY is_default DESC, created_at ASC")
    .bind(userId)
    .all<VehicleDB>();
  return (result.results ?? []).map(mapVehicle);
}

export async function deleteVehicleDB(vehicleId: string, userId: string): Promise<boolean> {
  const db = await getDB();
  const result = await db
    .prepare("DELETE FROM logistics_vehicles WHERE vehicle_id = ? AND user_id = ?")
    .bind(vehicleId, userId)
    .run();
  return result.meta.changes > 0;
}

export async function updateVehicleDB(vehicle: Vehicle, userId: string): Promise<Vehicle | null> {
  const db = await getDB();
  if (vehicle.isDefault) {
    await db.prepare("UPDATE logistics_vehicles SET is_default = 0 WHERE user_id = ?").bind(userId).run();
  }
  await db
    .prepare(`UPDATE logistics_vehicles SET
      name = ?, category = ?, fuel_consumption = ?, fuel_type = ?, is_default = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
      WHERE vehicle_id = ? AND user_id = ?`)
    .bind(vehicle.name, vehicle.category, vehicle.fuelConsumption, vehicle.fuelType, vehicle.isDefault ? 1 : 0, vehicle.id, userId)
    .run();
  const row = await db
    .prepare("SELECT * FROM logistics_vehicles WHERE vehicle_id = ? AND user_id = ? LIMIT 1")
    .bind(vehicle.id, userId)
    .first<VehicleDB>();
  return row ? mapVehicle(row) : null;
}

export async function setDefaultVehicleDB(vehicleId: string, userId: string): Promise<Vehicle | null> {
  const db = await getDB();
  await db.batch([
    db.prepare("UPDATE logistics_vehicles SET is_default = 0 WHERE user_id = ?").bind(userId),
    db.prepare("UPDATE logistics_vehicles SET is_default = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE vehicle_id = ? AND user_id = ?").bind(vehicleId, userId),
  ]);
  const row = await db
    .prepare("SELECT * FROM logistics_vehicles WHERE vehicle_id = ? AND user_id = ? LIMIT 1")
    .bind(vehicleId, userId)
    .first<VehicleDB>();
  return row ? mapVehicle(row) : null;
}

export function convertDBToRoute(dbRoute: SavedRouteDB): SavedRoute {
  return mapRoute(dbRoute);
}
