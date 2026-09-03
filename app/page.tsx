"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  Map,
  Sparkles,
  MapPin,
  Users,
  ArrowRight,
  Route,
  CheckCircle2,
  Globe,
  Shield,
  FileDown,
  Search,
  Star,
  Clock,
  Award,
  Ticket,
  Car,
} from "lucide-react";

import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";
import {
  getStateSuggestions,
  type StateSuggestion,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/api/stateSuggestionApi";
import { discoveryService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";
import type { PoiItem } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

// ─── 1. POPULAR MALAYSIAN DESTINATIONS (CURATED EDITORIAL DATA) ───
interface DestinationCardData {
  id: string;
  name: string;
  state: string;
  tag: string;
  category: "heritage" | "nature" | "city" | "highlands";
  description: string;
  image: string;
  badgeColor: string;
  qualityBadge?: "platinum" | "gold" | "silver";
  duration: string;
  bestTime: string;
  price: string;
  ratingScore: number;
}

const FEATURED_DESTINATIONS: DestinationCardData[] = [
  {
    id: "penang",
    name: "George Town, Penang",
    state: "Pulau Pinang",
    tag: "UNESCO Heritage & Food",
    category: "heritage",
    description:
      "World-renowned street food stalls, colonial clan jetties, vibrant street art, and Baba Nyonya heritage mansions.",
    image:
      "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=85",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200/80",
    qualityBadge: "platinum",
    duration: "3-4 Days",
    bestTime: "Dec - Mar",
    price: "Free Entry / Street Eats",
    ratingScore: 4.9,
  },
  {
    id: "kl",
    name: "Kuala Lumpur City",
    state: "Federal Territory",
    tag: "Metropolis & Skyline",
    category: "city",
    description:
      "The iconic Petronas Twin Towers, bustling Bukit Bintang alleys, Batu Caves temple, and scenic rooftop dining.",
    image:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=85",
    badgeColor: "bg-rose-50 text-rose-800 border-rose-200/80",
    qualityBadge: "platinum",
    duration: "2-3 Days",
    bestTime: "Year-Round",
    price: "Free / Various",
    ratingScore: 4.8,
  },
  {
    id: "langkawi",
    name: "Langkawi Archipelago",
    state: "Kedah",
    tag: "Beaches & UNESCO Geopark",
    category: "nature",
    description:
      "Pristine Andaman beaches, turquoise waters, dramatic limestone cliffs, Kilim mangrove boat tours, and duty-free leisure.",
    image:
      "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=85",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200/80",
    qualityBadge: "gold",
    duration: "3-5 Days",
    bestTime: "Nov - Apr",
    price: "Island Free Entry",
    ratingScore: 4.9,
  },
  {
    id: "kinabalu",
    name: "Mount Kinabalu & Sabah",
    state: "Sabah (Borneo)",
    tag: "High Peaks & Eco Safari",
    category: "nature",
    description:
      "Southeast Asia's iconic 4,095m mountain peak, lush tropical rainforest canopy walks, and rich wildlife sanctuaries.",
    image:
      "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=85",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    qualityBadge: "platinum",
    duration: "4-5 Days",
    bestTime: "Mar - Sep",
    price: "Park Entry RM15-50",
    ratingScore: 5.0,
  },
  {
    id: "melaka",
    name: "Historic Melaka",
    state: "Melaka",
    tag: "Colonial History & Culture",
    category: "heritage",
    description:
      "Portuguese A Famosa fortress, Christ Church Red Square, Jonker Street weekend food fair, and tranquil riverfront cafes.",
    image:
      "https://images.unsplash.com/photo-1606298855672-3efb63017be8?auto=format&fit=crop&w=1200&q=85",
    badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
    qualityBadge: "gold",
    duration: "2 Days",
    bestTime: "Year-Round",
    price: "Heritage Zone Free",
    ratingScore: 4.8,
  },
  {
    id: "cameron",
    name: "Cameron Highlands",
    state: "Pahang",
    tag: "Cool Highlands & Tea Trails",
    category: "highlands",
    description:
      "Endless emerald tea valleys, refreshing 18°C cool weather, mossy forest trail hikes, and strawberry farm picking.",
    image:
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=85",
    badgeColor: "bg-lime-50 text-lime-800 border-lime-200/80",
    qualityBadge: "gold",
    duration: "2-3 Days",
    bestTime: "Feb - Jul",
    price: "Free Tea Plantation Views",
    ratingScore: 4.7,
  },
];

// ─── 2. TRENDING MALAYSIAN DESTINATION CHIPS ───
const TRENDING_CHIPS = [
  { label: "🍜 Penang Street Food", query: "Penang" },
  { label: "🏖️ Langkawi Beaches", query: "Langkawi" },
  { label: "🏙️ Kuala Lumpur", query: "Kuala Lumpur" },
  { label: "⛰️ Mount Kinabalu", query: "Sabah" },
  { label: "🏛️ Melaka Heritage", query: "Melaka" },
  { label: "🍓 Cameron Highlands", query: "Cameron Highlands" },
];

// ─── 3. WANDERLOG-STYLE INTERACTIVE FEATURE TABS ───
type FeatureTabKey = "itinerary" | "discovery" | "routes" | "collab";

interface FeatureTabInfo {
  id: FeatureTabKey;
  title: string;
  subtitle: string;
  modulePill: string;
  badge: string;
  description: string;
  points: string[];
}

const FEATURE_TABS: FeatureTabInfo[] = [
  {
    id: "itinerary",
    title: "Itinerary & Timetable",
    subtitle: "Module 02: Trip Planning",
    modulePill: "Module 02",
    badge: "Drag & Drop",
    description:
      "Organize every day with exact start hours, custom notes, ticket details, and flexible reordering. Keep stays, rides, and activities in one unified timeline.",
    points: [
      "Structured day-by-day timetable with custom start & end hours",
      "Attach reservation notes, check-in reminders & ticket prices",
      "Flexible stop reordering that synchronizes live across your group",
    ],
  },
  {
    id: "discovery",
    title: "Official Quality POIs",
    subtitle: "Module 03: Destination Discovery",
    modulePill: "Module 03",
    badge: "Tourism Malaysia Verified",
    description:
      "Discover verified attractions backed by official Malaysian Tourism Quality Ratings (Platinum, Gold, Silver), operating hours, and accurate ticket prices.",
    points: [
      "Official Malaysian Tourism Quality rating badges on top spots",
      "Ticket costs, operating hours & recommended visiting windows",
      "1-Click 'Add to Itinerary' directly connects to your trips",
    ],
  },
  {
    id: "routes",
    title: "Route & Logistics View",
    subtitle: "Module 04: Travel Logistics",
    modulePill: "Module 04",
    badge: "Map & Navigation",
    description:
      "Visualize your road trip stops along Malaysia's North-South Expressway (PLUS) with accurate driving times and mileage calculations.",
    points: [
      "Interactive map connecting all your daily itinerary pins",
      "Estimated driving duration and highway distance breakdown",
      "Optimized stop sequences to minimize transit time across states",
    ],
  },
  {
    id: "collab",
    title: "Group Co-Planning",
    subtitle: "Module 05: Shared Planning",
    modulePill: "Module 05",
    badge: "Live SSE Sync",
    description:
      "Invite friends and family to your trip with Editor or Viewer roles. Real-time updates mean no more lost WhatsApp chats or conflicting spreadsheets.",
    points: [
      "Live co-editing via Server-Sent Events with zero plan conflicts",
      "Role-based permissions: control who can edit stops vs. view",
      "1-Click export to printable PDF, spreadsheet CSV, or calendar (.ics)",
    ],
  },
];

// ─── 4. SOCIAL PROOF / TRAVELER REVIEWS ───
const TESTIMONIALS = [
  {
    name: "Farah Azman",
    role: "Roadtripper • Kuala Lumpur",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    comment:
      "Planning our road trip from KL up to Ipoh and Penang was so effortless with TravelSync. Having driving distances calculated alongside day-by-day food stops made our 4-day trip completely stress-free.",
    rating: 5,
    tag: "Road Trip",
  },
  {
    name: "Dr. Darren Tan",
    role: "Family Vacationer • Singapore",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    comment:
      "The official quality ratings helped us pick the best family-friendly attractions in Sabah and Langkawi. Being able to export the whole plan to PDF and our Google Calendar was a lifesaver.",
    rating: 5,
    tag: "Family Holiday",
  },
  {
    name: "Nurul Huda",
    role: "Group Planner • Johor Bahru",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    comment:
      "We had 6 friends planning a graduation trip to Melaka and Cameron Highlands. Inviting everyone with real-time sync meant no more confusion in our WhatsApp group chat!",
    rating: 5,
    tag: "Group Planning",
  },
];

// ─── 5. WHY TRAVELSYNC HIGHLIGHTS ───
const HIGHLIGHTS = [
  {
    title: "100% Dedicated to Malaysia",
    description:
      "Engineered specifically for exploring all 13 states and 3 federal territories with verified local data across Peninsular and Borneo.",
    icon: Globe,
  },
  {
    title: "Itinerary & Maps Together",
    description:
      "View your timeline and map stops in one consolidated screen. No more switching between spreadsheets, notes, and separate maps.",
    icon: Map,
  },
  {
    title: "Real-Time Group Collaboration",
    description:
      "Invite friends or family to edit or view. Live Server-Sent Events ensure everyone stays on the exact same page simultaneously.",
    icon: Users,
  },
  {
    title: "1-Click Multi-Format Export",
    description:
      "Export your complete itinerary anytime as a clean printable PDF, spreadsheet CSV, or calendar iCal (.ics) for offline access.",
    icon: FileDown,
  },
  {
    title: "Lightweight & Edge-Powered",
    description:
      "Zero bloat and instant loading backed by Cloudflare edge architecture with privacy-first data handling.",
    icon: Shield,
  },
  {
    title: "Official Quality Badges",
    description:
      "Verified attraction data featuring Platinum, Gold, and Silver quality rankings from Malaysian tourism standards.",
    icon: Award,
  },
];

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();

  // Search & Destination Suggestions State
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StateSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Active Feature Showcase Tab
  const [activeTab, setActiveTab] = useState<FeatureTabKey>("itinerary");
  const [activeItineraryDay, setActiveItineraryDay] = useState<1 | 2>(1);

  // Destination Category Filter
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "quality" | "heritage" | "nature" | "city" | "highlands"
  >("all");

  // Dynamic Quality Rated POIs from Module 03
  const [qualityPois, setQualityPois] = useState<PoiItem[]>([]);

  // ─── Fetch Module 03 Quality Rated POIs ───
  useEffect(() => {
    let isMounted = true;
    discoveryService
      .getQualityRatedPois()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setQualityPois(data.slice(0, 6));
        }
      })
      .catch(() => {
        // Fallback to static list
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Query Destination Suggestions (Module 02 API) ───
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }

    let isCurrent = true;

    getStateSuggestions(trimmed)
      .then((results) => {
        if (isCurrent) {
          setSuggestions(results);
          setShowSuggestions(true);
        }
      })
      .catch(() => {
        if (isCurrent) setSuggestions([]);
      });

    return () => {
      isCurrent = false;
    };
  }, [searchQuery]);

  // ─── Close suggestions when clicking outside ───
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Trigger Trip Planning Flow (Navigates to Module 02) ───
  const handleStartPlanning = (_prefillDest?: string) => {
    if (!isLoggedIn) {
      router.push("/01_User_&_Account_Management");
      return;
    }
    router.push("/02_Trip_Planning_&_Itinerary_Management");
  };

  // Filtered featured destinations (combines static curated + Module 03 quality POIs)
  const filteredDestinations = useMemo(() => {
    if (categoryFilter === "quality" && qualityPois.length > 0) {
      return qualityPois.map((poi) => ({
        id: poi.id,
        name: poi.name,
        state: poi.state || "Malaysia",
        tag: poi.experienceType || "Official Quality POI",
        category: "heritage" as const,
        description:
          poi.formatted ||
          "Verified Malaysian attraction certified under national tourism quality standards.",
        image:
          poi.imageUrl ||
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=85",
        badgeColor:
          poi.qualityBadge === "platinum"
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-amber-50 text-amber-700 border-amber-200",
        qualityBadge: poi.qualityBadge || "gold",
        duration: poi.suggestedDuration || "2-3 Hours",
        bestTime: poi.bestVisitTime || "Year-Round",
        price: poi.ticketPrice || "Free Entry / Ticketed",
        ratingScore: 4.9,
      }));
    }
    if (categoryFilter === "all") return FEATURED_DESTINATIONS;
    return FEATURED_DESTINATIONS.filter(
      (dest) => dest.category === categoryFilter
    );
  }, [categoryFilter, qualityPois]);

  return (
    <div className="space-y-20 pb-20">
      {/* ─── 1. MODERN MINIMALIST HERO SECTION (CLEAN & LIGHT) ─── */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-gradient-to-b from-white via-gray-50/40 to-white px-6 py-16 text-center sm:px-10 sm:py-24">
        <div className="mx-auto max-w-3xl space-y-7">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
            <span>🇲🇾</span>
            <span>The all-in-one travel planner for Malaysia</span>
          </div>

          {/* Main Editorial Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl sm:leading-[1.15]">
            Plan your Malaysia journeys, <br className="hidden sm:inline" />
            <span className="text-primary-500">all in one place</span>.
          </h1>

          {/* Clean Subtitle */}
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
            Build day-by-day itineraries, explore official quality-rated attractions, optimize road trip routes, and collaborate with friends in real time.
          </p>

          {/* Floating Search Pill Bar */}
          <div
            ref={searchContainerRef}
            className="relative mx-auto mt-8 max-w-xl text-left"
          >
            <div className="flex flex-col gap-2 rounded-full border border-gray-200 bg-white p-2 shadow-lg shadow-gray-200/50 transition sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3 px-4 py-2 text-gray-800">
                <Search size={19} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (!val.trim()) {
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Where do you want to go? (e.g. Penang, Langkawi...)"
                  className="w-full bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleStartPlanning(searchQuery)}
                className="flex items-center justify-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-95 sm:w-auto"
              >
                <span>Start planning</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 text-gray-800 shadow-xl">
                <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Destinations & States
                </p>
                {suggestions.map((item) => (
                  <button
                    key={item.stateId}
                    type="button"
                    onClick={() => {
                      setSearchQuery(item.name);
                      setShowSuggestions(false);
                      handleStartPlanning(item.name);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin size={15} className="text-primary-500" />
                      <span className="font-medium text-gray-800">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {item.stateId ? "State / Region" : "Spot"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Trending Destination Pills */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-medium text-gray-400">Popular:</span>
              {TRENDING_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setSearchQuery(chip.query);
                    handleStartPlanning(chip.query);
                  }}
                  className="rounded-full border border-gray-200 bg-white px-3.5 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Minimalist Trust Indicator Strip */}
          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-8 sm:grid-cols-4">
            <div className="space-y-0.5">
              <p className="text-2xl font-bold text-gray-900">13+3</p>
              <p className="text-xs text-gray-500">States & Territories</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-2xl font-bold text-primary-500">100%</p>
              <p className="text-xs text-gray-500">Malaysia Focused</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-2xl font-bold text-gray-900">Real-time</p>
              <p className="text-xs text-gray-500">Group Syncing</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-2xl font-bold text-gray-900">Verified</p>
              <p className="text-xs text-gray-500">Quality Ratings</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. INTERACTIVE SPLIT WORKSPACE PREVIEW (WANDERLOG STYLE) ─── */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Workspace Preview
          </p>
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
            Your itinerary and your map in one view
          </h2>
          <p className="text-sm text-gray-500">
            Keep everything organized on a single clean canvas. Switch between tabs to explore each module.
          </p>
        </div>

        {/* Clean Pill Tab Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-gray-100 p-1.5">
          {FEATURE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span>{tab.title}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                    isActive
                      ? "bg-rose-50 text-primary-500 font-bold"
                      : "bg-gray-200/70 text-gray-500 font-medium"
                  }`}
                >
                  {tab.modulePill}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modern Clean Browser Frame */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Subtle Browser Window Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="ml-3 font-mono text-[11px] text-gray-400">
                travelsync.my/trips/penang-unesco-trail
              </span>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              ● Live Sync
            </span>
          </div>

          {/* Split Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Panel: Description & Features */}
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5 lg:border-r lg:border-gray-100 space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  <Sparkles size={13} className="text-secondary-500" />
                  <span>{FEATURE_TABS.find((t) => t.id === activeTab)?.badge}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {FEATURE_TABS.find((t) => t.id === activeTab)?.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {FEATURE_TABS.find((t) => t.id === activeTab)?.description}
                </p>

                <ul className="space-y-3 pt-2">
                  {FEATURE_TABS.find((t) => t.id === activeTab)?.points.map(
                    (pt, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-gray-700 sm:text-sm font-medium"
                      >
                        <CheckCircle2
                          size={16}
                          className="mt-0.5 flex-shrink-0 text-secondary-500"
                        />
                        <span>{pt}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleStartPlanning()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-95"
                >
                  <span>Build This Itinerary</span>
                  <ArrowRight size={14} />
                </button>
                <span className="text-xs text-gray-400">
                  Free & no setup
                </span>
              </div>
            </div>

            {/* Right Panel: Clean Simulated Mockup */}
            <div className="bg-gray-50/50 p-6 sm:p-8 lg:col-span-7">
              {activeTab === "itinerary" && (
                <div className="space-y-4">
                  {/* Day Switcher */}
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveItineraryDay(1)}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                          activeItineraryDay === 1
                            ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        Day 1: George Town
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveItineraryDay(2)}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                          activeItineraryDay === 2
                            ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        Day 2: Penang Hill
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">
                      {activeItineraryDay === 1 ? "3 Stops • 14 km" : "2 Stops • 18 km"}
                    </span>
                  </div>

                  {/* Timetable Items */}
                  {activeItineraryDay === 1 ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                              09:00 AM
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">
                                Toh Soon Cafe (Traditional Breakfast)
                              </h4>
                              <p className="text-[11px] text-gray-500">
                                Campbell Street • Charcoal kaya toast & coffee
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Food
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-4 text-[11px] font-medium text-gray-400">
                        <Car size={13} className="text-secondary-500" />
                        <span>12 mins drive • 3.8 km</span>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                              11:30 AM
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">
                                Pinang Peranakan Mansion
                              </h4>
                              <p className="text-[11px] text-gray-500">
                                Church Street • UNESCO World Heritage museum
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Culture
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-4 text-[11px] font-medium text-gray-400">
                        <Car size={13} className="text-secondary-500" />
                        <span>18 mins drive • 6.4 km</span>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                              06:30 PM
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">
                                Gurney Drive Hawker Center
                              </h4>
                              <p className="text-[11px] text-gray-500">
                                Char Kway Teow, Penang Asam Laksa & Cendol
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Dinner
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                              10:00 AM
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">
                                Kek Lok Si Buddhist Temple
                              </h4>
                              <p className="text-[11px] text-gray-500">
                                Air Itam • Pagoda of Ten Thousand Buddhas
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Culture
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-4 text-[11px] font-medium text-gray-400">
                        <Car size={13} className="text-secondary-500" />
                        <span>8 mins drive • 2.1 km</span>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                              02:30 PM
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">
                                Penang Hill Funicular & The Habitat
                              </h4>
                              <p className="text-[11px] text-gray-500">
                                Canopy walkway & panoramic island views
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                            Nature
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "discovery" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Award size={16} className="text-amber-500" />
                      <span className="font-bold text-gray-800 text-sm">
                        Official Tourism Quality Certified
                      </span>
                    </div>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                      Module 03
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200/80">
                          ★ PLATINUM
                        </span>
                        <span className="text-[11px] text-gray-400">Kuala Lumpur</span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900">
                        Petronas Twin Towers Skybridge
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Observation deck on Level 86 with skyline vistas.
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-600">
                        <span>1.5 Hours</span>
                        <span className="font-semibold text-primary-500">RM35-98</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/80">
                          ★ GOLD
                        </span>
                        <span className="text-[11px] text-gray-400">Selangor</span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900">
                        Batu Caves Limestone Sanctuary
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        272 rainbow steps leading to an ancient cave shrine.
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-600">
                        <span>2 Hours</span>
                        <span className="font-semibold text-emerald-600">Free Entry</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "routes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Route size={16} className="text-secondary-500" />
                      <span className="font-bold text-gray-800 text-sm">
                        PLUS Highway E1 Driving Plan
                      </span>
                    </div>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                      Module 04
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-secondary-500 font-bold text-xs">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-gray-900">
                          Kuala Lumpur → Ipoh Old Town
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          205 km • 2h 15m via PLUS E1 • Tapah R&R Stop
                        </p>
                      </div>
                      <span className="text-xs font-medium text-gray-500">
                        Toll ~RM26
                      </span>
                    </div>

                    <div className="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-secondary-500 font-bold text-xs">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-gray-900">
                          Ipoh → George Town, Penang
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          160 km • 1h 45m across the Penang Bridge
                        </p>
                      </div>
                      <span className="text-xs font-medium text-gray-500">
                        Toll ~RM21
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "collab" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-blue-500" />
                      <span className="font-bold text-gray-800 text-sm">
                        Live Group Co-Planning
                      </span>
                    </div>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                      Module 05
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                          FA
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">
                            Farah Azman (Editor)
                          </h4>
                          <p className="text-[11px] text-emerald-600">
                            Added &ldquo;Batu Ferringhi Night Market&rdquo; to Day 2
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400">Just now</span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-500 text-xs font-bold text-white">
                          DT
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">
                            Darren Tan (Viewer)
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Exported itinerary to Google Calendar (.ics)
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400">4 mins ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURED DESTINATIONS & QUALITY POIS ─── */}
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
              Explore Malaysia
            </p>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Featured Destinations & Quality POIs
            </h2>
            <p className="text-xs text-gray-500 sm:text-sm">
              Discover top spots across all 13 states with official tourism quality ratings.
            </p>
          </div>

          {/* Clean Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-gray-100 p-1">
            {(
              [
                { id: "all", label: "All Regions" },
                { id: "quality", label: "★ Official Quality" },
                { id: "heritage", label: "Heritage & Food" },
                { id: "nature", label: "Islands & Nature" },
                { id: "city", label: "City Skylines" },
                { id: "highlands", label: "Highlands" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  categoryFilter === cat.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Destination Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDestinations.map((dest) => (
            <div
              key={dest.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              <div>
                {/* Image Container */}
                <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-md border px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md shadow-sm ${dest.badgeColor}`}
                    >
                      {dest.tag}
                    </span>
                    {dest.qualityBadge && (
                      <span className="rounded-md border border-amber-300 bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-gray-900">
                        ★ {dest.qualityBadge.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Rating Top Right */}
                  <div className="absolute right-3 top-3">
                    <div className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-bold text-gray-800 backdrop-blur-md shadow-sm">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span>{dest.ratingScore.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Bottom Text Over Image */}
                  <div className="absolute bottom-2.5 left-3.5 right-3.5">
                    <h3 className="text-base font-bold text-white drop-shadow-sm sm:text-lg">
                      {dest.name}
                    </h3>
                    <p className="flex items-center gap-1 text-[11px] font-medium text-gray-200">
                      <MapPin size={11} className="text-secondary-500" />
                      <span>{dest.state}</span>
                    </p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-2.5">
                  <p className="text-xs leading-relaxed text-gray-500 line-clamp-2">
                    {dest.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 border-y border-gray-100 py-2 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-400" />
                      <span>{dest.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Ticket size={12} className="text-gray-400" />
                      <span className="truncate">{dest.price}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleStartPlanning(dest.name)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-95"
                >
                  <span>Plan Here</span>
                  <ArrowRight size={12} />
                </button>
                <Link
                  href="/03_Destination_Discovery_&_Inspiration"
                  className="text-xs font-medium text-gray-500 transition hover:text-gray-800"
                >
                  Explore Guide
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 4. WHY TRAVELSYNC (MINIMALIST BENTO GRID) ─── */}
      <section className="rounded-3xl border border-gray-200/80 bg-white p-8 md:p-12 shadow-sm">
        <div className="max-w-xl space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            Why TravelSync
          </p>
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Built for modern Malaysian travel
          </h2>
          <p className="text-sm text-gray-500">
            A focused toolchain designed to make planning your trip simple, fast, and cooperative.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 space-y-3 transition hover:bg-white hover:border-gray-200 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-secondary-500 shadow-sm border border-gray-100">
                  <Icon size={20} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-gray-500">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. TRAVELER TESTIMONIALS / SOCIAL PROOF ─── */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary-500">
            Community Stories
          </p>
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Loved by travelers across Malaysia
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-gray-600 italic">
                  &ldquo;{t.comment}&rdquo;
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">{t.name}</h4>
                    <p className="text-[10px] text-gray-400">{t.role}</p>
                  </div>
                </div>
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                  {t.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 6. MINIMALIST BOTTOM CTA ─── */}
      <section className="rounded-3xl border border-gray-200/80 bg-gradient-to-b from-gray-50 to-white px-8 py-12 text-center shadow-sm md:py-16">
        <div className="mx-auto max-w-xl space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Ready to plan your next Malaysian holiday?
          </h2>
          <p className="text-xs leading-relaxed text-gray-500 sm:text-sm">
            Create your itinerary in minutes, invite friends or family, and explore Malaysia with TravelSync.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleStartPlanning()}
              className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-95"
            >
              <span>Start planning — It&apos;s free</span>
              <ArrowRight size={14} />
            </button>
            <Link
              href="/03_Destination_Discovery_&_Inspiration"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
            >
              <Compass size={14} />
              <span>Browse Destinations</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
