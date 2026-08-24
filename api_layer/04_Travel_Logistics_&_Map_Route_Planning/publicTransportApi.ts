export interface PublicTransportStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  arrivalTime?: string;
  departureTime?: string;
}

export interface PublicTransportLeg {
  mode: 'walking' | 'bus' | 'lrt' | 'mrt';
  name: string;
  points: Array<{ lat: number; lng: number }>;
}

export interface PublicTransportRoute {
  stops: PublicTransportStop[];
  legs: PublicTransportLeg[];
  routeName: string;
  routeType: 'bus' | 'train' | 'tram' | 'subway' | 'light_rail' | 'unknown';
  points: Array<{ lat: number; lng: number }>;
}

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const getBoundingBox = (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
  const padding = 0.02;
  return [
    Math.min(origin.lat, destination.lat) - padding,
    Math.min(origin.lng, destination.lng) - padding,
    Math.max(origin.lat, destination.lat) + padding,
    Math.max(origin.lng, destination.lng) + padding,
  ].join(',');
};

export async function fetchPublicTransportRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<PublicTransportRoute> {
  const aroundStops = `(node["public_transport"="platform"](around:1800,${origin.lat},${origin.lng});node["highway"="bus_stop"](around:1800,${origin.lat},${origin.lng});node["public_transport"="platform"](around:1800,${destination.lat},${destination.lng});node["highway"="bus_stop"](around:1800,${destination.lat},${destination.lng});)`;
  const bbox = getBoundingBox(origin, destination);
  const query = `[out:json][timeout:20];(${aroundStops};relation["route"~"bus|train|tram|subway|light_rail"](${bbox}););out tags center;`;
  const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Public transport service failed');

  const data = (await response.json()) as { elements?: OverpassElement[] };
  const elements = data.elements ?? [];
  const routeRelation = elements.find((element) => element.tags?.route);
  const stops = elements
    .filter((element) => element.lat !== undefined && element.lon !== undefined)
    .map((element) => ({
      id: `osm-${element.id}`,
      name: element.tags?.name ?? element.tags?.local_ref ?? 'Unnamed stop',
      lat: element.lat as number,
      lng: element.lon as number,
      arrivalTime: element.tags?.arrival_time,
      departureTime: element.tags?.departure_time,
    }))
    .filter((stop, index, all) => all.findIndex((candidate) => candidate.id === stop.id) === index)
    .sort((a, b) => Math.hypot(a.lat - origin.lat, a.lng - origin.lng) - Math.hypot(b.lat - origin.lat, b.lng - origin.lng))
    .slice(0, 8);

  if (stops.length < 2) throw new Error('No public transport stops found');

  const routeStops = [
    { id: 'origin', name: 'Origin', lat: origin.lat, lng: origin.lng },
    ...stops,
    { id: 'destination', name: 'Destination', lat: destination.lat, lng: destination.lng },
  ];
  const routeType = routeRelation?.tags?.route;
  const transitMode: PublicTransportLeg['mode'] =
    routeType === 'subway'
      ? 'mrt'
      : routeType === 'train' || routeType === 'light_rail'
        ? 'lrt'
      : 'bus';
  const legs: PublicTransportLeg[] = [
    { mode: 'walking', name: 'Walk to transit', points: [origin, routeStops[1]] },
    {
      mode: transitMode,
      name: routeRelation?.tags?.name ?? (transitMode === 'mrt' ? 'MRT' : transitMode === 'lrt' ? 'LRT' : 'Bus'),
      points: routeStops.slice(1, -1),
    },
    {
      mode: 'walking',
      name: 'Walk to destination',
      points: [routeStops[routeStops.length - 2], destination],
    },
  ].filter((leg) => leg.points.length > 1) as PublicTransportLeg[];

  return {
    stops: routeStops,
    legs,
    routeName: routeRelation?.tags?.name ?? 'OpenStreetMap public transport route',
    routeType: (routeRelation?.tags?.route as PublicTransportRoute['routeType']) ?? 'unknown',
    points: routeStops.map(({ lat, lng }) => ({ lat, lng })),
  };
}