"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Car,
  Star,
  ArrowRight,
  SlidersHorizontal,
  Zap,
  Compass,
  Ruler,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatInr } from "@/lib/utils";

const DriverDiscoveryMap = dynamic(
  () =>
    import("@/components/map/DriverDiscoveryMap").then(
      (mod) => mod.DriverDiscoveryMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full h-[460px] lg:h-[620px] rounded-stadium bg-[#191918] flex flex-col items-center justify-center text-white border border-ink/15 animate-pulse">
        <div className="w-10 h-10 rounded-full border-2 border-[#F37338] border-t-transparent animate-spin mb-3" />
        <p className="text-sm text-[#D0CBC5] font-medium">
          Loading Pune Discovery Map...
        </p>
      </div>
    ),
  }
);
import { URBAN_HUBS } from "@/lib/seed";
import { useAuth } from "@/context/AuthContext";
import type { SpaceType, VehicleType } from "@/lib/types";
import type { EnrichedListing } from "@/lib/db";
import { toast } from "sonner";

const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  covered: "Covered Bay",
  uncovered: "Open Spot",
  driveway: "Private Driveway",
  dedicated_private: "Dedicated Private Slot",
  commercial_lot: "Commercial Deck",
};

const VEHICLE_LABELS: Record<VehicleType, string> = {
  two_wheeler: "Two-Wheeler",
  hatchback: "Hatchback",
  sedan: "Sedan",
  suv: "SUV / MPV",
  ev: "EV Ready",
};

const PUNE_LOCALITIES: Record<string, { lat: number; lng: number; label: string }> = {
  "Koregaon Park": { lat: 18.5362, lng: 73.8940, label: "Koregaon Park, Pune" },
  "Baner": { lat: 18.5590, lng: 73.7868, label: "Baner, Pune" },
  "Hinjewadi": { lat: 18.5913, lng: 73.7389, label: "Hinjewadi, Pune" },
  "Kothrud": { lat: 18.5074, lng: 73.8077, label: "Kothrud, Pune" },
  "Viman Nagar": { lat: 18.5679, lng: 73.9143, label: "Viman Nagar, Pune" },
  "FC Road": { lat: 18.5222, lng: 73.8416, label: "FC Road, Pune" },
  "Wakad": { lat: 18.5987, lng: 73.7686, label: "Wakad, Pune" },
  "Magarpatta": { lat: 18.5158, lng: 73.9272, label: "Magarpatta, Pune" },
};

export default function HomePage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  // Role Gate: Redirect Host to Host Studio & Admin to Admin Console
  useEffect(() => {
    if (currentUser?.role === "host") {
      router.replace("/dashboard/host");
    } else if (currentUser?.role === "admin") {
      router.replace("/admin");
    }
  }, [currentUser?.role, router]);

  // Default search window: tomorrow 10:00 AM for 3 hours
  const defaultWindow = useMemo(() => {
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    start.setMinutes(0, 0, 0);
    start.setHours(10);
    const dateStr = start.toISOString().slice(0, 10);
    return {
      date: dateStr,
      arrivalTime: "10:00",
      durationHours: 3,
    };
  }, []);

  const [query, setQuery] = useState("");
  const [selectedLocality, setSelectedLocality] = useState<string>("all");
  const [date, setDate] = useState(defaultWindow.date);
  const [arrivalTime, setArrivalTime] = useState(defaultWindow.arrivalTime);
  const [durationHours, setDurationHours] = useState<number>(
    defaultWindow.durationHours
  );
  const [vehicleType, setVehicleType] = useState<string>("all");
  const [spaceType, setSpaceType] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);

  const [searchCenter, setSearchCenter] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>({
    lat: 18.5204,
    lng: 73.8567,
    label: "Pune City Center",
  });

  const [listings, setListings] = useState<EnrichedListing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [locating, setLocating] = useState<boolean>(false);

  // Compute ISO startTime and endTime from date + arrivalTime + durationHours
  const { startTimeIso, endTimeIso } = useMemo(() => {
    try {
      const start = new Date(`${date}T${arrivalTime}:00`);
      if (isNaN(start.getTime())) {
        const fallback = new Date(Date.now() + 12 * 3600 * 1000);
        const fallbackEnd = new Date(
          fallback.getTime() + durationHours * 3600 * 1000
        );
        return {
          startTimeIso: fallback.toISOString(),
          endTimeIso: fallbackEnd.toISOString(),
        };
      }
      const end = new Date(start.getTime() + durationHours * 3600 * 1000);
      return {
        startTimeIso: start.toISOString(),
        endTimeIso: end.toISOString(),
      };
    } catch {
      const fallback = new Date(Date.now() + 12 * 3600 * 1000);
      const fallbackEnd = new Date(
        fallback.getTime() + durationHours * 3600 * 1000
      );
      return {
        startTimeIso: fallback.toISOString(),
        endTimeIso: fallbackEnd.toISOString(),
      };
    }
  }, [date, arrivalTime, durationHours]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (spaceType !== "all") params.set("spaceType", spaceType);
      if (vehicleType !== "all") params.set("vehicleType", vehicleType);
      if (maxPrice !== "all") params.set("maxHourlyPrice", maxPrice);
      if (sortBy !== "featured") params.set("sortBy", sortBy);
      if (searchCenter) {
        params.set("lat", String(searchCenter.lat));
        params.set("lng", String(searchCenter.lng));
      }
      params.set("startTime", startTimeIso);
      params.set("endTime", endTimeIso);
      if (onlyAvailable) {
        params.set("onlyAvailable", "true");
      }

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      setListings(data.listings || []);
      if (data.listings?.length > 0 && !selectedListingId) {
        setSelectedListingId(data.listings[0].id);
      }
    } catch {
      toast.error("Could not load parking spaces. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    query,
    spaceType,
    vehicleType,
    maxPrice,
    sortBy,
    searchCenter,
    onlyAvailable,
    startTimeIso,
    endTimeIso,
    selectedListingId,
  ]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleLocalityChange = (loc: string) => {
    setSelectedLocality(loc);
    if (loc === "all") {
      setQuery("");
      setSearchCenter({ lat: 18.5204, lng: 73.8567, label: "Pune City Center" });
    } else {
      setQuery(loc);
      const target = PUNE_LOCALITIES[loc];
      if (target) {
        setSearchCenter(target);
        setSortBy("distance");
      }
    }
  };

  const handleSelectHub = (hub: (typeof URBAN_HUBS)[number]) => {
    setQuery(hub.name);
    setSelectedLocality(hub.name in PUNE_LOCALITIES ? hub.name : "all");
    setSearchCenter({
      lat: hub.latitude,
      lng: hub.longitude,
      label: `${hub.name}, ${hub.city}`,
    });
    setSortBy("distance");
  };

  const handleLocateMe = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      toast.error("Browser geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setQuery("");
        setSelectedLocality("all");
        setSearchCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: `Your GPS Location (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`,
        });
        setSortBy("distance");
        toast.success("Showing parking spaces sorted by distance from you.");
      },
      () => {
        setLocating(false);
        toast.info(
          "Location permission not granted — defaulting to Pune City Center."
        );
        setSearchCenter({
          lat: 18.5204,
          lng: 73.8567,
          label: "Pune City Center (Fallback)",
        });
      },
      { timeout: 6000 }
    );
  };

  const handleResetFilters = () => {
    setQuery("");
    setSelectedLocality("all");
    setVehicleType("all");
    setSpaceType("all");
    setMaxPrice("all");
    setSortBy("featured");
    setOnlyAvailable(false);
    setSearchCenter({
      lat: 18.5204,
      lng: 73.8567,
      label: "Pune City Center",
    });
  };

  // Transitional state for Host or Admin to prevent Driver UI flash
  if (currentUser?.role === "host") {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-24 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#CF4500] border-t-transparent animate-spin" />
        <h2 className="text-2xl font-medium text-[#141413]">Opening Host Studio...</h2>
        <p className="text-sm text-[#595550] max-w-md">
          Welcome back{currentUser?.name ? `, ${currentUser.name}` : ""}. Loading your spaces, reservations queue, and earnings studio.
        </p>
        <Link href="/dashboard/host">
          <Button variant="default" size="sm">Go to Host Studio</Button>
        </Link>
      </div>
    );
  }

  if (currentUser?.role === "admin") {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-24 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#141413] border-t-transparent animate-spin" />
        <h2 className="text-2xl font-medium text-[#141413]">Opening Admin Console...</h2>
        <p className="text-sm text-[#595550] max-w-md">
          Loading Trust & Safety moderation queue.
        </p>
        <Link href="/admin">
          <Button variant="default" size="sm">Go to Admin Console</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden">
      {/* 1. CLEAN DRIVER DISCOVERY HERO */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-6 pb-10">
        <div className="relative rounded-[32px] bg-[#141413] text-[#F3F0EE] overflow-hidden shadow-mc-floating border border-black/10">
          {/* Subtle gradient texture */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#F37338_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="relative z-10 px-6 sm:px-10 py-10">
            {/* Header: Concise Pune Eyebrow & Title */}
            <div className="max-w-2xl mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-white/10 backdrop-blur-sm border border-white/15 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#F37338]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#F3F0EE]">
                  PUNE PARKING DISCOVERY
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-[-0.02em] text-[#F3F0EE]">
                Find & reserve verified parking in Pune.
              </h1>
              <p className="text-sm sm:text-base text-[#D0CBC5] mt-2 max-w-xl">
                Instant access to private driveways, EV bays, and dedicated slots across Koregaon Park, Baner, Hinjewadi, and top Pune localities.
              </p>
            </div>

            {/* PROMINENT SEARCH CONSOLE */}
            <div className="bg-[#FCFBFA] text-[#141413] rounded-[24px] p-5 sm:p-6 shadow-2xl border border-black/10">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Destination Input */}
                <div className="md:col-span-4">
                  <label
                    htmlFor="hero-destination-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1.5"
                  >
                    Destination, Landmark, or Locality
                  </label>
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-[#736E68] absolute left-3.5 pointer-events-none" />
                    <input
                      id="hero-destination-input"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta..."
                      className="w-full h-11 pl-10 pr-24 rounded-xl border border-black/15 bg-white text-sm text-[#141413] placeholder:text-[#736E68] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                    />
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      disabled={locating}
                      className="absolute right-2 px-2.5 py-1 rounded-pill bg-[#F3F0EE] hover:bg-[#E8E2DA] text-[11px] font-bold text-[#141413] flex items-center gap-1 transition-colors"
                      title="Use browser GPS location"
                    >
                      <Compass className="w-3 h-3 text-[#CF4500]" />
                      {locating ? "..." : "Near Me"}
                    </button>
                  </div>
                </div>

                {/* Date Input */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="hero-date-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1.5"
                  >
                    Parking Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#736E68] absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="hero-date-input"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                    />
                  </div>
                </div>

                {/* Arrival & Duration */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="hero-time-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1.5"
                  >
                    Arrival Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-[#736E68] absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="hero-time-input"
                      type="time"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="hero-duration-select"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1.5"
                  >
                    Duration
                  </label>
                  <select
                    id="hero-duration-select"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                  >
                    <option value={1}>1 Hour</option>
                    <option value={2}>2 Hours</option>
                    <option value={3}>3 Hours</option>
                    <option value={4}>4 Hours</option>
                    <option value={6}>6 Hours</option>
                    <option value={8}>Full Workday (8 hrs)</option>
                    <option value={12}>Overnight (12 hrs)</option>
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={48}>Weekend (2 Days)</option>
                  </select>
                </div>

                {/* Vehicle Selector */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="hero-vehicle-select"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1.5"
                  >
                    Vehicle Size
                  </label>
                  <select
                    id="hero-vehicle-select"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                  >
                    <option value="all">All Vehicles</option>
                    <option value="two_wheeler">Two-Wheeler / Bike</option>
                    <option value="hatchback">Hatchback / Compact</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV / Crossover</option>
                    <option value="ev">EV Car (Charging)</option>
                  </select>
                </div>
              </div>

              {/* Popular Pune Localities Quick Pills */}
              <div className="mt-4 pt-3 border-t border-black/8 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#736E68] mr-1">
                    Pune Localities:
                  </span>
                  {URBAN_HUBS.map((hub) => {
                    const isHubActive =
                      searchCenter?.label.includes(hub.name) ||
                      query.toLowerCase().includes(hub.name.toLowerCase());
                    return (
                      <button
                        key={hub.id}
                        type="button"
                        onClick={() => handleSelectHub(hub)}
                        className={`px-3 py-1 rounded-pill text-xs font-medium transition-all ${
                          isHubActive
                            ? "bg-[#141413] text-[#F3F0EE] font-semibold"
                            : "bg-[#F3F0EE] text-[#595550] hover:bg-[#E8E2DA] hover:text-[#141413]"
                        }`}
                      >
                        {hub.name}
                      </button>
                    );
                  })}
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#595550] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                    className="rounded border-black/25 text-[#CF4500] focus:ring-[#CF4500]"
                  />
                  <span>
                    Only show spots available for{" "}
                    <strong className="text-[#141413]">
                      {date} ({arrivalTime}, {durationHours}h)
                    </strong>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DISCOVER & COMPARE PARKING SPACES (MAP + LISTINGS) */}
      <section
        id="discover"
        className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 scroll-mt-24"
      >
        {/* Section Header + Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="mc-eyebrow mb-2">
              <span className="mc-eyebrow-dot" />
              <span>LIVE MARKETPLACE DISCOVERY</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#141413]">
              Compare verified parking spaces
            </h2>
            <p className="text-base text-[#595550] mt-1">
              Showing{" "}
              <strong className="text-[#141413]">{listings.length}</strong>{" "}
              {onlyAvailable ? "available " : ""}spaces{" "}
              {searchCenter ? `near ${searchCenter.label}` : "across Pune"}{" "}
              · Estimated prices shown for{" "}
              <strong className="text-[#141413]">
                {durationHours} {durationHours === 1 ? "hour" : "hours"}
              </strong>
            </p>
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5 bg-[#FCFBFA] p-2.5 rounded-2xl border border-black/8">
            <div className="flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wider text-[#595550]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#CF4500]" />
              Filters
            </div>

            <select
              aria-label="Filter by Locality"
              value={selectedLocality}
              onChange={(e) => handleLocalityChange(e.target.value)}
              className="h-9 px-3 rounded-pill bg-[#F3F0EE] text-xs font-medium text-[#141413] border border-transparent focus:outline-none focus:border-black/20"
            >
              <option value="all">All Pune Localities</option>
              <option value="Koregaon Park">Koregaon Park</option>
              <option value="Baner">Baner</option>
              <option value="Hinjewadi">Hinjewadi</option>
              <option value="Kothrud">Kothrud</option>
              <option value="Viman Nagar">Viman Nagar</option>
              <option value="FC Road">FC Road</option>
              <option value="Wakad">Wakad</option>
              <option value="Magarpatta">Magarpatta</option>
            </select>

            <select
              aria-label="Filter by Parking Type"
              value={spaceType}
              onChange={(e) => setSpaceType(e.target.value)}
              className="h-9 px-3 rounded-pill bg-[#F3F0EE] text-xs font-medium text-[#141413] border border-transparent focus:outline-none focus:border-black/20"
            >
              <option value="all">All Space Types</option>
              <option value="covered">Covered Garage</option>
              <option value="driveway">Private Driveway</option>
              <option value="dedicated_private">Dedicated Private Slot</option>
              <option value="commercial_lot">Commercial Lot</option>
              <option value="uncovered">Uncovered Open</option>
            </select>

            <select
              aria-label="Filter by Maximum Hourly Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 px-3 rounded-pill bg-[#F3F0EE] text-xs font-medium text-[#141413] border border-transparent focus:outline-none focus:border-black/20"
            >
              <option value="all">Any Hourly Rate</option>
              <option value="50">Up to ₹50/hr</option>
              <option value="80">Up to ₹80/hr</option>
              <option value="120">Up to ₹120/hr</option>
            </select>

            <select
              aria-label="Sort results by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 rounded-pill bg-[#141413] text-[#F3F0EE] text-xs font-semibold focus:outline-none"
            >
              <option value="featured">Sort: Featured & Rated</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
              <option value="distance">Sort: Closest Distance</option>
              <option value="rating">Sort: Highest Host Rating</option>
            </select>

            {(query ||
              selectedLocality !== "all" ||
              spaceType !== "all" ||
              vehicleType !== "all" ||
              maxPrice !== "all") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-pill text-xs font-semibold text-[#CF4500] hover:bg-[#CF4500]/10 transition-colors"
              >
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* Split Discovery Layout: Map on Left (5 cols), Listings on Right (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Interactive Map Column */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <DriverDiscoveryMap
              listings={listings}
              selectedId={selectedListingId}
              onSelect={(id: string) => setSelectedListingId(id)}
              searchCenter={searchCenter}
              onUseBrowserLocation={handleLocateMe}
            />
          </div>

          {/* Listing Cards Column */}
          <div className="lg:col-span-7 space-y-5">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-56 rounded-[24px] bg-[#FCFBFA] border border-black/8 p-6 animate-pulse flex gap-6"
                  >
                    <div className="w-40 h-40 rounded-full bg-[#E8E2DA] shrink-0" />
                    <div className="flex-1 space-y-3 py-2">
                      <div className="h-4 w-1/3 bg-[#E8E2DA] rounded" />
                      <div className="h-6 w-3/4 bg-[#E8E2DA] rounded" />
                      <div className="h-4 w-1/2 bg-[#E8E2DA] rounded" />
                      <div className="h-10 w-full bg-[#E8E2DA] rounded mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="rounded-[28px] bg-[#FCFBFA] border border-black/10 p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#F3F0EE] mx-auto flex items-center justify-center text-[#CF4500]">
                  <MapPin className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-medium text-[#141413]">
                  No parking spaces match your exact filters
                </h3>
                <p className="text-sm text-[#595550] max-w-md mx-auto">
                  Try broadening your vehicle filter, adjusting your arrival
                  window, or resetting your city filter to see all verified spots.
                </p>
                <div className="pt-2">
                  <Button variant="default" onClick={handleResetFilters}>
                    Show All Available Spaces
                  </Button>
                </div>
              </div>
            ) : (
              listings.map((listing) => {
                const isSelected = selectedListingId === listing.id;
                const estimatedSubtotal =
                  listing.estimatedPrice?.baseSubtotalInr ??
                  (durationHours >= 8
                    ? Math.ceil(durationHours / 24) * listing.dailyRateInr
                    : durationHours * listing.hourlyRateInr);

                return (
                  <div
                    key={listing.id}
                    onClick={() => setSelectedListingId(listing.id)}
                    onMouseEnter={() => setSelectedListingId(listing.id)}
                    className={`group relative rounded-[28px] bg-[#FCFBFA] p-5 sm:p-6 transition-all duration-200 border cursor-pointer ${
                      isSelected
                        ? "border-[#CF4500] shadow-mc-card-hover ring-1 ring-[#CF4500]/30"
                        : "border-black/8 shadow-mc-card hover:border-black/20"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-stretch">
                      {/* Circular Portrait Image Mask + Docked 56px White Satellite CTA */}
                      <div className="relative w-44 h-44 sm:w-48 sm:h-48 shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#E8E2DA] bg-[#E8E2DA]">
                          <img
                            src={
                              listing.photos[0]?.url ||
                              "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=900&q=80"
                            }
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        {/* Featured or Demo Badge */}
                        {listing.isFeatured && (
                          <span className="absolute top-1 left-1 px-2.5 py-1 rounded-pill bg-[#CF4500] text-white text-[10px] font-bold uppercase tracking-wider shadow">
                            Featured
                          </span>
                        )}

                        {/* Docked 56px White Satellite CTA */}
                        <Link
                          href={`/listings/${listing.id}?date=${date}&arrival=${arrivalTime}&duration=${durationHours}`}
                          aria-label={`Inspect ${listing.title}`}
                          className="mc-satellite-cta absolute bottom-1 right-1 !w-12 !h-12"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>

                      {/* Listing Details Column */}
                      <div className="flex-1 flex flex-col justify-between w-full">
                        <div>
                          {/* Top Metadata Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="default">
                                {SPACE_TYPE_LABELS[listing.spaceType]}
                              </Badge>
                              {listing.distanceKm != null && (
                                <Badge variant="signal">
                                  {listing.distanceKm} km away
                                </Badge>
                              )}
                              {listing.isDemo && (
                                <Badge variant="outline" title="Seeded marketplace demo space">
                                  Demo Listing
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-xs font-bold text-[#141413]">
                              <Star className="w-3.5 h-3.5 fill-[#CF4500] text-[#CF4500]" />
                              <span>{listing.ratingAvg.toFixed(2)}</span>
                              <span className="text-[#736E68] font-normal">
                                ({listing.reviewCount})
                              </span>
                            </div>
                          </div>

                          {/* Title & Locality */}
                          <Link
                            href={`/listings/${listing.id}?date=${date}&arrival=${arrivalTime}&duration=${durationHours}`}
                            className="block group-hover:text-[#CF4500] transition-colors"
                          >
                            <h3 className="text-xl font-medium tracking-[-0.015em] text-[#141413] line-clamp-1">
                              {listing.title}
                            </h3>
                          </Link>

                          <p className="text-xs text-[#595550] flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-[#CF4500] shrink-0" />
                            <span>
                              {listing.address}, {listing.locality},{" "}
                              {listing.city} ·{" "}
                              <strong className="text-[#141413]">
                                {listing.landmark}
                              </strong>
                            </span>
                          </p>

                          {/* Dimensions & Supported Vehicles */}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#595550] bg-[#F3F0EE] px-2.5 py-1 rounded-pill">
                              <Ruler className="w-3 h-3 text-[#141413]" />
                              {listing.dimensions.lengthFt}×
                              {listing.dimensions.widthFt} ft
                              {listing.dimensions.heightClearanceFt
                                ? ` · ${listing.dimensions.heightClearanceFt}ft clearance`
                                : " · Open height"}
                            </span>

                            {listing.vehicleTypes.slice(0, 3).map((v) => (
                              <span
                                key={v}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#595550] bg-[#F3F0EE] px-2.5 py-1 rounded-pill"
                              >
                                <Car className="w-3 h-3 text-[#736E68]" />
                                {VEHICLE_LABELS[v]}
                              </span>
                            ))}

                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E7E48] bg-[#1E7E48]/10 px-2.5 py-1 rounded-pill">
                              <Zap className="w-3 h-3" />
                              Instant Book
                            </span>
                          </div>
                        </div>

                        {/* Bottom Pricing & CTA Row */}
                        <div className="mt-4 pt-3.5 border-t border-black/8 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-bold text-[#141413]">
                                {formatInr(listing.hourlyRateInr)}
                              </span>
                              <span className="text-xs text-[#595550]">
                                / hour · {formatInr(listing.dailyRateInr)} / day
                              </span>
                            </div>
                            <div className="text-[11px] text-[#595550]">
                              Est. base for {durationHours}h:{" "}
                              <strong className="text-[#141413]">
                                {formatInr(estimatedSubtotal)}
                              </strong>{" "}
                              {listing.availability.available ? (
                                <span className="text-[#1E7E48] font-semibold">
                                  • Available for slot
                                </span>
                              ) : (
                                <span className="text-[#CF4500] font-semibold">
                                  • {listing.availability.reason || "Unavailable"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/listings/${listing.id}?date=${date}&arrival=${arrivalTime}&duration=${durationHours}`}
                            >
                              <Button variant="default" size="sm">
                                View & Reserve
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
