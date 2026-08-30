"use client";

import Link from "next/link";
import {
  Compass,
  Map,
  Sparkles,
  MapPin,
  Users,
  ArrowRight,
  Calendar,
  Route,
  CheckCircle2,
  Globe,
  Camera,
  Heart,
  Shield,
  Layers,
  FileDown,
} from "lucide-react";

const FEATURED_DESTINATIONS = [
  {
    id: "kl",
    name: "Kuala Lumpur",
    state: "Federal Territory",
    tag: "City & Skyline",
    description: "Iconic Petronas Twin Towers, buzzing street markets, and modern cultural blend.",
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    id: "penang",
    name: "Penang",
    state: "Penang Island",
    tag: "Food & Heritage",
    description: "UNESCO-listed George Town, world-famous hawker street food, and vibrant murals.",
    image: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "langkawi",
    name: "Langkawi",
    state: "Kedah",
    tag: "Beaches & Nature",
    description: "Turquoise waters, pristine sandy shores, geoparks, and duty-free island luxury.",
    image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=800&q=80",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    id: "kinabalu",
    name: "Mount Kinabalu & Sabah",
    state: "Sabah (Borneo)",
    tag: "Adventure & Eco",
    description: "Southeast Asia's majestic peak, ancient tropical rainforests, and diverse wildlife.",
    image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "melaka",
    name: "Melaka",
    state: "Melaka",
    tag: "History & Culture",
    description: "Centuries of colonial heritage, Jonker Street night market, and riverfront dining.",
    image: "https://images.unsplash.com/photo-1606298855672-3efb63017be8?auto=format&fit=crop&w=800&q=80",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    id: "cameron",
    name: "Cameron Highlands",
    state: "Pahang",
    tag: "Cool Highlands",
    description: "Rolling emerald tea plantations, refreshing mountain climate, and strawberry farms.",
    image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80",
    badgeColor: "bg-lime-50 text-lime-700 border-lime-200",
  },
];

const CORE_MODULES = [
  {
    title: "Trip Planning & Itineraries",
    description: "Build organized day-by-day itineraries with custom timings, activity notes, and flexible reordering.",
    href: "/02_Trip_Planning_&_Itinerary_Management",
    icon: Calendar,
    accent: "from-rose-500 to-red-500",
    pill: "Module 02",
  },
  {
    title: "Destination Discovery",
    description: "Explore curated attractions, hidden gems, local food hotspots, and state-by-state Malaysian guides.",
    href: "/03_Destination_Discovery_&_Inspiration",
    icon: Sparkles,
    accent: "from-amber-500 to-orange-500",
    pill: "Module 03",
  },
  {
    title: "Logistics & Route Planning",
    description: "Visualize stops on interactive maps and calculate optimal driving and transit routes between places.",
    href: "/04_Travel_Logistics_&_Map_Route_Planning",
    icon: Route,
    accent: "from-teal-500 to-emerald-500",
    pill: "Module 04",
  },
  {
    title: "Shared Group Planning",
    description: "Invite fellow travelers, assign Editor/Viewer roles, comment in real time, and co-plan seamlessly.",
    href: "/05_Collaboration_&_Shared_Planning",
    icon: Users,
    accent: "from-blue-500 to-indigo-500",
    pill: "Module 05",
  },
];

const HIGHLIGHTS = [
  {
    title: "Exclusively Focused on Malaysia",
    description: "Tailored specifically for exploring all 13 states and 3 federal territories with localized intelligence.",
    icon: Globe,
  },
  {
    title: "Real-Time Collaboration",
    description: "Live updates via Server-Sent Events allow your travel group to collaborate simultaneously without conflict.",
    icon: Layers,
  },
  {
    title: "Flexible Exports & Sharing",
    description: "Export your complete itinerary anytime as printable PDF, spreadsheet CSV, or calendar iCal (.ics).",
    icon: FileDown,
  },
  {
    title: "Lightweight & Fast",
    description: "Engineered for speed with zero bloat, intuitive UI components, and rock-solid privacy controls.",
    icon: Shield,
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16 pb-12">
      {/* ─── 1. HERO SECTION ─── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white shadow-2xl">
        {/* Background Subtle Glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-secondary-500/20 blur-3xl" />

        <div className="relative z-10 px-6 py-16 md:px-12 md:py-24 lg:px-16">
          <div className="max-w-3xl space-y-6">
            {/* Country Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white backdrop-blur-md">
              <span>🇲🇾</span>
              <span>Dedicated Malaysian Travel Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.15]">
              Plan, Explore & Sync Your Malaysian Journeys.
            </h1>

            {/* Subtitle */}
            <p className="text-base text-gray-300 sm:text-lg lg:text-xl leading-relaxed">
              From Penang’s heritage food trails and Langkawi’s sun-drenched islands to the peaks of Mount Kinabalu. Craft itineraries, optimize travel routes, and collaborate with your travel crew in real time.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/02_Trip_Planning_&_Itinerary_Management"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-primary-500 px-6 py-3.5 text-sm font-bold text-white shadow-hover transition-all duration-200 hover:bg-primary-500/90 active:scale-95"
              >
                <span>Start Planning a Trip</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/03_Destination_Discovery_&_Inspiration"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15 active:scale-95"
              >
                <Compass size={18} className="text-secondary-500" />
                <span>Explore Destinations</span>
              </Link>
            </div>

            {/* Fast Stats Row */}
            <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold text-white sm:text-3xl">13+3</p>
                <p className="text-xs text-gray-400">States & Territories</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-500 sm:text-3xl">100%</p>
                <p className="text-xs text-gray-400">Malaysia Focused</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary-500 sm:text-3xl">Real-time</p>
                <p className="text-xs text-gray-400">Collaborative Sync</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent-400 sm:text-3xl">Smart</p>
                <p className="text-xs text-gray-400">Route Logistics</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. CORE WORKSPACE MODULES ─── */}
      <section className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
              Workspace Features
            </p>
            <h2 className="text-2xl font-bold text-gray-800 sm:text-3xl">
              Everything You Need for Seamless Planning
            </h2>
          </div>
          <p className="max-w-md text-sm text-gray-500">
            A cohesive suite of dedicated tools designed to handle every phase of your Malaysian holiday.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {CORE_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.title}
                href={mod.href}
                className="group relative flex flex-col justify-between rounded-3xl border-2 border-gray-200 bg-white p-7 shadow-base transition-all duration-300 hover:-translate-y-1 hover:border-primary-500/40 hover:shadow-hover"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${mod.accent} text-white shadow-md`}
                    >
                      <Icon size={24} />
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-600">
                      {mod.pill}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold text-gray-800 transition group-hover:text-primary-500">
                    {mod.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-primary-500 transition-transform group-hover:translate-x-1">
                  <span>Open workspace</span>
                  <ArrowRight size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── 3. FEATURED MALAYSIAN DESTINATIONS ─── */}
      <section className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-secondary-500">
              Popular Spots
            </p>
            <h2 className="text-2xl font-bold text-gray-800 sm:text-3xl">
              Featured Malaysian Destinations
            </h2>
          </div>
          <Link
            href="/03_Destination_Discovery_&_Inspiration"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:underline"
          >
            <span>Browse all regions & ideas</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_DESTINATIONS.map((dest) => (
            <div
              key={dest.id}
              className="group overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-base transition-all duration-300 hover:border-gray-300 hover:shadow-lg"
            >
              {/* Image Container */}
              <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-md ${dest.badgeColor}`}
                  >
                    {dest.tag}
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-xl font-bold text-white drop-shadow-sm">
                    {dest.name}
                  </h3>
                  <p className="flex items-center gap-1 text-xs font-medium text-gray-200">
                    <MapPin size={12} className="text-secondary-500" />
                    <span>{dest.state}</span>
                  </p>
                </div>
              </div>

              {/* Content Box */}
              <div className="p-5 flex flex-col justify-between h-36">
                <p className="text-xs leading-relaxed text-gray-600">
                  {dest.description}
                </p>
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <Link
                    href={`/02_Trip_Planning_&_Itinerary_Management?dest=${encodeURIComponent(dest.name)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-500 hover:underline"
                  >
                    <span>Plan Trip Here</span>
                    <ArrowRight size={13} />
                  </Link>
                  <Link
                    href={`/03_Destination_Discovery_&_Inspiration`}
                    className="text-xs font-medium text-gray-400 hover:text-gray-600 transition"
                  >
                    View details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 4. WHY TRAVELSYNC HIGHLIGHTS ─── */}
      <section className="rounded-3xl border-2 border-gray-200 bg-white p-8 md:p-12 shadow-base">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Why TravelSync
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-800 sm:text-3xl">
            Built for Modern Malaysian Travelers
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Enjoy intuitive coordination with zero messy spreadsheets or lost group chat messages.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-secondary-500">
                  <Icon size={24} />
                </div>
                <h3 className="text-base font-bold text-gray-800">{item.title}</h3>
                <p className="text-xs leading-relaxed text-gray-500">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. FINAL CALL TO ACTION ─── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-500 to-rose-600 px-8 py-14 text-center text-white shadow-xl md:py-16">
        <div className="relative z-10 mx-auto max-w-2xl space-y-5">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Ready to Plan Your Next Malaysian Getaway?
          </h2>
          <p className="text-sm text-white/90 sm:text-base leading-relaxed">
            Create your itinerary in minutes, invite friends or family, and make every trip memorable with TravelSync.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/02_Trip_Planning_&_Itinerary_Management"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-primary-500 shadow-md transition hover:bg-gray-50 active:scale-95"
            >
              <span>Create My First Trip</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/01_User_&_Account_Management"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/40 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
            >
              <span>Manage Account</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
