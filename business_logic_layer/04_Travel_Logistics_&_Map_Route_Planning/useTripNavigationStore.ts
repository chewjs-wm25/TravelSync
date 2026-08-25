import { create } from 'zustand';
import { fetchRouteShape } from '@/api_layer/04_Travel_Logistics_&_Map_Route_Planning/osrmApi';
import { fetchPublicTransportRoute } from '@/api_layer/04_Travel_Logistics_&_Map_Route_Planning/publicTransportApi';
import type { PublicTransportLeg, PublicTransportStop } from '@/api_layer/04_Travel_Logistics_&_Map_Route_Planning/publicTransportApi';

export type VehicleType = 'car' | 'walk' | 'public transport';
export type VehicleCategory = 'car' | 'motorcycle';
export type OptimizationMode = 'fastest' | 'shortest' | 'cheapest';
export type RouteField = 'origin' | 'destination';

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RoutePoint {
  id?: string;
  name?: string;
  lat: number;
  lng: number;
}

export interface RouteSummary {
  distanceKm: number;
  timeMinutes: number;
  fuelLiters: number;
  fuelCost: number;
  energyKwh: number;
  energyCost: number;
  carbonKg: number;
}

export interface Vehicle {
  id: string;
  name: string;
  category: VehicleCategory;
  fuelConsumption: number;
  fuelType: string;
  isDefault: boolean;
}

export interface SavedRoute {
  id: string;
  name: string;
  userId?: string; // Track which user saved this route
  origin?: Stop;
  destination?: Stop;
  summary: RouteSummary;
  vehicleType: VehicleType;
  optimizationMode: OptimizationMode;
  routePoints: RoutePoint[];
  publicTransportStops?: PublicTransportStop[];
  publicTransportLegs?: PublicTransportLeg[];
  vehicleId?: string; // Link to specific vehicle used
  createdAt?: string;
}

interface TripNavigationState {
  vehicleType: VehicleType;
  origin: Stop | null;
  destination: Stop | null;
  generatedRoute: RoutePoint[];
  summary: RouteSummary;
  savedRoutes: SavedRoute[];
  routePickerOpen: boolean;
  activeField: RouteField | null;
  optimizationMode: OptimizationMode;
  vehicles: Vehicle[];
  selectedVehicleId: string; // Track currently selected vehicle
  currentUserId: string | null; // Track current logged-in user
  publicTransportStops: PublicTransportStop[];
  publicTransportLegs: PublicTransportLeg[];
  isRouteLoading: boolean;
  setVehicleType: (value: VehicleType) => void;
  setRoutePickerOpen: (open: boolean) => void;
  setActiveField: (field: RouteField | null) => void;
  setRouteLocation: (field: RouteField, stop: Stop) => void;
  generateRoute: () => Promise<void>;
  applyOptimization: (mode: OptimizationMode) => void;
  loadSavedRoute: (id: string) => void;
  saveRoute: (name: string) => Promise<void>;
  deleteSavedRoute: (id: string) => Promise<void>;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'isDefault'>) => void;
  editVehicle: (id: string, updates: Partial<Omit<Vehicle, 'id' | 'isDefault'>>) => void;
  deleteVehicle: (id: string) => void;
  setDefaultVehicle: (id: string) => void;
  setSelectedVehicleId: (id: string) => void;
  setCurrentUserId: (userId: string | null) => Promise<void>;
}

const defaultVehicle: Vehicle = {
  id: 'default-vehicle',
  name: 'Standard Sedan',
  fuelConsumption: 15,
  category: 'car',
  fuelType: 'Petrol',
  isDefault: true,
};

const defaultStops = {
  origin: {
    id: 'default-origin',
    name: 'Kuala Lumpur',
    lat: 3.139,
    lng: 101.6869,
  },
  destination: {
    id: 'default-destination',
    name: 'Petaling Jaya',
    lat: 3.103,
    lng: 101.6067,
  },
};

let latestRouteRequest = 0;

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (from: Stop, to: Stop) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getEstimatedCostPerKm = (vehicle?: Vehicle) => {
  if (!vehicle) return 2.15 / 15;
  if (vehicle.fuelType.toLowerCase() === 'electric') {
    return (vehicle.fuelConsumption / 100) * 0.57;
  }
  return 2.15 / Math.max(vehicle.fuelConsumption, 0.1);
};

const calculateSummary = (
  origin: Stop | null,
  destination: Stop | null,
  vehicleType: VehicleType,
  optimizationMode: OptimizationMode,
  actualDistanceKm?: number,
  vehicle?: Vehicle | null,
  actualTimeMinutes?: number
): RouteSummary => {
  if (!origin || !destination) {
    return {
      distanceKm: 0,
      timeMinutes: 0,
      fuelLiters: 0,
      fuelCost: 0,
      energyKwh: 0,
      energyCost: 0,
      carbonKg: 0,
    };
  }

  const baseDistance = actualDistanceKm ?? getDistanceKm(origin, destination);
  const distance = baseDistance;
  const speeds: Record<VehicleType, number> = {
    car: 50,
    walk: 4,
    'public transport': 30, // Improved speed for public transport
  };

  const timeMinutes = actualTimeMinutes ?? (distance / speeds[vehicleType]) * 60;

  if (vehicleType !== 'car') {
    return {
      distanceKm: Number(distance.toFixed(1)),
      timeMinutes: Math.round(timeMinutes),
      fuelLiters: 0,
      fuelCost: 0,
      energyKwh: 0,
      energyCost: 0,
      carbonKg: vehicleType === 'walk' ? 0 : Number((distance * 0.05).toFixed(2)),
    };
  }

  const selectedVehicle = vehicle?.fuelType.toLowerCase() === 'electric'
    ? Math.max(vehicle.fuelConsumption, 0.1)
    : Math.max(vehicle?.fuelConsumption ?? 15, 0.1);

  const isElectric = vehicle?.fuelType.toLowerCase() === 'electric';
  const fuelLiters = isElectric ? 0 : distance / selectedVehicle;
  const fuelCost = fuelLiters * 2.15;
  const energyKwh = isElectric ? distance * ((vehicle?.fuelConsumption ?? 16) / 100) : 0;
  const energyCost = energyKwh * 0.57;
  const carbonKg = isElectric ? energyKwh * 0.4 : fuelLiters * 2.31;

  return {
    distanceKm: Number(distance.toFixed(1)),
    timeMinutes: Math.round(timeMinutes),
    fuelLiters: Number(fuelLiters.toFixed(1)),
    fuelCost: Number((isElectric ? 0 : fuelCost).toFixed(2)),
    energyKwh: Number(energyKwh.toFixed(1)),
    energyCost: Number(energyCost.toFixed(2)),
    carbonKg: Number(carbonKg.toFixed(2)),
  };
};

const generatePublicTransportRoute = async (
  origin: Stop,
  destination: Stop
): Promise<{ points: RoutePoint[]; stops: PublicTransportStop[]; legs: PublicTransportLeg[] }> => {
  try {
    const route = await fetchPublicTransportRoute(origin, destination);
    return {
      points: route.points.map((point, index) => ({
        id: route.stops[index]?.id ?? `transit-${index}`,
        name: route.stops[index]?.name,
        lat: point.lat,
        lng: point.lng,
      })),
      stops: route.stops,
      legs: route.legs,
    };
  } catch {
    const transitStop = {
      id: 'estimated-lrt-stop',
      name: 'Estimated LRT interchange',
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2,
    };
    return {
      points: [origin, transitStop, destination],
      stops: [origin, transitStop, destination],
      legs: [
        { mode: 'walking', name: 'Walk to LRT', points: [origin, transitStop] },
        { mode: 'lrt', name: 'LRT (estimated)', points: [transitStop, destination] },
      ],
    };
  }
};

const buildRoutePoints = async (
  origin: Stop,
  destination: Stop,
  vehicleType: VehicleType,
  optimizationMode: OptimizationMode,
  vehicle?: Vehicle
): Promise<{ points: RoutePoint[]; stops: PublicTransportStop[]; legs: PublicTransportLeg[]; distanceKm?: number; durationMinutes?: number }> => {
  if (vehicleType === 'public transport') {
    const route = await generatePublicTransportRoute(origin, destination);
    return { ...route, distanceKm: undefined, durationMinutes: undefined };
  }

  // For walking, get actual walking path
  if (vehicleType === 'walk') {
    try {
      const route = await fetchRouteShape(origin, destination, vehicleType, 'fastest');
      return { points: route.points.length > 1 ? route.points : [origin, destination], stops: [], legs: [], distanceKm: route.distanceKm, durationMinutes: route.durationMinutes };
    } catch {
      return { points: [origin, destination], stops: [], legs: [] };
    }
  }

  // For car with optimization
  try {
    const route = await fetchRouteShape(origin, destination, vehicleType, optimizationMode, getEstimatedCostPerKm(vehicle));
    return { points: route.points.length > 1 ? route.points : [origin, destination], stops: [], legs: [], distanceKm: route.distanceKm, durationMinutes: route.durationMinutes };
  } catch {
    return { points: [origin, destination], stops: [], legs: [] };
  }
};

export const useTripNavigationStore = create<TripNavigationState>()((set, get) => ({
  vehicleType: 'car',
  origin: null,
  destination: null,
  generatedRoute: [],
  summary: {
    distanceKm: 0,
    timeMinutes: 0,
    fuelLiters: 0,
    fuelCost: 0,
    energyKwh: 0,
    energyCost: 0,
    carbonKg: 0,
  },
  savedRoutes: [],
  routePickerOpen: true,
  activeField: null,
  optimizationMode: 'fastest',
  vehicles: [defaultVehicle],
  selectedVehicleId: 'default-vehicle',
  currentUserId: null,
  publicTransportStops: [],
  publicTransportLegs: [],
  isRouteLoading: false,

  setVehicleType: (value: VehicleType) => {
    const { origin, destination, optimizationMode, vehicles, selectedVehicleId } = get();
    const effectiveMode = value === 'car' ? optimizationMode : 'fastest';
    set({
      vehicleType: value,
      optimizationMode: effectiveMode,
    });
    if (origin && destination) {
      void get().generateRoute();
    }
  },

  setRoutePickerOpen: (open: boolean) => set({ routePickerOpen: open }),
  setActiveField: (field: RouteField | null) => set({ activeField: field }),

  setRouteLocation: (field: RouteField, stop: Stop) => {
    const nextState = field === 'origin' ? { origin: stop } : { destination: stop };
    const { origin, destination, vehicleType, optimizationMode, vehicles, selectedVehicleId } = get();
    const nextOrigin = field === 'origin' ? stop : origin;
    const nextDestination = field === 'destination' ? stop : destination;

    set({
      ...nextState,
      generatedRoute: [
        ...(nextOrigin ? [nextOrigin] : []),
        ...(nextDestination ? [nextDestination] : []),
      ],
      summary: calculateSummary(nextOrigin, nextDestination, vehicleType, optimizationMode, undefined, vehicles.find((vehicle) => vehicle.id === selectedVehicleId)),
    });

    if (nextOrigin && nextDestination) {
      void get().generateRoute();
    }
  },

  generateRoute: async () => {
    const requestId = ++latestRouteRequest;
    const { origin, destination, vehicleType, optimizationMode, vehicles, selectedVehicleId } = get();
    if (!origin || !destination) {
      set({ isRouteLoading: false });
      return;
    }

    set({ isRouteLoading: true });

    try {
      const route = await buildRoutePoints(
        origin,
        destination,
        vehicleType,
        optimizationMode,
        vehicles.find((vehicle) => vehicle.id === selectedVehicleId)
      );
      const routePoints = route.points;

      const actualDistanceKm = route.distanceKm ?? routePoints.reduce(
        (sum: number, point: RoutePoint, index: number, points: RoutePoint[]) => {
          if (index === 0) return 0;
          return sum + getDistanceKm(points[index - 1] as Stop, point as Stop);
        }, 0);

      if (requestId !== latestRouteRequest) return;

      set({
        generatedRoute: routePoints,
        isRouteLoading: false,
        summary: calculateSummary(
          origin,
          destination,
          vehicleType,
          optimizationMode,
          actualDistanceKm,
          vehicles.find((vehicle) => vehicle.id === selectedVehicleId),
          route.durationMinutes
        ),
        publicTransportStops: route.stops,
        publicTransportLegs: route.legs,
      });
    } catch {
      if (requestId !== latestRouteRequest) return;

      set({
        generatedRoute: [origin, destination],
        isRouteLoading: false,
        summary: calculateSummary(origin, destination, vehicleType, optimizationMode, undefined, vehicles.find((vehicle) => vehicle.id === selectedVehicleId)),
        publicTransportStops: [],
        publicTransportLegs: [],
      });
    }
  },

  applyOptimization: (mode: OptimizationMode) => {
    const { origin, destination, vehicleType, vehicles, selectedVehicleId } = get();
    const effectiveMode = vehicleType === 'car' ? mode : 'fastest';
    const shouldRegenerate = Boolean(origin && destination);
    set({
      optimizationMode: effectiveMode,
    });
    if (shouldRegenerate) {
      void get().generateRoute();
    }
  },

  loadSavedRoute: (id: string) => {
    const { savedRoutes } = get();
    const route = savedRoutes.find((item: SavedRoute) => item.id === id);
    if (!route) return;

    set({
      origin: route.origin ?? null,
      destination: route.destination ?? null,
      vehicleType: route.vehicleType,
      optimizationMode: route.optimizationMode,
      generatedRoute: route.routePoints,
      summary: route.summary,
      publicTransportStops: route.publicTransportStops ?? [],
      publicTransportLegs: route.publicTransportLegs ?? [],
    });
  },

  saveRoute: async (name: string) => {
    const { origin, destination, summary, vehicleType, optimizationMode, generatedRoute, savedRoutes, currentUserId, selectedVehicleId } = get();
    if (!origin || !destination) return;

    const trimmedName = name.trim() || `${origin.name} → ${destination.name}`;
    const newRoute: SavedRoute = {
      id: `${Date.now()}`,
      name: trimmedName,
      origin,
      destination,
      summary,
      vehicleType,
      optimizationMode,
      routePoints: generatedRoute,
      publicTransportStops: get().publicTransportStops,
      publicTransportLegs: get().publicTransportLegs,
      userId: currentUserId || 'anonymous',
      vehicleId: selectedVehicleId,
      createdAt: new Date().toISOString(),
    };

    set({ savedRoutes: [newRoute, ...savedRoutes] });
  },

  deleteSavedRoute: async (id: string) => {
    const { savedRoutes } = get();

    set({
      savedRoutes: savedRoutes.filter((routeItem: SavedRoute) => routeItem.id !== id),
    });
  },

  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'isDefault'>) => {
    const nextVehicle: Vehicle = {
      id: `${Date.now()}`,
      name: vehicle.name,
      category: vehicle.category,
      fuelConsumption: vehicle.fuelConsumption,
      fuelType: vehicle.fuelType,
      isDefault: false,
    };

    set((state: TripNavigationState) => ({
      vehicles: [...state.vehicles, nextVehicle],
    }));
  },

  editVehicle: (id: string, updates: Partial<Omit<Vehicle, 'id' | 'isDefault'>>) => {
    set((state: TripNavigationState) => ({
      vehicles: state.vehicles.map((vehicle: Vehicle) =>
        vehicle.id === id
          ? {
              ...vehicle,
              ...updates,
              fuelConsumption: updates.fuelConsumption ?? vehicle.fuelConsumption,
              fuelType: updates.fuelType ?? vehicle.fuelType,
              name: updates.name ?? vehicle.name,
            }
          : vehicle
      ),
    }));
  },

  deleteVehicle: (id: string) => {
    set((state: TripNavigationState) => ({
      vehicles: state.vehicles.filter((vehicle: Vehicle) => vehicle.id !== id),
    }));
  },

  setDefaultVehicle: (id: string) => {
    set((state: TripNavigationState) => ({
      vehicles: state.vehicles.map((vehicle: Vehicle) => ({
        ...vehicle,
        isDefault: vehicle.id === id,
      })),
      selectedVehicleId: id,
    }));
    const { origin, destination } = get();
    if (origin && destination) void get().generateRoute();
  },

  setSelectedVehicleId: (id: string) => {
    const { origin, destination, vehicleType, optimizationMode, vehicles } = get();
    set({
      selectedVehicleId: id,
      summary: calculateSummary(
        origin,
        destination,
        vehicleType,
        optimizationMode,
        undefined,
        vehicles.find((vehicle) => vehicle.id === id)
      ),
    });
    if (origin && destination) void get().generateRoute();
  },

  setCurrentUserId: async (userId: string | null) => {
    set({ currentUserId: userId });
    if (!userId) {
      set({ savedRoutes: [] });
      return;
    }

    set({ savedRoutes: [] });
  },
}));

export type { TripNavigationState };