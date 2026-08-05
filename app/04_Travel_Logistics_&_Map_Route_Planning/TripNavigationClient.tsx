'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { useTripNavigationStore } from '@/app/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore';
import type { Stop, VehicleType } from '@/app/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore';

const defaultMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultMarkerIcon;

interface PlaceSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

const vehicleOptions: Array<{ value: VehicleType; label: string }> = [
  { value: 'car', label: 'Car' },
  { value: 'walk', label: 'Walk' },
  { value: 'public transport', label: 'Public Transport' },
];

function AutoZoomToRoute({ routeCoordinates }: { routeCoordinates: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates.length > 1) {
      map.fitBounds(routeCoordinates as [number, number][], { padding: [50, 50], maxZoom: 15 });
    } else if (routeCoordinates.length === 1) {
      map.setView(routeCoordinates[0], 13);
    }
  }, [map, routeCoordinates]);

  return null;
}

function RouteMapHandler({
  activeField,
  onSelectLocation,
}: {
  activeField: 'origin' | 'destination' | null;
  onSelectLocation: (field: 'origin' | 'destination', stop: Stop) => void;
}) {
  useMapEvents({
    click: (event) => {
      const { lat, lng } = event.latlng;
      const field = activeField ?? 'destination';
      const stop: Stop = {
        id: `${field}-${Date.now()}`,
        name: field === 'origin' ? 'Picked origin' : 'Picked destination',
        lat,
        lng,
      };
      onSelectLocation(field, stop);
    },
  });

  return null;
}

export default function TripNavigationClient() {
  const {
    vehicleType,
    origin,
    destination,
    generatedRoute,
    summary,
    savedRoutes,
    routePickerOpen,
    activeField,
    optimizationMode,
    setVehicleType,
    setRoutePickerOpen,
    setActiveField,
    setRouteLocation,
    generateRoute,
    applyOptimization,
    saveRoute,
    deleteSavedRoute,
  } = useTripNavigationStore();

  const [routeName, setRouteName] = useState('');
  const [originInput, setOriginInput] = useState(origin?.name ?? '');
  const [destinationInput, setDestinationInput] = useState(destination?.name ?? '');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const mapCenter: LatLngExpression = [3.139, 101.6869];
  const routeCoordinates = generatedRoute.map((stop) => [stop.lat, stop.lng] as LatLngExpression);

  useEffect(() => {
    setOriginInput(origin?.name ?? '');
  }, [origin?.name]);

  useEffect(() => {
    setDestinationInput(destination?.name ?? '');
  }, [destination?.name]);

  useEffect(() => {
    const query = activeField === 'origin' ? originInput : destinationInput;
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchSuggestions(query);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [activeField, destinationInput, originInput]);

  const fetchSuggestions = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`
      );
      const data = (await response.json()) as PlaceSuggestion[];
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFieldChange = (field: 'origin' | 'destination', value: string) => {
    if (field === 'origin') {
      setOriginInput(value);
    } else {
      setDestinationInput(value);
    }
    setActiveField(field);
  };

  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    const stop: Stop = {
      id: `${activeField}-${Date.now()}`,
      name: suggestion.display_name,
      lat: Number(suggestion.lat),
      lng: Number(suggestion.lon),
    };

    setRouteLocation(activeField ?? 'destination', stop);
    if (activeField === 'origin') {
      setOriginInput(stop.name);
    } else {
      setDestinationInput(stop.name);
    }
    setSuggestions([]);
  };

  const handleUseMyLocation = (field: 'origin' | 'destination') => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const stop: Stop = {
          id: `${field}-${Date.now()}`,
          name: 'Current location',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setRouteLocation(field, stop);
        if (field === 'origin') {
          setOriginInput(stop.name);
        } else {
          setDestinationInput(stop.name);
        }
      },
      () => {
        window.alert('Location access was denied or unavailable.');
      }
    );
  };

  const handleSave = () => {
    saveRoute(routeName);
    setRouteName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <Link href="/saved-routes" className="rounded-full bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Saved Routes
        </Link>
        <Link href="/route-analysis" className="rounded-full bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
          Route Analysis
        </Link>
        <Link href="/vehicle-garage" className="rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Vehicle Garage
        </Link>
        <Link href="/export-route" className="rounded-full bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
          Export Route
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-500 p-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-100">TravelSync</p>
            <h2 className="text-xl font-bold">Travel Logistics & Route Planning</h2>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
            Malaysia
          </span>
        </div>

        <div className="relative h-[440px] w-full">
          <MapContainer center={mapCenter} zoom={11} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RouteMapHandler activeField={activeField} onSelectLocation={setRouteLocation} />
            <AutoZoomToRoute routeCoordinates={routeCoordinates} />
            {origin && (
              <Marker position={[origin.lat, origin.lng]}>
                <Popup>{origin.name}</Popup>
              </Marker>
            )}
            {destination && (
              <Marker position={[destination.lat, destination.lng]}>
                <Popup>{destination.name}</Popup>
              </Marker>
            )}
            {routeCoordinates.length > 1 && <Polyline positions={routeCoordinates} color="#2563eb" weight={4} />}
          </MapContainer>

          <div className="pointer-events-none absolute inset-x-4 top-4 z-[1000] max-w-[390px] rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="pointer-events-auto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600">Route picker</p>
                  <h3 className="text-lg font-semibold text-slate-900">Plan your trip</h3>
                </div>
                <button
                  onClick={() => setRoutePickerOpen(!routePickerOpen)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {routePickerOpen ? 'Hide' : 'Show'}
                </button>
              </div>

              {routePickerOpen && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Origin
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={originInput}
                        onFocus={() => setActiveField('origin')}
                        onChange={(event) => handleFieldChange('origin', event.target.value)}
                        placeholder="Enter origin"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleUseMyLocation('origin')}
                        className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                      >
                        GPS
                      </button>
                    </div>
                    {activeField === 'origin' && suggestions.length > 0 && (
                      <ul className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-sm">
                        {suggestions.map((suggestion) => (
                          <li key={`${suggestion.display_name}-${suggestion.lat}`}>
                            <button
                              onClick={() => handleSelectSuggestion(suggestion)}
                              className="w-full rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                            >
                              {suggestion.display_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Destination
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={destinationInput}
                        onFocus={() => setActiveField('destination')}
                        onChange={(event) => handleFieldChange('destination', event.target.value)}
                        placeholder="Enter destination"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleUseMyLocation('destination')}
                        className="rounded-2xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white"
                      >
                        GPS
                      </button>
                    </div>
                    {activeField === 'destination' && suggestions.length > 0 && (
                      <ul className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-sm">
                        {suggestions.map((suggestion) => (
                          <li key={`${suggestion.display_name}-${suggestion.lat}`}>
                            <button
                              onClick={() => handleSelectSuggestion(suggestion)}
                              className="w-full rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                            >
                              {suggestion.display_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    {isSearching
                      ? 'Searching places…'
                      : 'Search suggestions come from OpenStreetMap and you can also click the map or use GPS.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Travel options</h3>
              <button onClick={() => setRoutePickerOpen(true)} className="text-sm font-semibold text-blue-600">
                Edit route
              </button>
            </div>

            <label className="mt-4 mb-2 block text-sm font-semibold text-slate-700">Vehicle type</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {vehicleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setVehicleType(option.value)}
                  className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                    vehicleType === option.value
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={generateRoute}
                className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Generate Route
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => applyOptimization('fastest')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  optimizationMode === 'fastest'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                }`}
              >
                ⚡ Fastest
              </button>
              <button
                onClick={() => applyOptimization('shortest')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  optimizationMode === 'shortest'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                }`}
              >
                📏 Shortest
              </button>
              <button
                onClick={() => applyOptimization('cheapest')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  optimizationMode === 'cheapest'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                }`}
              >
                💰 Cheapest
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Route summary</h3>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                {optimizationMode ?? 'standard'}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Total distance</span>
                <span className="font-semibold text-slate-900">{summary.distanceKm.toFixed(1)} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total time</span>
                <span className="font-semibold text-slate-900">{summary.timeMinutes} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fuel needed</span>
                <span className="font-semibold text-slate-900">{summary.fuelLiters.toFixed(1)} L</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fuel cost</span>
                <span className="font-semibold text-slate-900">RM {summary.fuelCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Route points</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Origin</p>
                <p className="mt-1 font-medium text-slate-800">{origin?.name ?? 'Not selected'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Destination</p>
                <p className="mt-1 font-medium text-slate-800">{destination?.name ?? 'Not selected'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Save route</h3>
            <input
              value={routeName}
              onChange={(event) => setRouteName(event.target.value)}
              placeholder="Route name"
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSave}
              className="mt-3 w-full rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              Save Route
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Saved routes</h3>
              <span className="text-sm text-slate-500">{savedRoutes.length} saved</span>
            </div>
            <div className="mt-4 space-y-3">
              {savedRoutes.length === 0 && <p className="text-sm text-slate-500">No saved routes yet.</p>}
              {savedRoutes.slice(0, 3).map((route) => (
                <div key={route.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{route.name}</p>
                      <p className="text-xs text-slate-500">
                        {route.summary.distanceKm.toFixed(1)} km • {route.summary.timeMinutes} min
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                      {route.vehicleType}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => deleteSavedRoute(route.id)}
                      className="rounded-xl border border-red-200 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}