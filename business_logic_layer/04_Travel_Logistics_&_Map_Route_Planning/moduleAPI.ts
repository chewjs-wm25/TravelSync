/**
 * TravelSync Module 04: Travel Logistics & Map Route Planning
 * Public API for other modules to interact with
 */

import { useTripNavigationStore } from './useTripNavigationStore';
import type {
  Stop,
  RoutePoint,
  RouteSummary,
  Vehicle,
  SavedRoute,
  VehicleType,
  VehicleCategory,
  OptimizationMode,
} from './useTripNavigationStore';
import {
  getGoogleMapsUrl,
  getWazeUrl,
} from '@/api_layer/04_Travel_Logistics_&_Map_Route_Planning/navigationApi';

/**
 * Module 04 Public API
 * 
 * This module provides route planning, optimization, and logistics management.
 * Other modules can use these functions for:
 * - Generating routes from origin to destination
 * - Optimizing routes (fastest, shortest, cheapest)
 * - Saving routes with trip planning
 * - Exporting routes to navigation apps
 */

// ============================================
// ROUTE GENERATION & MANAGEMENT
// ============================================

/**
 * Generate a route between origin and destination
 * Called by: Module 2 (Trip Planning) - to create itinerary items
 * 
 * @param origin - Starting location (can come from Module 3: Discovery)
 * @param destination - Ending location (can come from Module 3: Discovery)
 * @param vehicleType - Type of vehicle (car, walk, public transport)
 * @param optimizationMode - Route optimization preference
 */
export async function generateRoute(
  origin: Stop,
  destination: Stop,
  vehicleType: VehicleType = 'car',
  optimizationMode: OptimizationMode = 'fastest'
): Promise<{
  routePoints: RoutePoint[];
  summary: RouteSummary;
  success: boolean;
}> {
  const store = useTripNavigationStore.getState();
  
  // Set the locations and generate
  store.setRouteLocation('origin', origin);
  store.setRouteLocation('destination', destination);
  store.setVehicleType(vehicleType);
  store.applyOptimization(optimizationMode);

  // Wait for route generation
  await store.generateRoute();

  return {
    routePoints: store.generatedRoute,
    summary: store.summary,
    success: store.generatedRoute.length > 0,
  };
}

/**
 * Save current route with integration for Module 2 (Trip Planning)
 * The saved route can be added as an itinerary item
 * 
 * Called by: Module 2 (Trip Planning) - to save generated routes as itinerary items
 */
export function saveRoute(name: string): SavedRoute | null {
  const store = useTripNavigationStore.getState();
  
  if (!store.origin || !store.destination) {
    console.warn('Cannot save route: origin and destination must be set');
    return null;
  }

  store.saveRoute(name);
  
  // Return the last saved route
  return store.savedRoutes[0] || null;
}

/**
 * Get all saved routes for a user
 * Called by: Module 2 (Trip Planning) - to fetch user's saved routes
 */
export function getSavedRoutes(userId?: string): SavedRoute[] {
  const store = useTripNavigationStore.getState();
  
  if (userId) {
    return store.savedRoutes.filter((route: SavedRoute) => route.userId === userId);
  }
  
  return store.savedRoutes;
}

/**
 * Load a saved route
 * Called by: Module 2 (Trip Planning) - to reuse saved routes in itineraries
 */
export function loadSavedRoute(routeId: string): boolean {
  const store = useTripNavigationStore.getState();
  const route = store.savedRoutes.find((r: SavedRoute) => r.id === routeId);
  
  if (!route) return false;
  
  store.loadSavedRoute(routeId);
  return true;
}

/**
 * Delete a saved route
 * Called by: Module 2 (Trip Planning) - to remove routes from itineraries
 */
export function deleteSavedRoute(routeId: string): boolean {
  const store = useTripNavigationStore.getState();
  const exists = store.savedRoutes.some((r: SavedRoute) => r.id === routeId);
  
  if (exists) {
    store.deleteSavedRoute(routeId);
    return true;
  }
  
  return false;
}

// ============================================
// VEHICLE MANAGEMENT
// ============================================

/**
 * Get all vehicles for current user
 * Called by: Any module needing vehicle information
 */
export function getVehicles(): Vehicle[] {
  const store = useTripNavigationStore.getState();
  return store.vehicles;
}

/**
 * Get default vehicle
 */
export function getDefaultVehicle(): Vehicle | null {
  const store = useTripNavigationStore.getState();
  return store.vehicles.find((v: Vehicle) => v.isDefault) || null;
}

/**
 * Add a new vehicle to garage
 */
export function addVehicle(vehicle: Omit<Vehicle, 'id' | 'isDefault'>): Vehicle {
  const store = useTripNavigationStore.getState();
  store.addVehicle(vehicle);
  
  // Return the newly added vehicle (last one in list)
  return store.vehicles[store.vehicles.length - 1]!;
}

/**
 * Set selected vehicle for route calculations
 */
export function setSelectedVehicle(vehicleId: string): boolean {
  const store = useTripNavigationStore.getState();
  const exists = store.vehicles.some((v: Vehicle) => v.id === vehicleId);
  
  if (exists) {
    store.setSelectedVehicleId(vehicleId);
    return true;
  }
  
  return false;
}

// ============================================
// USER MANAGEMENT INTEGRATION
// ============================================

/**
 * Set current user ID from Module 1 (Account)
 * Called by: Module 1 (Account) on login
 */
export function setCurrentUser(userId: string): void {
  const store = useTripNavigationStore.getState();
  store.setCurrentUserId(userId);
}

/**
 * Clear current user on logout
 * Called by: Module 1 (Account) on logout
 */
export function clearCurrentUser(): void {
  const store = useTripNavigationStore.getState();
  store.setCurrentUserId(null);
}

/**
 * Get current user ID
 */
export function getCurrentUserId(): string | null {
  const store = useTripNavigationStore.getState();
  return store.currentUserId;
}

// ============================================
// ROUTE EXPORT FOR NAVIGATION APPS
// ============================================

/**
 * Export route to Google Maps
 * Called by: Module 2 (Trip Planning) - to share routes
 */
export function exportToGoogleMaps(origin: Stop, destination: Stop): string {
  return getGoogleMapsUrl(origin, destination);
}

/**
 * Export route to Waze
 * Called by: Module 2 (Trip Planning) - to navigate with Waze
 */
export function exportToWaze(destination: Stop, origin?: Stop): string {
  return getWazeUrl(destination, origin);
}

// ============================================
// DATA TYPES FOR MODULE INTEGRATION
// ============================================

export type {
  Stop,
  RoutePoint,
  RouteSummary,
  Vehicle,
  SavedRoute,
  VehicleType,
  VehicleCategory,
  OptimizationMode,
};