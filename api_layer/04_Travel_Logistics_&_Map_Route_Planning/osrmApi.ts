export interface RouteShapePoint {
  lat: number;
  lng: number;
}

export interface RouteShape {
  points: RouteShapePoint[];
  distanceKm: number;
  durationMinutes: number;
}

type StopCoordinates = {
  lat: number;
  lng: number;
};

export async function fetchRouteShape(
  origin: StopCoordinates,
  destination: StopCoordinates,
  vehicleType: 'car' | 'walk' | 'public transport'
): Promise<RouteShape> {
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

  return {
    points: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
  };
}