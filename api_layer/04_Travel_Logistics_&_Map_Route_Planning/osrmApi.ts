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

export async function fetchRouteShape(
  origin: StopCoordinates,
  destination: StopCoordinates,
  vehicleType: "car" | "walk" | "public transport",
  optimizationMode: "fastest" | "shortest" | "cheapest" = "fastest",
  estimatedCostPerKm = 2.15 / 15
): Promise<RouteShape> {
  const profile = vehicleType === "walk" ? "foot" : "driving";
  const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Routing service failed");
  }

  const data = (await response.json()) as {
    routes?: Array<
      OsrmRoute & {
        legs?: Array<{
          steps?: Array<{
            name?: string;
            distance: number;
            duration: number;
            geometry?: { coordinates?: Array<[number, number]> };
          }>;
        }>;
      }
    >;
  };
  const routes = data.routes ?? [];
  const validRoutes = routes
    .filter((candidate) => candidate.geometry?.coordinates?.length)
    .map((route, index) => ({ route, index }));
  const fuelCostForRoute = (candidate: OsrmRoute) =>
    (candidate.distance / 1000) * estimatedCostPerKm;
  const compareRoutes = (a: OsrmRoute, b: OsrmRoute) => {
    if (optimizationMode === "shortest") return a.distance - b.distance;
    if (optimizationMode === "cheapest") {
      return fuelCostForRoute(a) - fuelCostForRoute(b);
    }
    return a.duration - b.duration;
  };
  let route = validRoutes.sort(
    (a, b) => compareRoutes(a.route, b.route) || a.index - b.index
  )[0]?.route;
  if (!route || !route.geometry?.coordinates?.length) {
    throw new Error("No route returned");
  }

  const hasAlternatives = validRoutes.length > 1;
  if (
    !hasAlternatives &&
    vehicleType === "car" &&
    optimizationMode !== "fastest"
  ) {
    const midpoint = {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2,
    };
    const latitudeOffset = optimizationMode === "shortest" ? 0.003 : -0.004;
    const waypoint = `${midpoint.lng},${midpoint.lat + latitudeOffset}`;
    const detourUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${waypoint};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
    try {
      const detourResponse = await fetch(detourUrl);
      if (detourResponse.ok) {
        const detourData = (await detourResponse.json()) as {
          routes?: OsrmRoute[];
        };
        const detourRoute = detourData.routes?.find(
          (candidate) => candidate.geometry?.coordinates?.length
        );
        if (detourRoute) route = detourRoute;
      }
    } catch {
      // Keep the original road route if the demonstration detour cannot be fetched.
    }
  }

  return {
    points:
      route.geometry?.coordinates?.map(([lng, lat]) => ({ lat, lng })) ?? [],
    distanceKm: route.distance / 1000,
    durationMinutes:
      (route.duration / 60) *
      (vehicleType === "car" ? urbanDrivingTimeFactor : 1),
  };
}
