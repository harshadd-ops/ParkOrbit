"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives";
import {
  buildTimeWindow,
  cn,
  DURATION_OPTIONS,
  formatInr,
  tomorrowDateString,
} from "@/lib/utils";
import { SPACE_TYPE_LABELS, VEHICLE_LABELS } from "@/lib/labels";
import type { SpaceType, VehicleType } from "@/lib/types";
import type { EnrichedListing } from "@/lib/db";
import { useDataSync } from "@/lib/sync";

const DriverDiscoveryMap = dynamic(
  () => import("@/components/map/DriverDiscoveryMap").then((m) => m.DriverDiscoveryMap),
  {
    ssr: false,
    loading: () => <div className="w-full h-full rounded-stadium bg-[#E8E2DA] animate-pulse" />,
  }
);

const LOCALITIES: Array<{ name: string; lat: number; lng: number }> = [
  { name: "Koregaon Park", lat: 18.5362, lng: 73.894 },
  { name: "Baner", lat: 18.559, lng: 73.7868 },
  { name: "Hinjewadi", lat: 18.5913, lng: 73.7389 },
  { name: "Kothrud", lat: 18.5074, lng: 73.8077 },
  { name: "Viman Nagar", lat: 18.5679, lng: 73.9143 },
  { name: "FC Road", lat: 18.5222, lng: 73.8416 },
  { name: "Wakad", lat: 18.5987, lng: 73.7686 },
  { name: "Magarpatta", lat: 18.5158, lng: 73.9272 },
];

const PRICE_OPTIONS = [
  { value: "all", label: "Any price" },
  { value: "50", label: "Under ₹50/hr" },
  { value: "80", label: "Under ₹80/hr" },
  { value: "120", label: "Under ₹120/hr" },
];

const SORT_OPTIONS = [
  { value: "featured", label: "Recommended" },
  { value: "distance", label: "Closest" },
  { value: "price_asc", label: "Cheapest" },
  { value: "rating", label: "Top rated" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-pill px-4 py-2 text-[14px] font-medium transition-colors whitespace-nowrap",
        active ? "bg-ink text-canvas" : "bg-white text-ink hover:bg-lifted"
      )}
    >
      {children}
    </button>
  );
}

function FindParking() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [date, setDate] = useState(tomorrowDateString);
  const [arrivalTime, setArrivalTime] = useState("10:00");
  const [durationHours, setDurationHours] = useState(3);
  const [locality, setLocality] = useState<string | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number; label: string } | null>(null);

  const [vehicleType, setVehicleType] = useState<string>("all");
  const [spaceType, setSpaceType] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [listings, setListings] = useState<EnrichedListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { startTimeIso, endTimeIso } = useMemo(
    () => buildTimeWindow(date, arrivalTime, durationHours),
    [date, arrivalTime, durationHours]
  );

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startTime: startTimeIso, endTime: endTimeIso });
      if (debouncedQuery.trim()) params.set("query", debouncedQuery.trim());
      if (spaceType !== "all") params.set("spaceType", spaceType);
      if (vehicleType !== "all") params.set("vehicleType", vehicleType);
      if (maxPrice !== "all") params.set("maxHourlyPrice", maxPrice);
      if (sortBy !== "featured") params.set("sortBy", sortBy);
      if (searchCenter) {
        params.set("lat", String(searchCenter.lat));
        params.set("lng", String(searchCenter.lng));
      }
      if (onlyAvailable) params.set("onlyAvailable", "true");

      const res = await fetch(`/api/listings?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setListings(data.listings || []);
    } catch {
      toast.error("Could not load parking spaces. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, spaceType, vehicleType, maxPrice, sortBy, searchCenter, onlyAvailable, startTimeIso, endTimeIso]);

  useDataSync(fetchListings, [fetchListings]);

  const pickLocality = (name: string | null) => {
    setLocality(name);
    const hit = LOCALITIES.find((l) => l.name === name);
    setSearchCenter(hit ? { lat: hit.lat, lng: hit.lng, label: `${hit.name}, Pune` } : null);
    setSortBy(hit ? "distance" : "featured");
  };

  const handleLocateMe = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocality(null);
        setSearchCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "You" });
        setSortBy("distance");
      },
      () => toast.info("Location permission wasn't granted."),
      { timeout: 6000 }
    );
  };

  const activeFilterCount =
    Number(vehicleType !== "all") +
    Number(spaceType !== "all") +
    Number(maxPrice !== "all") +
    Number(sortBy !== "featured" && sortBy !== "distance") +
    Number(!onlyAvailable);

  const detailHref = (id: string) =>
    `/listings/${id}?date=${date}&arrival=${arrivalTime}&duration=${durationHours}`;

  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-8 pt-10 md:pt-14">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-[36px] md:text-[48px] font-medium tracking-[-0.02em] leading-[1.05]">
          Find parking in Pune
        </h1>

        {/* Search bar */}
        <div className="mt-8 grid grid-cols-2 md:flex md:items-center gap-2 md:gap-0 rounded-[28px] md:rounded-pill bg-white p-2 shadow-nav">
          <label className="col-span-2 flex items-center gap-3 md:flex-1 px-4 py-2">
            <Search className="size-5 text-slate shrink-0" />
            <span className="sr-only">Where are you going?</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Where are you going?"
              className="w-full bg-transparent text-[16px] text-ink placeholder:text-slate focus:outline-none"
            />
          </label>
          <div className="hidden md:block w-px h-8 bg-ink/10" />
          <label className="flex flex-col px-4 py-1.5">
            <span className="text-[12px] text-slate">Date</span>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-[15px] font-medium text-ink focus:outline-none"
            />
          </label>
          <div className="hidden md:block w-px h-8 bg-ink/10" />
          <label className="flex flex-col px-4 py-1.5">
            <span className="text-[12px] text-slate">Arrive</span>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="bg-transparent text-[15px] font-medium text-ink focus:outline-none"
            />
          </label>
          <div className="hidden md:block w-px h-8 bg-ink/10" />
          <label className="flex flex-col px-4 py-1.5">
            <span className="text-[12px] text-slate">For</span>
            <select
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="bg-transparent text-[15px] font-medium text-ink focus:outline-none -ml-1"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="relative inline-flex items-center justify-center gap-2 rounded-pill bg-canvas hover:bg-[#E8E2DA] px-5 py-3 text-[15px] font-medium transition-colors md:ml-2"
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-ink text-canvas text-[11px]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Locality chips */}
        <div className="mt-5 -mx-4 px-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          <Chip active={locality === null} onClick={() => pickLocality(null)}>
            All of Pune
          </Chip>
          {LOCALITIES.map((l) => (
            <Chip key={l.name} active={locality === l.name} onClick={() => pickLocality(l.name)}>
              {l.name}
            </Chip>
          ))}
        </div>
      </div>

      {/* Results + map */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 lg:order-2">
          <div className="lg:sticky lg:top-28 h-[360px] lg:h-[calc(100vh-8.5rem)]">
            <DriverDiscoveryMap
              listings={listings}
              selectedId={selectedId}
              onSelect={setSelectedId}
              searchCenter={searchCenter}
              onUseBrowserLocation={handleLocateMe}
              hrefFor={detailHref}
              className="h-full"
            />
          </div>
        </div>

        <div className="lg:col-span-5 lg:order-1">
          <p className="text-[15px] text-slate mb-4 px-1">
            {loading ? "Searching…" : `${listings.length} ${listings.length === 1 ? "space" : "spaces"} ${locality ? `near ${locality}` : "across Pune"}`}
          </p>

          {loading && listings.length === 0 ? (
            <div className="space-y-3">
              {[0, 1, 2].map((n) => (
                <div key={n} className="h-[120px] rounded-stadium bg-lifted animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-stadium bg-lifted p-10 text-center">
              <h3 className="text-[22px] font-medium">No spaces match</h3>
              <p className="text-[15px] text-slate mt-2">
                Try another time, or clear your filters.
              </p>
              <Button
                className="mt-6"
                onClick={() => {
                  setQuery("");
                  setVehicleType("all");
                  setSpaceType("all");
                  setMaxPrice("all");
                  setOnlyAvailable(false);
                  pickLocality(null);
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {listings.map((listing) => {
                const total = listing.estimatedPrice?.totalDriverPaidInr;
                const available = listing.availability?.available ?? true;
                return (
                  <li key={listing.id}>
                    <Link
                      href={detailHref(listing.id)}
                      onMouseEnter={() => setSelectedId(listing.id)}
                      onFocus={() => setSelectedId(listing.id)}
                      className={cn(
                        "group flex items-center gap-5 rounded-stadium p-4 pr-6 transition-all duration-300",
                        selectedId === listing.id ? "bg-white shadow-halo" : "bg-lifted hover:bg-white"
                      )}
                    >
                      <div className="size-[88px] rounded-full overflow-hidden shrink-0 bg-canvas">
                        <img
                          src={listing.photos[0]?.url}
                          alt={listing.title}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-slate">
                          {listing.locality}
                          {listing.distanceKm != null && ` · ${listing.distanceKm} km`}
                        </div>
                        <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink truncate mt-0.5">
                          {listing.title}
                        </h3>
                        <div className="flex items-center gap-3 text-[13px] text-slate mt-1.5">
                          <span className="inline-flex items-center gap-1 text-ink">
                            <Star className="size-3.5 fill-ink" />
                            {listing.ratingAvg.toFixed(1)}
                          </span>
                          <span>{SPACE_TYPE_LABELS[listing.spaceType]}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[20px] font-medium text-ink">
                          {formatInr(listing.hourlyRateInr)}
                          <span className="text-[13px] font-[450] text-slate">/hr</span>
                        </div>
                        <div className={cn("text-[12px] mt-0.5", available ? "text-slate" : "text-signal")}>
                          {available
                            ? total != null && `${formatInr(total)} total`
                            : "Unavailable"}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-7 mt-2">
            <FilterGroup label="Your vehicle">
              <Chip active={vehicleType === "all"} onClick={() => setVehicleType("all")}>Any</Chip>
              {(Object.keys(VEHICLE_LABELS) as VehicleType[]).map((v) => (
                <Chip key={v} active={vehicleType === v} onClick={() => setVehicleType(v)}>
                  {VEHICLE_LABELS[v]}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="Type of space">
              <Chip active={spaceType === "all"} onClick={() => setSpaceType("all")}>Any</Chip>
              {(Object.keys(SPACE_TYPE_LABELS) as SpaceType[]).map((s) => (
                <Chip key={s} active={spaceType === s} onClick={() => setSpaceType(s)}>
                  {SPACE_TYPE_LABELS[s]}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="Price">
              {PRICE_OPTIONS.map((p) => (
                <Chip key={p.value} active={maxPrice === p.value} onClick={() => setMaxPrice(p.value)}>
                  {p.label}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="Sort by">
              {SORT_OPTIONS.map((s) => (
                <Chip key={s.value} active={sortBy === s.value} onClick={() => setSortBy(s.value)}>
                  {s.label}
                </Chip>
              ))}
            </FilterGroup>
            <label className="flex items-center justify-between gap-4 rounded-cta bg-canvas px-5 py-4 cursor-pointer">
              <span className="text-[15px]">Only show spaces free at my time</span>
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="size-5 accent-[#141413]"
              />
            </label>
          </div>
          <Button className="w-full mt-4" onClick={() => setFiltersOpen(false)}>
            Show {listings.length} {listings.length === 1 ? "space" : "spaces"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[14px] font-medium text-ink mb-3">{label}</div>
      <div className="flex flex-wrap gap-2 [&>button]:bg-canvas [&>button[aria-pressed=true]]:bg-ink">
        {children}
      </div>
    </div>
  );
}

export default function FindParkingPage() {
  return (
    <Suspense fallback={null}>
      <FindParking />
    </Suspense>
  );
}
