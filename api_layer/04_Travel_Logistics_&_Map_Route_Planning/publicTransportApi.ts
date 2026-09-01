import { fetchRouteShape } from './osrmApi';

export interface PublicTransportStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  arrivalTime?: string;
  departureTime?: string;
}

export interface PublicTransportLeg {
  mode: 'walking' | 'bus' | 'lrt' | 'mrt' | 'monorail' | 'train' | 'brt';
  name: string;
  points: Array<{ lat: number; lng: number }>;
}

export interface PublicTransportRoute {
  stops: PublicTransportStop[];
  legs: PublicTransportLeg[];
  routeName: string;
  routeType: 'bus' | 'train' | 'tram' | 'subway' | 'light_rail' | 'unknown';
  points: Array<{ lat: number; lng: number }>;
  availableModes: Array<Exclude<PublicTransportLeg['mode'], 'walking'>>;
}

type Coordinates = { lat: number; lng: number };
type GtfsRow = Record<string, string>;
type GtfsRoute = {
  route_id: string;
  route_type: string;
  route_short_name: string;
  route_long_name: string;
  category: string;
  feedCategory: string;
  stopIds: Set<string>;
};
type GtfsTrip = {
  routeId: string;
  stopTimes: Array<{ stopId: string; stopSequence: number; arrivalTime?: string; departureTime?: string }>;
};

const GTFS_BASE_URL = 'https://api.data.gov.my/gtfs-static/prasarana';
const RAPID_CATEGORIES = ['rapid-rail-kl', 'rapid-bus-kl', 'rapid-bus-mrtfeeder'];
const WALKING_SPEED_KM_PER_HOUR = 4.32;
const MAX_TRANSIT_ACCESS_DISTANCE_KM = 3;
const feedCache = new Map<string, ReturnType<typeof loadFeed>>();

const isInMalaysia = ({ lat, lng }: Coordinates) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 0.8 && lat <= 7.8 && lng >= 99.5 && lng <= 119.5;

const distanceBetween = (first: Coordinates, second: Coordinates) => {
  const latitude = (first.lat - second.lat) * 111;
  const longitude = (first.lng - second.lng) * 111 * Math.cos((first.lat * Math.PI) / 180);
  return Math.hypot(latitude, longitude);
};

const routeLegOnRoads = async (first: Coordinates, second: Coordinates) => {
  try {
    return (await fetchRouteShape(first, second, 'walk', 'fastest')).points;
  } catch {
    return [first, second];
  }
};

const parseCsv = (text: string): GtfsRow[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (const character of text.replace(/^\uFEFF/, '')) {
    if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(value); value = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (value || row.length) { row.push(value); rows.push(row); }
      row = []; value = '';
    } else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift() ?? [];
  return rows.map((fields) => Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ''])));
};

const readZipFiles = async (buffer: ArrayBuffer): Promise<Map<string, string>> => {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error('Invalid GTFS ZIP');
  const count = view.getUint16(end + 10, true);
  const centralOffset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const files = new Map<string, string>();
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('Invalid GTFS directory');
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(start, start + compressedSize);
    let content: ArrayBuffer;
    if (method === 0) content = compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength);
    else if (method === 8) content = await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    else { cursor += 46 + nameLength + extraLength + commentLength; continue; }
    files.set(name, decoder.decode(content));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
};

const loadFeed = async (category: string) => {
  const response = await fetch(`${GTFS_BASE_URL}?category=${category}`);
  if (!response.ok) throw new Error(`GTFS feed unavailable: ${category}`);
  const files = await readZipFiles(await response.arrayBuffer());
  const stops = parseCsv(files.get('stops.txt') ?? '').filter((stop) => stop.stop_id && stop.stop_lat && stop.stop_lon);
  const routes: GtfsRoute[] = parseCsv(files.get('routes.txt') ?? '').map((route) => ({
    route_id: route.route_id ?? '', route_type: route.route_type ?? '',
    route_short_name: route.route_short_name ?? '', route_long_name: route.route_long_name ?? '', category: route.category ?? '', feedCategory: category, stopIds: new Set<string>(),
  }));
  const routeById = new Map(routes.map((route) => [route.route_id, route]));
  const trips = new Map<string, GtfsTrip>(parseCsv(files.get('trips.txt') ?? '').map((trip) => [trip.trip_id, { routeId: trip.route_id, stopTimes: [] }]));
  for (const stopTime of parseCsv(files.get('stop_times.txt') ?? '')) {
    const trip = trips.get(stopTime.trip_id);
    if (!trip || !stopTime.stop_id) continue;
    trip.stopTimes.push({
      stopId: stopTime.stop_id,
      stopSequence: Number(stopTime.stop_sequence),
      arrivalTime: stopTime.arrival_time || undefined,
      departureTime: stopTime.departure_time || undefined,
    });
    routeById.get(trip.routeId)?.stopIds.add(stopTime.stop_id);
  }
  return { stops, routes, trips: [...trips.values()].filter((trip) => trip.stopTimes.length > 1) };
};

const loadCachedFeed = (category: string) => {
  const cachedFeed = feedCache.get(category);
  if (cachedFeed) return cachedFeed;

  const feedPromise = loadFeed(category);
  feedCache.set(category, feedPromise);
  return feedPromise;
};

const classifyMode = (route: GtfsRoute): PublicTransportLeg['mode'] => {
  const text = `${route.route_short_name} ${route.route_long_name}`.toLowerCase();
  const category = `${route.category} ${route.feedCategory}`.toLowerCase();
  if (category.includes('monorail') || text.includes('monorail')) return 'monorail';
  if (category.includes('brt') || text.includes('brt')) return 'brt';
  if (category.includes('lrt') || text.includes('lrt')) return 'lrt';
  if (category.includes('mrt') || text.includes('mrt')) return 'mrt';
  if (route.route_type === '1') return 'mrt';
  if (route.route_type === '0') return 'lrt';
  if (route.route_type === '2' || text.includes('rail')) return 'train';
  return 'bus';
};

const getRouteType = (route: GtfsRoute): PublicTransportRoute['routeType'] =>
  route.route_type === '1' ? 'subway' : route.route_type === '0' ? 'tram' : route.route_type === '2' ? 'train' : route.route_type === '3' ? 'bus' : 'unknown';

export async function fetchPublicTransportRoute(
  origin: Coordinates,
  destination: Coordinates,
  preferredMode?: PublicTransportLeg['mode'] | null
): Promise<PublicTransportRoute> {
  if (!isInMalaysia(origin) || !isInMalaysia(destination)) throw new Error('Rapid GTFS is only available in Malaysia');
  type TransitCandidate = {
    route: GtfsRoute;
    boarding: GtfsRow;
    alighting: GtfsRow;
    boardingTime?: string;
    alightingTime?: string;
    score: number;
    orderedStops: GtfsTrip['stopTimes'];
    boardingIndex: number;
    alightingIndex: number;
    stopById: Map<string, GtfsRow>;
  };
  const candidates: TransitCandidate[] = [];
  const feeds = await Promise.all(RAPID_CATEGORIES.map(async (category) => {
    try {
      return await loadCachedFeed(category);
    } catch {
      return null;
    }
  }));
  for (const feed of feeds) {
    if (!feed) continue;
    const stopById = new Map(feed.stops.map((stop) => [stop.stop_id, stop]));
    const routeById = new Map(feed.routes.map((route) => [route.route_id, route]));
    const feedCandidates = feed.trips.map((trip) => {
        const route = routeById.get(trip.routeId);
        if (!route) return null;
        const orderedStops = [...trip.stopTimes].sort((a, b) => a.stopSequence - b.stopSequence);
        let best: Omit<TransitCandidate, 'route' | 'stopById'> | null = null;
        for (let boardingIndex = 0; boardingIndex < orderedStops.length; boardingIndex += 1) {
          const boardingTime = orderedStops[boardingIndex];
          const boarding = stopById.get(boardingTime.stopId);
          if (!boarding) continue;
          for (let alightingIndex = boardingIndex + 1; alightingIndex < orderedStops.length; alightingIndex += 1) {
            const alightingTime = orderedStops[alightingIndex];
            const alighting = stopById.get(alightingTime.stopId);
            if (!alighting) continue;
            const score = distanceBetween({ lat: Number(boarding.stop_lat), lng: Number(boarding.stop_lon) }, origin) + distanceBetween({ lat: Number(alighting.stop_lat), lng: Number(alighting.stop_lon) }, destination);
            if (!best || score < best.score) best = {
              boarding,
              alighting,
              boardingTime: boardingTime.departureTime || boardingTime.arrivalTime,
              alightingTime: alightingTime.arrivalTime || alightingTime.departureTime,
              score,
              orderedStops,
              boardingIndex,
              alightingIndex,
            };
          }
        }
        return best ? { route, stopById, ...best } : null;
      }).filter((item): item is TransitCandidate => Boolean(item));
    candidates.push(...feedCandidates.filter((candidate) => candidate.score <= MAX_TRANSIT_ACCESS_DISTANCE_KM));
  }
  const modePriority: Record<PublicTransportLeg['mode'], number> = { train: 0, mrt: 0, lrt: 0, monorail: 0, brt: 1, bus: 2, walking: 3 };
  const candidatesForPreferredMode = preferredMode
    ? candidates.filter((item) => classifyMode(item.route) === preferredMode)
    : candidates;
  const candidate = (candidatesForPreferredMode.length ? candidatesForPreferredMode : candidates).sort((first, second) => {
    const scoreDifference = first.score - second.score;
    if (Math.abs(scoreDifference) > 0.5) return scoreDifference;
    return modePriority[classifyMode(first.route)] - modePriority[classifyMode(second.route)];
  })[0];
  if (!candidate) throw new Error('No Rapid KL GTFS route found');
  const availableModes = [...new Set(candidates.map((item) => classifyMode(item.route)).filter((mode): mode is Exclude<PublicTransportLeg['mode'], 'walking'> => mode !== 'walking'))];

  const { route, boarding, alighting, boardingTime, alightingTime, orderedStops, boardingIndex, alightingIndex, stopById } = candidate;
  const toStop = { id: `gtfs-${boarding.stop_id}`, name: boarding.stop_name || 'Rapid stop', lat: Number(boarding.stop_lat), lng: Number(boarding.stop_lon), departureTime: boardingTime };
  const fromStop = { id: `gtfs-${alighting.stop_id}`, name: alighting.stop_name || 'Rapid stop', lat: Number(alighting.stop_lat), lng: Number(alighting.stop_lon), arrivalTime: alightingTime };
  const transitStops = orderedStops.slice(boardingIndex, alightingIndex + 1).map((stopTime, index): PublicTransportStop | null => {
    const stop = stopById.get(stopTime.stopId);
    return stop ? {
      id: `gtfs-${stop.stop_id}-${index}`,
      name: stop.stop_name || 'Rapid stop',
      lat: Number(stop.stop_lat),
      lng: Number(stop.stop_lon),
      arrivalTime: stopTime.arrivalTime,
      departureTime: stopTime.departureTime,
    } : null;
  }).filter((stop): stop is PublicTransportStop => Boolean(stop));
  const name = route.route_long_name || route.route_short_name || `${route.feedCategory} service`;
  const stops: PublicTransportStop[] = [{ id: 'origin', name: 'Origin', lat: origin.lat, lng: origin.lng }, ...transitStops, { id: 'destination', name: 'Destination', lat: destination.lat, lng: destination.lng }];
  const [accessRoute, egressRoute] = await Promise.all([
    routeLegOnRoads(origin, toStop),
    routeLegOnRoads(fromStop, destination),
  ]);
  const legs: PublicTransportLeg[] = [
    { mode: 'walking', name: 'Walk to transit', points: accessRoute },
    { mode: classifyMode(route), name, points: transitStops.length > 1 ? transitStops : [toStop, fromStop] },
    { mode: 'walking', name: 'Walk to destination', points: egressRoute },
  ];
  return { stops, legs, routeName: name, routeType: getRouteType(route), points: stops.map(({ lat, lng }) => ({ lat, lng })), availableModes };
}

export const getPublicTransportSpeed = (mode: PublicTransportLeg['mode']) =>
  mode === 'walking' ? WALKING_SPEED_KM_PER_HOUR : mode === 'train' ? 45 : mode === 'mrt' ? 35 : mode === 'lrt' ? 32 : mode === 'monorail' ? 28 : mode === 'brt' ? 25 : 20;
