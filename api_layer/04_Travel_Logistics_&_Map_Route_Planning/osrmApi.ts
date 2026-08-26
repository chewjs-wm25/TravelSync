export interface RouteShapePoint {
  lat: number;
  lng: number;
}

export interface RouteShape {
  points: RouteShapePoint[];
  distanceKm: number;
  durationMinutes: number;
}

interface OsrmRoute {
  geometry?: { coordinates?: Array<[number, number]> };
  distance: number;
  duration: number;
}

type StopCoordinates = {
  lat: number;
  lng: number;
};

const urbanDrivingTimeFactor = 1.2;
const walkingSpeedKmPerHour = 4.32;
const referenceDrivingSpeedKmPerHour = 50;
const congestionFuelPenalty = 0.4;

const getViaPointUrls = (origin: StopCoordinates, destination: StopCoordinates) => {
  const midpoint = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  };
  const latitudeDelta = Math.max(Math.abs(origin.lat - destination.lat) * 0.25, 0.006);
  const longitudeDelta = Math.max(Math.abs(origin.lng - destination.lng) * 0.25, 0.006);
  const viaPoints = [
    { lat: midpoint.lat + latitudeDelta, lng: midpoint.lng },
    { lat: midpoint.lat - latitudeDelta, lng: midpoint.lng },
    { lat: midpoint.lat, lng: midpoint.lng + longitudeDelta },
    { lat: midpoint.lat, lng: midpoint.lng - longitudeDelta },
  ];
  return viaPoints.map((point) =>
    `${point.lng},${point.lat}`
  );
};

export async function fetchRouteShape(
  origin: StopCoordinates,
  destination: StopCoordinates,
  vehicleType: 'car' | 'walk' | 'public transport',
  optimizationMode: 'fastest' | 'shortest' | 'cheapest' = 'fastest',
  estimatedCostPerKm = 2.15 / 15
): Promise<RouteShape> {
  const profile = vehicleType === 'walk' ? 'foot' : 'driving';
  const baseUrl = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
  const viaUrls = vehicleType === 'car'
    ? getViaPointUrls(origin, destination).map((viaPoint) =>
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${viaPoint};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`
    )
    : [];
  const routeUrls = [baseUrl, ...viaUrls];
  const routeResults = await Promise.all(routeUrls.map(async (routeUrl) => {
    try {
      const response = await fetch(routeUrl);
      if (!response.ok) return [];
      const data = (await response.json()) as { routes?: OsrmRoute[] };
      return data.routes ?? [];
    } catch {
      return [];
    }
  }));
  const routes = routeResults.flat();
  const validRoutes = routes
    .filter((candidate) => candidate.geometry?.coordinates?.length)
    .map((route, index) => ({ route, index }));
  const fuelCostForRoute = (candidate: OsrmRoute) => {
    const distanceKm = candidate.distance / 1000;
    const idealDurationMinutes = (distanceKm / referenceDrivingSpeedKmPerHour) * 60;
    const congestionRatio = idealDurationMinutes > 0
      ? Math.max(0, candidate.duration / 60 / idealDurationMinutes - 1)
      : 0;
    return distanceKm * estimatedCostPerKm * (1 + congestionRatio * congestionFuelPenalty);
  };
  const compareRoutes = (a: OsrmRoute, b: OsrmRoute) => {
    if (optimizationMode === 'shortest') return a.distance - b.distance;
    if (optimizationMode === 'cheapest') {
      return fuelCostForRoute(a) - fuelCostForRoute(b);
    }
    return a.duration - b.duration;
  };
  const route = validRoutes.sort((a, b) => compareRoutes(a.route, b.route) || a.index - b.index)[0]?.route;
  if (!route?.geometry?.coordinates?.length) {
    throw new Error('No route returned');
  }

  const coordinates = route.geometry?.coordinates ?? [];
  return {
    points: coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceKm: route.distance / 1000,
    durationMinutes:
      vehicleType === 'walk'
        ? (route.distance / 1000 / walkingSpeedKmPerHour) * 60
        : (route.duration / 60) * urbanDrivingTimeFactor,
  };
}
