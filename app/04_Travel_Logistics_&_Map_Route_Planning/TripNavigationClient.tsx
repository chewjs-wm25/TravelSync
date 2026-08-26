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
import { useTripNavigationStore } from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";
import type {
  Stop,
  VehicleType,
} from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";
import {
  fetchSuggestions,
  type PlaceSuggestion,
} from "@/api_layer/04_Travel_Logistics_&_Map_Route_Planning/nominatimApi";
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

const vehicleOptions: Array<{ value: VehicleType; label: string }> = [
  { value: "car", label: "Car/Motorcycle" },
  { value: "walk", label: "Walk" },
  { value: "public transport", label: "Public Transport" },
];

const publicTransportOptions = ["LRT", "MRT", "Bus", "Walking"];

const transitSpeedsKmPerHour = {
  lrt: 32,
  mrt: 35,
  bus: 20,
  // align walking speed with store: 1.2 m/s = 4.32 km/h
  walking: 4.32,
} as const;

const getDistanceKm = (points: Array<{ lat: number; lng: number }>) =>
  points.slice(1).reduce((distance, point, index) => {
    const previous = points[index];
    const latitudeDistance = (point.lat - previous.lat) * 111;
    const longitudeDistance =
      (point.lng - previous.lng) * 111 * Math.cos((point.lat * Math.PI) / 180);
    return distance + Math.hypot(latitudeDistance, longitudeDistance);
  }, 0);

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
    publicTransportStops,
    publicTransportLegs,
    isRouteLoading,
    vehicles,
    selectedVehicleId,
    setSelectedVehicleId,
  } = useTripNavigationStore();

  const [routeName, setRouteName] = useState("");
  const [originInput, setOriginInput] = useState(origin?.name ?? "");
  const [destinationInput, setDestinationInput] = useState(
    destination?.name ?? ""
  );
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const transitDetails = publicTransportLegs.map((leg) => {
    const distanceKm = getDistanceKm(leg.points);
    const minutes = Math.max(
      1,
      Number(((distanceKm / transitSpeedsKmPerHour[leg.mode]) * 60).toFixed(1))
    );
    const stopCount = publicTransportStops.filter((stop) =>
      leg.points.some((point) => point.lat === stop.lat && point.lng === stop.lng)
    ).length;
    const cost = leg.mode === "walking"
      ? 0
      : leg.mode === "bus"
        ? 1
        : (leg.mode === 'lrt' || leg.mode === 'mrt')
          ? 2.5
          : Math.max(1, stopCount - 1) * 0.5;

    return { leg, minutes, cost };
  });
  const transitFare = transitDetails.reduce((total, detail) => total + detail.cost, 0);

  useEffect(() => {
    setOriginInput(origin?.name ?? "");
  }, [origin?.name]);

  useEffect(() => {
    setDestinationInput(destination?.name ?? "");
  }, [destination?.name]);

  useEffect(() => {
    if (!activeField) {
      setSuggestions([]);
      return;
    }

    const query = activeField === "origin" ? originInput : destinationInput;
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchPlaces(query);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [activeField, destinationInput, originInput]);

  const searchPlaces = async (query: string) => {
    setIsSearching(true);
    try {
      const data = await fetchSuggestions(query);
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
    setActiveField(null);
  };

  const handleGenerateRoute = async () => {
    setIsGenerating(true);
    setSuggestions([]);
    setActiveField(null);
    try {
      await generateRoute();
    } finally {
      setIsGenerating(false);
    }
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
            {vehicleType === "public transport" && publicTransportLegs.length > 0 ? (
              publicTransportLegs.map((leg) => (
                <Polyline
                  key={`${leg.mode}-${leg.name}`}
                  positions={leg.points.map((point) => [point.lat, point.lng] as LatLngExpression)}
                  pathOptions={{
                    color: leg.mode === "walking" ? "#16a34a" : leg.mode === "lrt" ? "#dc2626" : leg.mode === "mrt" ? "#7c3aed" : "#2563eb",
                    weight: 5,
                    dashArray: leg.mode === "walking" ? "5, 8" : undefined,
                  }}
                />
              ))
            ) : routeCoordinates.length > 1 && (
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

          {vehicleType === "public transport" && publicTransportLegs.length > 0 && (
            <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-2xl border border-gray-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
              <p className="font-semibold text-gray-800">Transit route</p>
              <div className="mt-2 flex flex-wrap gap-3 text-gray-600">
                {publicTransportLegs.map((leg) => (
                  <span key={`${leg.mode}-legend`} className="flex items-center gap-1">
                    <span className={`h-2 w-5 rounded-full ${leg.mode === "walking" ? "bg-green-600" : leg.mode === "lrt" ? "bg-red-600" : leg.mode === "mrt" ? "bg-violet-600" : "bg-blue-600"}`} />
                    {leg.mode === "walking" ? "Walking" : leg.mode === "lrt" ? "LRT" : leg.mode === "mrt" ? "MRT" : "Bus"}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={`pointer-events-none absolute inset-x-4 top-4 z-[1000] max-w-[390px] rounded-3xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur ${routePickerOpen ? "p-4" : "p-2"}`}>
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
                    </div>
                    {activeField === "origin" && suggestions.length > 0 && (
                      <ul className="shadow-base mt-2 max-h-40 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 text-sm">
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
                    </div>
                    {activeField === "destination" &&
                      suggestions.length > 0 && (
                        <ul className="shadow-base mt-2 max-h-40 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 text-sm">
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
                      : "Search suggestions come from OpenStreetMap and you can also click the map."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleGenerateRoute()}
                      disabled={isGenerating || !origin || !destination}
                      className="bg-primary-500 shadow-base hover:shadow-hover rounded-2xl px-4 py-2 text-sm font-semibold text-white transition"
                    >
                      {isGenerating ? "Refreshing..." : "Generate Route"}
                    </button>
                  </div>
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

            <label className="mt-4 mb-2 block text-sm font-semibold text-gray-800">
              Car / Motorcycle
            </label>
            <select
              value={selectedVehicleId}
              onChange={(event) => setSelectedVehicleId(event.target.value)}
              className="focus:border-primary-500 w-full rounded-2xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm outline-none"
              disabled={vehicleType !== "car"}
            >
              {vehicles
                .filter((vehicle) => vehicle.category === "car" || vehicle.category === "motorcycle")
                .map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.category === "motorcycle" ? "Motorcycle" : "Car"} - {vehicle.name}
                    {vehicle.isDefault ? " (Default)" : ""}
                  </option>
                ))}
            </select>

            <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={vehicleType !== "car"}
                  onClick={() => applyOptimization("fastest")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  optimizationMode === "fastest"
                    ? "bg-primary-500 text-white"
                      : "hover:border-primary-500 border border-gray-200 bg-white text-gray-800"
                  } ${vehicleType !== "car" ? "cursor-not-allowed opacity-40" : ""}`}
              >
                ⚡ Fastest
              </button>
              <button
                disabled={vehicleType !== "car"}
                onClick={() => applyOptimization("shortest")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  optimizationMode === "shortest"
                    ? "bg-primary-500 text-white"
                    : "hover:border-primary-500 border border-gray-200 bg-white text-gray-800"
                  } ${vehicleType !== "car" ? "cursor-not-allowed opacity-40" : ""}`}
              >
                📏 Shortest
              </button>
              <button
                disabled={vehicleType !== "car"}
                onClick={() => applyOptimization("cheapest")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  optimizationMode === "cheapest"
                    ? "bg-primary-500 text-white"
                    : "hover:border-primary-500 border border-gray-200 bg-white text-gray-800"
                  } ${vehicleType !== "car" ? "cursor-not-allowed opacity-40" : ""}`}
              >
                💰 Cheapest
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500">{optimizationLabel}</p>
            {vehicleType === "public transport" && (
              <div className="mt-4 rounded-2xl bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Available public transport
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {publicTransportOptions.map((option) => (
                    <span key={option} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                      {option}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
                {isRouteLoading && (
                  <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                    Updating route for {optimizationMode}...
                  </p>
                )}
              <div className="flex items-center justify-between">
                <span>Total distance</span>
                <span className="font-semibold text-gray-800">
                  {summary.distanceKm.toFixed(1)} km
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total time</span>
                <span className="font-semibold text-gray-800">
                  {summary.timeMinutes.toFixed(1)} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{summary.energyKwh > 0 ? "Energy needed" : "Fuel needed"}</span>
                <span className="font-semibold text-gray-800">
                  {summary.energyKwh > 0 ? `${summary.energyKwh.toFixed(1)} kWh` : `${summary.fuelLiters.toFixed(1)} L`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{vehicleType === "public transport" ? "Transit fare" : summary.energyKwh > 0 ? "Electricity cost" : "Fuel cost"}</span>
                <span className="font-semibold text-gray-800">
                  RM {(vehicleType === "public transport" ? transitFare : summary.energyKwh > 0 ? summary.energyCost : summary.fuelCost).toFixed(2)}
                </span>
              </div>
            </div>

            {vehicleType === "public transport" && transitDetails.length > 0 && (
              <div className="mt-5 border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
                  Transport details
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  {transitDetails.map(({ leg, minutes, cost }) => (
                    <li key={`${leg.mode}-${leg.name}`} className="flex items-start justify-between gap-3">
                      <span>
                        <span className="font-semibold text-gray-800">{leg.name}</span>
                        <span className="block text-xs text-gray-500">
                          {leg.mode === "walking" ? "Walking" : leg.mode.toUpperCase()}
                        </span>
                      </span>
                      <span className="whitespace-nowrap font-semibold text-gray-800">
                        {minutes.toFixed(1)} min · {cost === 0 ? "Free" : `RM ${cost.toFixed(2)}`}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
                  Stops in order
                </p>
                <ol className="mt-2 space-y-1 text-sm text-gray-600">
                  {publicTransportStops.map((stop, index) => (
                    <li key={stop.id}>{index + 1}. {stop.name}</li>
                  ))}
                </ol>
              </div>
            )}
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
        <SavedRoutesClient onRouteLoad={() => setActiveSection("planner")} />
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
