import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VehicleType = 'car' | 'walk' | 'public transport';
export type OptimizationMode = 'fastest' | 'shortest' | 'cheapest';
export type RouteField = 'origin' | 'destination';

export interface Stop {
  id: string;
  name: string;
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
  origin?: Stop;
  destination?: Stop;
  summary: RouteSummary;
  vehicleType: VehicleType;
}

interface TripNavigationState {
  vehicleType: VehicleType;
  origin: Stop | null;
  destination: Stop | null;
  generatedRoute: Stop[];
  summary: RouteSummary;
  savedRoutes: SavedRoute[];
  routePickerOpen: boolean;
  activeField: RouteField | null;
  optimizationMode: OptimizationMode;
  vehicles: Vehicle[];
  setVehicleType: (value: VehicleType) => void;
  setRoutePickerOpen: (open: boolean) => void;
  setActiveField: (field: RouteField | null) => void;
  setRouteLocation: (field: RouteField, stop: Stop) => void;
  generateRoute: () => void;
  applyOptimization: (mode: OptimizationMode) => void;
  saveRoute: (name: string) => void;
  deleteSavedRoute: (id: string) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'isDefault'>) => void;
  editVehicle: (id: string, updates: Partial<Omit<Vehicle, 'id' | 'isDefault'>>) => void;
  deleteVehicle: (id: string) => void;
  setDefaultVehicle: (id: string) => void;
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
  optimizationMode: OptimizationMode
): RouteSummary => {
  if (!origin || !destination) {
    return {
      distanceKm: 0,
      timeMinutes: 0,
      fuelLiters: 0,
      fuelCost: 0,
    };
  }

  const baseDistance = getDistanceKm(origin, destination);
  const optimizationFactor = {
    fastest: 0.9,
    shortest: 1,
    cheapest: 1.15,
  }[optimizationMode];

  const distance = baseDistance * optimizationFactor;
  const speeds: Record<VehicleType, number> = {
    car: 50,
    walk: 4,
    'public transport': 28,
  };

  const selectedVehicle = {
    car: 15,
    walk: 0.5,
    'public transport': 9,
  }[vehicleType];

  const timeMinutes = (distance / speeds[vehicleType]) * 60;
  const fuelLiters = distance / selectedVehicle;
  const fuelCost = fuelLiters * 2.15;

  return {
    distanceKm: Number(distance.toFixed(1)),
    timeMinutes: Math.round(timeMinutes),
    fuelLiters: Number(fuelLiters.toFixed(1)),
    fuelCost: Number(fuelCost.toFixed(2)),
  };
};

export const useTripNavigationStore = create<TripNavigationState>()(
  persist(
    (set, get) => ({
      vehicleType: 'car',
      origin: defaultStops.origin,
      destination: defaultStops.destination,
      generatedRoute: [defaultStops.origin, defaultStops.destination],
      summary: calculateSummary(defaultStops.origin, defaultStops.destination, 'car', 'fastest'),
      savedRoutes: [],
      routePickerOpen: true,
      activeField: null,
      optimizationMode: 'fastest',
      vehicles: [defaultVehicle],

      setVehicleType: (value) => {
        const { origin, destination, optimizationMode } = get();
        set({
          vehicleType: value,
          summary: calculateSummary(origin, destination, value, optimizationMode),
        });
      },

      setRoutePickerOpen: (open) => set({ routePickerOpen: open }),
      setActiveField: (field) => set({ activeField: field }),

      setRouteLocation: (field, stop) => {
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
      },

      generateRoute: () => {
        const { origin, destination, vehicleType, optimizationMode } = get();
        const route = [
          ...(origin ? [origin] : []),
          ...(destination ? [destination] : []),
        ];

        set({
          generatedRoute: route,
          summary: calculateSummary(origin, destination, vehicleType, optimizationMode),
        });
      },

      applyOptimization: (mode) => {
        const { origin, destination, vehicleType } = get();
        set({
          optimizationMode: mode,
          summary: calculateSummary(origin, destination, vehicleType, mode),
        });
      },

      saveRoute: (name) => {
        const { origin, destination, summary, vehicleType, savedRoutes } = get();
        if (!origin || !destination) return;

        const trimmedName = name.trim() || `${origin.name} → ${destination.name}`;
        const newRoute: SavedRoute = {
          id: `${Date.now()}`,
          name: trimmedName,
          origin,
          destination,
          summary,
          vehicleType,
        };

        set({
          savedRoutes: [newRoute, ...savedRoutes],
        });
      },

      deleteSavedRoute: (id) => {
        set((state) => ({
          savedRoutes: state.savedRoutes.filter((route) => route.id !== id),
        }));
      },

      addVehicle: (vehicle) => {
        const nextVehicle: Vehicle = {
          id: `${Date.now()}`,
          name: vehicle.name,
          fuelConsumption: vehicle.fuelConsumption,
          fuelType: vehicle.fuelType,
          isDefault: false,
        };

        set((state) => ({
          vehicles: [...state.vehicles, nextVehicle],
        }));
      },

      editVehicle: (id, updates) => {
        set((state) => ({
          vehicles: state.vehicles.map((vehicle) =>
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

      deleteVehicle: (id) => {
        set((state) => ({
          vehicles: state.vehicles.filter((vehicle) => vehicle.id !== id),
        }));
      },

      setDefaultVehicle: (id) => {
        set((state) => ({
          vehicles: state.vehicles.map((vehicle) => ({
            ...vehicle,
            isDefault: vehicle.id === id,
          })),
        }));
      },
    }),
    {
      name: 'travelsync-trip-navigation-storage',
    }
  )
);

export type { TripNavigationState };
