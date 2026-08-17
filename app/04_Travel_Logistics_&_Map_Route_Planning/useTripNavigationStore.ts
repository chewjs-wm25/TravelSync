import { create } from 'zustand';

export type VehicleType = 'car' | 'walk' | 'public transport';
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
}

export interface Vehicle {
  id: string;
  name: string;
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

const calculateSummary = (
  origin: Stop | null,
  destination: Stop | null,
  vehicleType: VehicleType,
  optimizationMode: OptimizationMode,
  actualDistanceKm?: number
): RouteSummary => {
  if (!origin || !destination) {
    return {
      distanceKm: 0,
      timeMinutes: 0,
      fuelLiters: 0,
      fuelCost: 0,
    };
  }

  const baseDistance = actualDistanceKm ?? getDistanceKm(origin, destination);
  const speeds: Record<VehicleType, number> = {
    car: 50,
    walk: 4,
    'public transport': 30, // Improved speed for public transport
  };

  const selectedVehicle = {
    car: 15,
    walk: 0.5,
    'public transport': 12, // Better fuel efficiency for public transport
  }[vehicleType];

  const speedModifier = optimizationMode === 'fastest' ? 1.15 : optimizationMode === 'cheapest' ? 0.9 : 1;
  const costModifier = optimizationMode === 'cheapest' ? 0.85 : 1;

  const distance = baseDistance;
  const timeMinutes = (distance / speeds[vehicleType]) * 60 / speedModifier;
  const fuelLiters = distance / selectedVehicle;
  const fuelCost = fuelLiters * 2.15 * costModifier;

  return {
    distanceKm: Number(distance.toFixed(1)),
    timeMinutes: Math.round(timeMinutes),
    fuelLiters: Number(fuelLiters.toFixed(1)),
    fuelCost: Number(fuelCost.toFixed(2)),
  };
};

const fetchRouteShape = async (
  origin: Stop,
  destination: Stop,
  vehicleType: VehicleType
) => {
  const profile = vehicleType === 'walk' ? 'foot' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Routing service failed');
  }

  const data = (await response.json()) as {
    routes?: Array<{
      geometry?: { coordinates?: Array<[number, number]> };
      distance: number;
      duration: number;
    }>;
  };
  const route = data.routes?.[0];
  if (!route || !route.geometry?.coordinates?.length) {
    throw new Error('No route returned');
  }

  const points = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => ({
      lat,
      lng,
    })
  );

  return {
    points,
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
  };
};

// Generate realistic public transport route by following the walking path
const generatePublicTransportRoute = async (
  origin: Stop,
  destination: Stop
): Promise<RoutePoint[]> => {
  try {
    const route = await fetchRouteShape(origin, destination, 'walk');
    return route.points.map((point, index) => ({
      id: `transit-${index}`,
      name:
        index === 0
          ? origin.name
          : index === route.points.length - 1
          ? destination.name
          : `Stop ${index}`,
      lat: point.lat,
      lng: point.lng,
    }));
  } catch {
    return [origin, destination];
  }
};

const buildRoutePoints = async (
  origin: Stop,
  destination: Stop,
  vehicleType: VehicleType,
  optimizationMode: OptimizationMode
) => {
  // Public transport - follow the walking route shape
  if (vehicleType === 'public transport') {
    return await generatePublicTransportRoute(origin, destination);
  }

  // For walking, get actual walking path
  if (vehicleType === 'walk') {
    try {
      const route = await fetchRouteShape(origin, destination, vehicleType);
      return route.points.length > 1 ? route.points : [origin, destination];
    } catch {
      return [origin, destination];
    }
  }

  // For car with optimization
  try {
    const route = await fetchRouteShape(origin, destination, vehicleType);
    
    if (optimizationMode === 'shortest') {
      // For shortest path, reduce waypoints to create more direct route
      if (route.points.length > 20) {
        const step = Math.ceil(route.points.length / 10);
        const shortened = route.points.filter((_: any, i: number) => i % step === 0 || i === route.points.length - 1);
        return shortened.length > 1 ? shortened : [origin, destination];
      }
      return route.points.length > 1 ? route.points : [origin, destination];
    }
    
    if (optimizationMode === 'cheapest') {
      // For cheapest, keep full route but it's calculated differently in summary
      return route.points.length > 1 ? route.points : [origin, destination];
    }

    // Fastest - use the actual full-detail route
    return route.points.length > 1 ? route.points : [origin, destination];
  } catch {
    return [origin, destination];
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
  },
  savedRoutes: [],
  routePickerOpen: true,
  activeField: null,
  optimizationMode: 'fastest',
  vehicles: [defaultVehicle],
  selectedVehicleId: 'default-vehicle',
  currentUserId: null,

  setVehicleType: (value: VehicleType) => {
    const { origin, destination, optimizationMode } = get();
    set({
      vehicleType: value,
      summary: calculateSummary(origin, destination, value, optimizationMode),
    });
    if (origin && destination) {
      void get().generateRoute();
    }
  },

  setRoutePickerOpen: (open: boolean) => set({ routePickerOpen: open }),
  setActiveField: (field: RouteField | null) => set({ activeField: field }),

  setRouteLocation: (field: RouteField, stop: Stop) => {
    const nextState = field === 'origin' ? { origin: stop } : { destination: stop };
    const { origin, destination, vehicleType, optimizationMode } = get();
    const nextOrigin = field === 'origin' ? stop : origin;
    const nextDestination = field === 'destination' ? stop : destination;

    set({
      ...nextState,
      generatedRoute: [
        ...(nextOrigin ? [nextOrigin] : []),
        ...(nextDestination ? [nextDestination] : []),
      ],
      summary: calculateSummary(nextOrigin, nextDestination, vehicleType, optimizationMode),
    });

    if (nextOrigin && nextDestination) {
      void get().generateRoute();
    }
  },

  generateRoute: async () => {
    const { origin, destination, vehicleType, optimizationMode } = get();
    if (!origin || !destination) return;

    try {
      const routePoints = await buildRoutePoints(
        origin,
        destination,
        vehicleType,
        optimizationMode
      );

      const actualDistanceKm = routePoints.reduce(
        (sum: number, point: RoutePoint, index: number, points: RoutePoint[]) => {
          if (index === 0) return 0;
          const previous = points[index - 1];
          return sum + getDistanceKm(previous as Stop, point as Stop);
        },
        0
      );

      set({
        generatedRoute: routePoints,
        summary: calculateSummary(
          origin,
          destination,
          vehicleType,
          optimizationMode,
          actualDistanceKm
        ),
      });
    } catch {
      set({
        generatedRoute: [origin, destination],
        summary: calculateSummary(origin, destination, vehicleType, optimizationMode),
      });
    }
  },

  applyOptimization: (mode: OptimizationMode) => {
    const { origin, destination, vehicleType } = get();
    set({
      optimizationMode: mode,
      summary: calculateSummary(origin, destination, vehicleType, mode),
    });
    if (origin && destination) {
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
    }));
  },

  setSelectedVehicleId: (id: string) => {
    set({ selectedVehicleId: id });
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