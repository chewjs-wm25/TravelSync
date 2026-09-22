export interface RouteShapePoint {
  lat: number;
  lng: number;
}

export interface RouteVariant {
  points: RouteShapePoint[];
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteShape {
  points: RouteShapePoint[];
  distanceKm: number;
  durationMinutes: number;
  alternatives: RouteVariant[];
}

interface OsrmRoute {
  geometry?: { coordinates?: Array<[number, number]> };
  distance: number;
  duration: number;
}

type RouteCandidate = {
  route: OsrmRoute;
  index: number;
  key: string;
};

type StopCoordinates = {
  lat: number;
  lng: number;
};

const walkingSpeedKmPerHour = 4.32;
const referenceDrivingSpeedKmPerHour = 50;
const congestionFuelPenalty = 0.4;
const routeCache = new Map<string, RouteShape>();

const getViaPointUrls = (origin: StopCoordinates, destination: StopCoordinates) => {
  const midpoint = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  };
  const latitudeDelta = Math.max(Math.abs(origin.lat - destination.lat) * 0.25, 0.006);
  return [
    { lat: midpoint.lat + latitudeDelta, lng: midpoint.lng },
    { lat: midpoint.lat - latitudeDelta, lng: midpoint.lng },
  ].map((point) => `${point.lng},${point.lat}`);
};

const getRouteKey = (route: OsrmRoute) =>
  route.geometry?.coordinates
    ?.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`)
    .join(';') ?? '';

export async function fetchRouteShape(
  origin: StopCoordinates,
  destination: StopCoordinates,
  vehicleType: 'car' | 'walk' | 'public transport',
  optimizationMode: 'fastest' | 'shortest' | 'cheapest' = 'fastest',
  estimatedCostPerKm = 2.15 / 15
): Promise<RouteShape> {
  const cacheKey = `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}:${vehicleType}:${optimizationMode}:${estimatedCostPerKm}`;
  const cachedRoute = routeCache.get(cacheKey);
  if (cachedRoute) return cachedRoute;

  const profile = vehicleType === 'walk' ? 'foot' : 'driving';
  const baseUrl = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
  const routeUrls = vehicleType !== 'car'
    ? [baseUrl]
    : [baseUrl, ...getViaPointUrls(origin, destination).map((viaPoint) =>
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${viaPoint};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`
    )];
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
  // Keep duplicate alternatives out of the ranking when OSRM returns them.
  const routeKeys = new Set<string>();
  const validRoutes: RouteCandidate[] = routes.reduce<RouteCandidate[]>((candidates, route, index) => {
    const key = getRouteKey(route);
    if (!key || routeKeys.has(key)) return candidates;

    routeKeys.add(key);
    candidates.push({ route, index, key });
    return candidates;
  }, []);
  const fuelCostForRoute = (candidate: OsrmRoute) => {
    const distanceKm = candidate.distance / 1000;
    const idealDurationMinutes = (distanceKm / referenceDrivingSpeedKmPerHour) * 60;
    const congestionRatio = idealDurationMinutes > 0
      ? Math.max(0, candidate.duration / 60 / idealDurationMinutes - 1)
      : 0;
    return distanceKm * estimatedCostPerKm * (1 + congestionRatio * congestionFuelPenalty);
  };
  const compareRoutes = (a: OsrmRoute, b: OsrmRoute) => {
    // These are deliberately separate objectives: fastest minimizes OSRM's
    // travel duration, while shortest minimizes the travelled road distance.
    if (optimizationMode === 'shortest') return a.distance - b.distance;
    if (optimizationMode === 'cheapest') {
      return fuelCostForRoute(a) - fuelCostForRoute(b);
    }
    return a.duration - b.duration;
  };
  const shortestRoute = validRoutes
    .slice()
    .sort((a, b) => a.route.distance - b.route.distance || a.index - b.index)[0]?.route;
  const fasterThanShortest = shortestRoute
    ? validRoutes.filter((candidate) => candidate.route.duration < shortestRoute.duration)
    : [];
  const preferredCandidates = optimizationMode !== 'fastest' || !fasterThanShortest.length
    ? validRoutes
    : fasterThanShortest;
  // Rank every valid route against the requested objective, then keep at most
  // three usable choices. If fewer distinct routes exist, show what is available.
  const rankedRoutes = preferredCandidates
    .sort((a, b) => compareRoutes(a.route, b.route) || a.index - b.index)
    .slice(0, 3);
  const route = rankedRoutes[0]?.route;
  if (!route?.geometry?.coordinates?.length) {
    throw new Error('No route returned');
  }

  const toPoints = (candidate: OsrmRoute) => (candidate.geometry?.coordinates ?? [])
    .map(([lng, lat]) => ({ lat, lng }));
  const toVariant = (candidate: OsrmRoute): RouteVariant => ({
    points: toPoints(candidate),
    distanceKm: candidate.distance / 1000,
    durationMinutes: vehicleType === 'walk'
      ? (candidate.distance / 1000 / walkingSpeedKmPerHour) * 60
      : candidate.duration / 60,
  });
  const routeShape = {
    points: toPoints(route),
    distanceKm: route.distance / 1000,
    durationMinutes:
      vehicleType === 'walk'
        ? (route.distance / 1000 / walkingSpeedKmPerHour) * 60
        // OSRM's driving duration already accounts for the road class and is
        // therefore able to give a faster result for highway-based routes.
        : route.duration / 60,
    alternatives: rankedRoutes
      .slice(1)
      .filter((candidate) => candidate.route !== route)
      .map((candidate) => toVariant(candidate.route)),
  };
  routeCache.set(cacheKey, routeShape);
  return routeShape;
}
