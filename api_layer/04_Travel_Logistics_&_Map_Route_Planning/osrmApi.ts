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

export async function fetchRouteShape(
  origin: StopCoordinates,
  destination: StopCoordinates,
  vehicleType: 'car' | 'walk' | 'public transport',
  optimizationMode: 'fastest' | 'shortest' | 'cheapest' = 'fastest',
  estimatedCostPerKm = 2.15 / 15
): Promise<RouteShape> {
  const profile = vehicleType === 'walk' ? 'foot' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Routing service failed');
  }

  const data = (await response.json()) as {
    routes?: Array<OsrmRoute & {
      legs?: Array<{
        steps?: Array<{
          name?: string;
          distance: number;
          duration: number;
          geometry?: { coordinates?: Array<[number, number]> };
        }>;
      }>;
    }>;
  };
  const routes = data.routes ?? [];
  const validRoutes = routes
    .filter((candidate) => candidate.geometry?.coordinates?.length)
    .map((route, index) => ({ route, index }));
  const compareRoutes = (a: OsrmRoute, b: OsrmRoute) => {
    if (optimizationMode === 'shortest') return a.distance - b.distance;
    if (optimizationMode === 'cheapest') {
      return (a.distance / 1000) * estimatedCostPerKm - (b.distance / 1000) * estimatedCostPerKm;
    }
    return a.duration - b.duration;
  };
  const route = validRoutes.sort((a, b) => compareRoutes(a.route, b.route) || a.index - b.index)[0]?.route;
  if (!route || !route.geometry?.coordinates?.length) {
    throw new Error('No route returned');
  }

  return {
    points: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
  };
}
