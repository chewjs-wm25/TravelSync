"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Map,
  Lightbulb,
  MapPin,
  Users,
  Settings,
  ArrowRight,
  Compass,
  Star,
  Calendar,
  Globe,
  ChevronRight,
} from "lucide-react";

import { useAuthStore } from "./DEV-ACCOUNT-STATE/authUser";

type TripRecord = {
  trip_id: string;
  trip_name: string;
  start_date: string | null;
  end_date: string | null;
};

type FeaturedDestination = {
  name: string;
  state: string;
  tagline: string;
  imageUrl: string;
  href: string;
};

const featuredDestinations: FeaturedDestination[] = [
  {
    name: "Langkawi",
    state: "Kedah",
    tagline: "Duty-free island paradise",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    href: "/03_Destination_Discovery_&_Inspiration/search?q=Langkawi",
  },
  {
    name: "Melaka",
    state: "Melaka",
    tagline: "UNESCO World Heritage city",
    imageUrl:
      "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80",
    href: "/03_Destination_Discovery_&_Inspiration/search?q=Melaka",
  },
  {
    name: "Kota Kinabalu",
    state: "Sabah",
    tagline: "Mountains meet the sea",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    href: "/03_Destination_Discovery_&_Inspiration/search?q=Kota+Kinabalu",
  },
  {
    name: "Penang",
    state: "Penang",
    tagline: "Street art & hawker heaven",
    imageUrl:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80",
    href: "/03_Destination_Discovery_&_Inspiration/search?q=Penang",
  },
  {
    name: "Cameron Highlands",
    state: "Pahang",
    tagline: "Cool tea plantations",
    imageUrl:
      "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80",
    href: "/03_Destination_Discovery_&_Inspiration/search?q=Cameron+Highlands",
  },
  {
    name: "Perhentian Islands",
    state: "Terengganu",
    tagline: "Crystal waters & coral reefs",
    imageUrl:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    href: "/03_Destination_Discovery_&_Inspiration/search?q=Perhentian",
  },
];

const modules = [
  {
    title: "Trip Planning",
    description: "Plan itineraries, manage days, and organize your travel schedule.",
    icon: Map,
    href: "/02_Trip_Planning_&_Itinerary_Management",
    color: "bg-primary-500",
    lightColor: "bg-red-50",
  },
  {
    title: "Discover Malaysia",
    description: "Find destinations, events, and curated travel inspirations.",
    icon: Lightbulb,
    href: "/03_Destination_Discovery_&_Inspiration",
    color: "bg-secondary-500",
    lightColor: "bg-teal-50",
  },
  {
    title: "Routes & Maps",
    description: "Plan driving routes, estimate fuel, and navigate with confidence.",
    icon: MapPin,
    href: "/04_Travel_Logistics_&_Map_Route_Planning",
    color: "bg-accent-400",
    lightColor: "bg-yellow-50",
  },
  {
    title: "Collaborate",
    description: "Plan trips together with friends, family, or travel groups.",
    icon: Users,
    href: "/05_Collaboration_&_Shared_Planning",
    color: "bg-info",
    lightColor: "bg-blue-50",
  },
  {
    title: "My Account",
    description: "Manage your profile, security, and travel preferences.",
    icon: Settings,
    href: "/01_User_&_Account_Management",
    color: "bg-gray-800",
    lightColor: "bg-gray-100",
  },
];

function formatTripDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default function HomePage() {
  const { isLoggedIn, user } = useAuthStore();
  const [recentTrips, setRecentTrips] = useState<TripRecord[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      setLoadingTrips(true);
      try {
        const res = await fetch(
          "/02_Trip_Planning_&_Itinerary_Management/api/trip?action=list&userId=usr_demo"
        );
        const data = (await res.json()) as { success: boolean; trips: TripRecord[] };
        if (!cancelled && data.success) {
          setRecentTrips(data.trips.slice(0, 3));
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingTrips(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  return (
    <div className="min-h-[calc(100vh-220px)] bg-gray-100">
      {/* ===== Hero Section ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1600&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 px-8 py-16 md:px-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            {mounted && isLoggedIn && user && (
              <p className="mb-3 text-sm font-medium text-secondary-500">
                Welcome back, {user.name}
              </p>
            )}
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
              Explore{" "}
              <span className="text-secondary-500">Malaysia</span>
              ,<br />
              <span className="text-primary-500">Your Way</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-gray-300">
              Plan itineraries, discover hidden gems, navigate routes, and
              collaborate with friends — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/02_Trip_Planning_&_Itinerary_Management"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-3 font-semibold text-white shadow-[0_4px_20px_rgba(255,107,107,0.3)] transition-all hover:shadow-[0_8px_30px_rgba(255,107,107,0.4)]"
              >
                Start Planning <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/03_Destination_Discovery_&_Inspiration"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <Compass className="h-4 w-4" /> Discover
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Quick Access Modules ===== */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Quick Access</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_12px_32px_rgba(255,107,107,0.12)]"
              >
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${mod.lightColor}`}
                >
                  <Icon className={`h-5 w-5 ${mod.color.replace("bg-", "text-")}`} />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">
                  {mod.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {mod.description}
                </p>
                <div className="mt-3 flex items-center text-xs font-medium text-primary-500 opacity-0 transition-opacity group-hover:opacity-100">
                  Go <ChevronRight className="ml-0.5 h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===== Featured Destinations ===== */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Popular in Malaysia
          </h2>
          <Link
            href="/03_Destination_Discovery_&_Inspiration"
            className="text-sm font-medium text-primary-500 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredDestinations.map((dest) => (
            <Link
              key={dest.name}
              href={dest.href}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_12px_32px_rgba(255,107,107,0.12)]"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={dest.imageUrl}
                  alt={dest.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <h3 className="text-lg font-bold text-white">{dest.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-white/80">
                    <MapPin className="h-3 w-3" />
                    {dest.state}
                  </div>
                </div>
                <div className="absolute right-3 top-3">
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    {dest.tagline}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Recent Trips (logged in only) ===== */}
      {mounted && isLoggedIn && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              My Recent Trips
            </h2>
            <Link
              href="/02_Trip_Planning_&_Itinerary_Management"
              className="text-sm font-medium text-primary-500 hover:underline"
            >
              View all
            </Link>
          </div>
          {loadingTrips ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-2xl border border-gray-200 bg-white"
                />
              ))}
            </div>
          ) : recentTrips.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {recentTrips.map((trip) => {
                const dateRange =
                  formatTripDate(trip.start_date) && formatTripDate(trip.end_date)
                    ? `${formatTripDate(trip.start_date)} — ${formatTripDate(trip.end_date)}`
                    : formatTripDate(trip.start_date) || "No dates set";
                return (
                  <Link
                    key={trip.trip_id}
                    href={`/02_Trip_Planning_&_Itinerary_Management/${trip.trip_id}`}
                    className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_12px_32px_rgba(255,107,107,0.12)]"
                  >
                    <div className="mb-2 flex items-center gap-2 text-secondary-500">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs">{dateRange}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 group-hover:text-primary-500 transition-colors">
                      {trip.trip_name}
                    </h3>
                    <div className="mt-3 flex items-center text-xs font-medium text-primary-500 opacity-0 transition-opacity group-hover:opacity-100">
                      Open <ChevronRight className="ml-0.5 h-3 w-3" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
              <Globe className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                No trips yet.{" "}
                <Link
                  href="/02_Trip_Planning_&_Itinerary_Management"
                  className="font-medium text-primary-500 hover:underline"
                >
                  Create your first trip
                </Link>
              </p>
            </div>
          )}
        </section>
      )}

      {/* ===== Why TravelSync ===== */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">
          Why TravelSync?
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              icon: Map,
              title: "Smart Planning",
              desc: "Day-by-day itineraries with drag-and-drop reordering and automatic route optimization.",
            },
            {
              icon: Star,
              title: "Quality Curated",
              desc: "Destination data powered by Wikivoyage, Wikipedia, and official tourism ratings.",
            },
            {
              icon: Users,
              title: "Real-time Collaboration",
              desc: "Plan together with shared itineraries, live comments, and role-based permissions.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
              >
                <Icon className="mb-3 h-8 w-8 text-primary-500" />
                <h3 className="font-semibold text-gray-800">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
