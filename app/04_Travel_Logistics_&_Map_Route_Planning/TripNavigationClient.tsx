"use client";

import { useEffect, useState, type ComponentType } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import type { LatLngExpression, LeafletMouseEvent } from "leaflet";

const AnyMapContainer = MapContainer as unknown as ComponentType<any>;
const AnyTileLayer = TileLayer as unknown as ComponentType<any>;
import { useTripNavigationStore } from "@/app/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";
import type {
  Stop,
  VehicleType,
} from "@/app/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";
import RouteAnalysisClient from "./RouteAnalysisClient";
import SavedRoutesClient from "./SavedRoutesClient";
import ExportRouteClient from "./ExportRouteClient";
import VehicleGarageClient from "./VehicleGarageClient";

const defaultMarkerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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
  { value: "car", label: "Car" },
  { value: "walk", label: "Walk" },
  { value: "public transport", label: "Public Transport" },
];

function AutoZoomToRoute({
  routeCoordinates,
}: {
  routeCoordinates: LatLngExpression[];
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates.length > 1) {
      map.fitBounds(routeCoordinates as [number, number][], {
        padding: [50, 50],
        maxZoom: 15,
      });
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
  activeField: "origin" | "destination" | null;
  onSelectLocation: (field: "origin" | "destination", stop: Stop) => void;
}) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      const field = activeField ?? "destination";
      const stop: Stop = {
        id: `${field}-${Date.now()}`,
        name: field === "origin" ? "Picked origin" : "Picked destination",
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
    loadSavedRoute,
    saveRoute,
    deleteSavedRoute,
  } = useTripNavigationStore();

  const [routeName, setRouteName] = useState("");
  const [originInput, setOriginInput] = useState(origin?.name ?? "");
  const [destinationInput, setDestinationInput] = useState(
    destination?.name ?? ""
  );
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "planner" | "analysis" | "saved" | "garage" | "export"
  >("planner");

  const mapCenter: LatLngExpression = [3.139, 101.6869];
  const routeCoordinates = (generatedRoute ?? []).map(
    (stop) => [stop.lat, stop.lng] as LatLngExpression
  );

  const routeStyle = {
    car: {
      color: '#2563eb',
      weight: 5,
      dashArray: '',
    },
    walk: {
      color: '#16a34a',
      weight: 4,
      dashArray: '4,8',
    },
    'public transport': {
      color: '#f59e0b',
      weight: 5,
      dashArray: '8,6',
    },
  }[vehicleType];

  const optimizationLabel = {
    fastest: 'Fastest route with priority on time',
    shortest: 'Shortest route with the straightest path',
    cheapest: 'Cheapest route with cost-saving detours',
  }[optimizationMode];

  useEffect(() => {
    setOriginInput(origin?.name ?? "");
  }, [origin?.name]);

  useEffect(() => {
    setDestinationInput(destination?.name ?? "");
  }, [destination?.name]);

  useEffect(() => {
    const query = activeField === "origin" ? originInput : destinationInput;
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

  const handleFieldChange = (
    field: "origin" | "destination",
    value: string
  ) => {
    if (field === "origin") {
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

    setRouteLocation(activeField ?? "destination", stop);
    if (activeField === "origin") {
      setOriginInput(stop.name);
    } else {
      setDestinationInput(stop.name);
    }
    setSuggestions([]);
  };

  const handleUseMyLocation = (field: "origin" | "destination") => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const stop: Stop = {
          id: `${field}-${Date.now()}`,
          name: "Current location",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setRouteLocation(field, stop);
        if (field === "origin") {
          setOriginInput(stop.name);
        } else {
          setDestinationInput(stop.name);
        }
      },
      () => {
        window.alert("Location access was denied or unavailable.");
      }
    );
  };

  const handleSave = () => {
    saveRoute(routeName);
    setRouteName("");
  };

  return (
    <div className="space-y-6">
      <div className="shadow-base flex flex-wrap items-center gap-2 rounded-3xl border border-gray-200 bg-white p-3">
        {[
          { key: "planner", label: "Planner" },
          { key: "analysis", label: "Analysis" },
          { key: "saved", label: "Saved" },
          { key: "garage", label: "Garage" },
          { key: "export", label: "Export" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key as typeof activeSection)}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
              activeSection === tab.key
                ? "bg-primary-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === "planner" ? (
        <>
          <section className="shadow-base overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="from-primary-500 to-secondary-500 flex items-center justify-between border-b border-gray-200 bg-gradient-to-r p-4 text-white">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-gray-100 uppercase">
              TravelSync
            </p>
            <h2 className="text-xl font-bold">
              Travel Logistics & Route Planning
            </h2>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase">
            Malaysia
          </span>
        </div>

        <div className="relative h-[440px] w-full">
          <AnyMapContainer
            center={mapCenter}
            zoom={11}
            scrollWheelZoom
            className="h-full w-full"
          >
            <AnyTileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RouteMapHandler
              activeField={activeField}
              onSelectLocation={setRouteLocation}
            />
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
            {routeCoordinates.length > 1 && (
              <Polyline
                positions={routeCoordinates}
                pathOptions={{
                  color: routeStyle.color,
                  weight: routeStyle.weight,
                  dashArray: routeStyle.dashArray,
                }}
              />
            )}
          </AnyMapContainer>

          <div className="pointer-events-none absolute inset-x-4 top-4 z-[1000] max-w-[390px] rounded-3xl border border-gray-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
            <div className="pointer-events-auto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-500 text-sm font-semibold">
                    Route picker
                  </p>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Plan your trip
                  </h3>
                </div>
                <button
                  onClick={() => setRoutePickerOpen(!routePickerOpen)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500"
                >
                  {routePickerOpen ? "Hide" : "Show"}
                </button>
              </div>

              {routePickerOpen && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
                      Origin
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={originInput}
                        onFocus={() => setActiveField("origin")}
                        onChange={(event) =>
                          handleFieldChange("origin", event.target.value)
                        }
                        placeholder="Enter origin"
                        className="focus:border-primary-500 w-full rounded-2xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm outline-none"
                      />
                      <button
                        onClick={() => handleUseMyLocation("origin")}
                        className="bg-primary-500 rounded-2xl px-3 py-2 text-sm font-semibold text-white"
                      >
                        GPS
                      </button>
                    </div>
                    {activeField === "origin" && suggestions.length > 0 && (
                      <ul className="shadow-base mt-2 rounded-2xl border border-gray-200 bg-white p-2 text-sm">
                        {suggestions.map((suggestion) => (
                          <li
                            key={`${suggestion.display_name}-${suggestion.lat}`}
                          >
                            <button
                              onClick={() => handleSelectSuggestion(suggestion)}
                              className="w-full rounded-xl px-2 py-2 text-left hover:bg-gray-100"
                            >
                              {suggestion.display_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
                      Destination
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={destinationInput}
                        onFocus={() => setActiveField("destination")}
                        onChange={(event) =>
                          handleFieldChange("destination", event.target.value)
                        }
                        placeholder="Enter destination"
                        className="focus:border-secondary-500 w-full rounded-2xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm outline-none"
                      />
                      <button
                        onClick={() => handleUseMyLocation("destination")}
                        className="bg-secondary-500 rounded-2xl px-3 py-2 text-sm font-semibold text-white"
                      >
                        GPS
                      </button>
                    </div>
                    {activeField === "destination" &&
                      suggestions.length > 0 && (
                        <ul className="shadow-base mt-2 rounded-2xl border border-gray-200 bg-white p-2 text-sm">
                          {suggestions.map((suggestion) => (
                            <li
                              key={`${suggestion.display_name}-${suggestion.lat}`}
                            >
                              <button
                                onClick={() =>
                                  handleSelectSuggestion(suggestion)
                                }
                                className="w-full rounded-xl px-2 py-2 text-left hover:bg-gray-100"
                              >
                                {suggestion.display_name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>

                  <p className="text-xs text-gray-500">
                    {isSearching
                      ? "Searching places…"
                      : "Search suggestions come from OpenStreetMap and you can also click the map or use GPS."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="shadow-base rounded-3xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Travel options
              </h3>
              <button
                onClick={() => setRoutePickerOpen(true)}
                className="text-primary-500 text-sm font-semibold"
              >
                Edit route
              </button>
            </div>

            <label className="mt-4 mb-2 block text-sm font-semibold text-gray-800">
              Vehicle type
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {vehicleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setVehicleType(option.value)}
                  className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                    vehicleType === option.value
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "hover:border-primary-500 border-gray-200 bg-white text-gray-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={generateRoute}
                className="bg-primary-500 shadow-base hover:shadow-hover rounded-2xl px-4 py-2 text-sm font-semibold text-white transition"
              >
                Generate Route
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => applyOptimization("fastest")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  optimizationMode === "fastest"
                    ? "bg-primary-500 text-white"
                    : "hover:border-primary-500 border border-gray-200 bg-white text-gray-800"
                }`}
              >
                ⚡ Fastest
              </button>
              <button
                onClick={() => applyOptimization("shortest")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  optimizationMode === "shortest"
                    ? "bg-primary-500 text-white"
                    : "hover:border-primary-500 border border-gray-200 bg-white text-gray-800"
                }`}
              >
                📏 Shortest
              </button>
              <button
                onClick={() => applyOptimization("cheapest")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  optimizationMode === "cheapest"
                    ? "bg-primary-500 text-white"
                    : "hover:border-primary-500 border border-gray-200 bg-white text-gray-800"
                }`}
              >
                💰 Cheapest
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500">{optimizationLabel}</p>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="shadow-base rounded-3xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Route summary
              </h3>
              <span className="text-primary-500 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase">
                {optimizationMode ?? "standard"}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm text-gray-500">
              <div className="flex items-center justify-between">
                <span>Total distance</span>
                <span className="font-semibold text-gray-800">
                  {summary.distanceKm.toFixed(1)} km
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total time</span>
                <span className="font-semibold text-gray-800">
                  {summary.timeMinutes} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fuel needed</span>
                <span className="font-semibold text-gray-800">
                  {summary.fuelLiters.toFixed(1)} L
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fuel cost</span>
                <span className="font-semibold text-gray-800">
                  RM {summary.fuelCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="shadow-base rounded-3xl border border-gray-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-gray-800">
              Route points
            </h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-100 px-3 py-3">
                <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
                  Origin
                </p>
                <p className="mt-1 font-medium text-gray-800">
                  {origin?.name ?? "Not selected"}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-100 px-3 py-3">
                <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
                  Destination
                </p>
                <p className="mt-1 font-medium text-gray-800">
                  {destination?.name ?? "Not selected"}
                </p>
              </div>
            </div>
          </div>

          <div className="shadow-base rounded-3xl border border-gray-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-gray-800">Save route</h3>
            <input
              value={routeName}
              onChange={(event) => setRouteName(event.target.value)}
              placeholder="Route name"
              className="focus:border-primary-500 mt-3 w-full rounded-2xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={handleSave}
              className="bg-secondary-500 hover:shadow-hover mt-3 w-full rounded-2xl px-4 py-2 text-sm font-semibold text-white transition"
            >
              Save Route
            </button>
          </div>
        </aside>
      </div>
    </>
  ) : activeSection === "analysis" ? (
      <div className="space-y-6">
        <RouteAnalysisClient />
      </div>
    ) : activeSection === "saved" ? (
      <div className="space-y-6">
        <SavedRoutesClient />
      </div>
    ) : activeSection === "garage" ? (
      <div className="space-y-6">
        <VehicleGarageClient />
      </div>
    ) : (
      <div className="space-y-6">
        <ExportRouteClient />
      </div>
    )}
  </div>
);
}
