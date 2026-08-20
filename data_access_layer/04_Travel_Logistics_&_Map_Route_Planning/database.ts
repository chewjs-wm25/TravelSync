/**
 * Database CRUD operations for Travel Logistics Module
 * 
 * This file contains database operations for:
 * - Saved routes (CRUD)
 * - Vehicles (CRUD)
 * 
 * NOTE: For Sprint 2, routes are stored in localStorage via Zustand persist middleware
 * These functions are prepared for Sprint 3 when we move to full database backend
 */

import type { SavedRoute, Vehicle } from '@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore';

/**
 * API endpoint base - update this when backend is ready
 */
const API_BASE = '/api/04-travel-logistics';

// ============================================
// SAVED ROUTES DATABASE OPERATIONS
// ============================================

export interface SavedRouteDB {
  id: string;
  user_id: string;
  name: string;
  origin_name?: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_name?: string;
  destination_lat?: number;
  destination_lng?: number;
  distance_km: number;
  time_minutes: number;
  fuel_liters: number;
  fuel_cost: number;
  vehicle_type: string;
  optimization_mode: string;
  vehicle_id?: string;
  route_points: string; // JSON string
  created_at: string;
}

/**
 * Save route to database
 * Sprint 2: Returns mock success
 * Sprint 3: Will persist to SQLite database
 */
export async function saveRouteDB(route: SavedRoute): Promise<boolean> {
  try {
    if (!route.userId) {
      console.warn('Cannot save route without userId');
      return false;
    }

    const dbRoute: SavedRouteDB = {
      id: route.id,
      user_id: route.userId,
      name: route.name,
      origin_name: route.origin?.name,
      origin_lat: route.origin?.lat,
      origin_lng: route.origin?.lng,
      destination_name: route.destination?.name,
      destination_lat: route.destination?.lat,
      destination_lng: route.destination?.lng,
      distance_km: route.summary.distanceKm,
      time_minutes: route.summary.timeMinutes,
      fuel_liters: route.summary.fuelLiters,
      fuel_cost: route.summary.fuelCost,
      vehicle_type: route.vehicleType,
      optimization_mode: route.optimizationMode,
      vehicle_id: route.vehicleId,
      route_points: JSON.stringify(route.routePoints),
      created_at: route.createdAt || new Date().toISOString(),
    };

    // Sprint 2: Mock implementation
    console.log('📍 [Sprint 2] Saving route to localStorage:', dbRoute.name);
    return true;

    // Sprint 3: Uncomment for database integration
    // const response = await fetch(`${API_BASE}/routes`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(dbRoute),
    // });
    // return response.ok;
  } catch (error) {
    console.error('Error saving route:', error);
    return false;
  }
}

/**
 * Get all saved routes for a user
 */
export async function getSavedRoutesDB(userId: string): Promise<SavedRoute[]> {
  try {
    // Sprint 2: Mock implementation (return empty - will use localStorage)
    console.log('📍 [Sprint 2] Loading routes from localStorage for user:', userId);
    return [];

    // Sprint 3: Uncomment for database integration
    // const response = await fetch(`${API_BASE}/routes?user_id=${userId}`);
    // if (!response.ok) return [];
    // const routes = await response.json();
    // return routes.map((r: SavedRouteDB) => convertDBToRoute(r));
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
}

/**
 * Get a single saved route
 */
export async function getSavedRouteDB(routeId: string): Promise<SavedRoute | null> {
  try {
    // Sprint 2: Mock implementation
    console.log('📍 [Sprint 2] Loading route from localStorage:', routeId);
    return null;

    // Sprint 3: Uncomment for database integration
    // const response = await fetch(`${API_BASE}/routes/${routeId}`);
    // if (!response.ok) return null;
    // const route = await response.json();
    // return convertDBToRoute(route);
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

/**
 * Delete a saved route
 */
export async function deleteRouteDB(routeId: string): Promise<boolean> {
  try {
    // Sprint 2: Mock implementation
    console.log('📍 [Sprint 2] Deleting route from localStorage:', routeId);
    return true;

    // Sprint 3: Uncomment for database integration
    // const response = await fetch(`${API_BASE}/routes/${routeId}`, {
    //   method: 'DELETE',
    // });
    // return response.ok;
  } catch (error) {
    console.error('Error deleting route:', error);
    return false;
  }
}

/**
 * Update a saved route
 */
export async function updateRouteDB(route: SavedRoute): Promise<boolean> {
  try {
    if (!route.userId) {
      console.warn('Cannot update route without userId');
      return false;
    }

    const dbRoute: SavedRouteDB = {
      id: route.id,
      user_id: route.userId,
      name: route.name,
      origin_name: route.origin?.name,
      origin_lat: route.origin?.lat,
      origin_lng: route.origin?.lng,
      destination_name: route.destination?.name,
      destination_lat: route.destination?.lat,
      destination_lng: route.destination?.lng,
      distance_km: route.summary.distanceKm,
      time_minutes: route.summary.timeMinutes,
      fuel_liters: route.summary.fuelLiters,
      fuel_cost: route.summary.fuelCost,
      vehicle_type: route.vehicleType,
      optimization_mode: route.optimizationMode,
      vehicle_id: route.vehicleId,
      route_points: JSON.stringify(route.routePoints),
      created_at: route.createdAt || new Date().toISOString(),
    };

    // Sprint 2: Mock implementation
    console.log('📍 [Sprint 2] Updating route in localStorage:', dbRoute.name);
    return true;

    // Sprint 3: Uncomment for database integration
    // const response = await fetch(`${API_BASE}/routes/${route.id}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(dbRoute),
    // });
    // return response.ok;
  } catch (error) {
    console.error('Error updating route:', error);
    return false;
  }
}

// ============================================
// VEHICLES DATABASE OPERATIONS
// ============================================

/**
 * Save vehicle to database
 */
export async function saveVehicleDB(vehicle: Vehicle, userId: string): Promise<boolean> {
  try {
    // Sprint 2: Mock implementation
    console.log('📍 [Sprint 2] Saving vehicle to localStorage:', vehicle.name);
    return true;

    // Sprint 3: Uncomment for database integration
    // const response = await fetch(`${API_BASE}/vehicles`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     ...vehicle,
    //     user_id: userId,
    //   }),
    // });
    // return response.ok;
  } catch (error) {
    console.error('Error saving vehicle:', error);
    return false;
  }
}

/**
 * Get all vehicles for a user
 */
export async function getVehiclesDB(userId: string): Promise<Vehicle[]> {
  try {
    // Sprint 2: Mock implementation
    console.log('📍 [Sprint 2] Loading vehicles from localStorage for user:', userId);
    return [];

    // Sprint 3: Uncomment for database integration
    // const response = await fetch(`${API_BASE}/vehicles?user_id=${userId}`);
    // if (!response.ok) return [];
    // return response.json();
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }
}

/**
 * Delete a vehicle from database
 */
export async function deleteVehicleDB(vehicleId: string): Promise<boolean> {
  try {
    // Sprint 2: Mock implementation
    console.log('📍 [Sprint 2] Deleting vehicle from localStorage:', vehicleId);
    return true;

    // Sprint 3: Uncomment for database integration
    // const response = await fetch(`${API_BASE}/vehicles/${vehicleId}`, {
    //   method: 'DELETE',
    // });
    // return response.ok;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return false;
  }
}

/**
 * Update a vehicle in database
 */
export async function updateVehicleDB(vehicle: Vehicle, userId: string): Promise<boolean> {
  try {
    // Sprint 2: Mock implementation
    console.log('📍 [Sprint 2] Updating vehicle in localStorage:', vehicle.name);
    return true;

    // Sprint 3: Uncomment for database integration
    // const response = await fetch(`${API_BASE}/vehicles/${vehicle.id}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     ...vehicle,
    //     user_id: userId,
    //   }),
    // });
    // return response.ok;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert database route to SavedRoute type
 * Helper for Sprint 3 database integration
 */
function convertDBToRoute(dbRoute: SavedRouteDB): SavedRoute {
  return {
    id: dbRoute.id,
    name: dbRoute.name,
    userId: dbRoute.user_id,
    origin: dbRoute.origin_lat && dbRoute.origin_lng ? {
      id: `origin-${dbRoute.id}`,
      name: dbRoute.origin_name || 'Origin',
      lat: dbRoute.origin_lat,
      lng: dbRoute.origin_lng,
    } : undefined,
    destination: dbRoute.destination_lat && dbRoute.destination_lng ? {
      id: `dest-${dbRoute.id}`,
      name: dbRoute.destination_name || 'Destination',
      lat: dbRoute.destination_lat,
      lng: dbRoute.destination_lng,
    } : undefined,
    summary: {
      distanceKm: dbRoute.distance_km,
      timeMinutes: dbRoute.time_minutes,
      fuelLiters: dbRoute.fuel_liters,
      fuelCost: dbRoute.fuel_cost,
    },
    vehicleType: dbRoute.vehicle_type as any,
    optimizationMode: dbRoute.optimization_mode as any,
    routePoints: JSON.parse(dbRoute.route_points),
    vehicleId: dbRoute.vehicle_id,
    createdAt: dbRoute.created_at,
  };
}
