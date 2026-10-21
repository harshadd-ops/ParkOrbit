"use client";

import React from "react";
import Link from "next/link";
import { EnrichedListing } from "@/lib/db";
import { formatInr, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Compass, MapPin, Navigation, ShieldCheck, Star } from "lucide-react";

interface OrbitMapProps {
  listings: EnrichedListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchCenter?: { lat: number; lng: number; label: string } | null;
  onUseBrowserLocation?: () => void;
  geoStatus?: string | null;
}

export function OrbitMap({
  listings,
  selectedId,
  onSelect,
  searchCenter,
  onUseBrowserLocation,
  geoStatus,
}: OrbitMapProps) {
  const activeListing =
    listings.find((l) => l.id === selectedId) || listings[0] || null;

  // Compute bounding box for relative pin placement on the interactive coordinate canvas
  const lats = listings.map((l) => l.latitude);
  const lngs = listings.map((l) => l.longitude);
  if (searchCenter) {
    lats.push(searchCenter.lat);
    lngs.push(searchCenter.lng);
  }

  const minLat = lats.length ? Math.min(...lats) : 12.9;
  const maxLat = lats.length ? Math.max(...lats) : 13.0;
  const minLng = lngs.length ? Math.min(...lngs) : 77.55;
  const maxLng = lngs.length ? Math.max(...lngs) : 77.75;

  const latSpan = Math.max(0.015, maxLat - minLat);
  const lngSpan = Math.max(0.015, maxLng - minLng);

  function toViewportPercent(lat: number, lng: number) {
    const x = 14 + ((lng - minLng) / lngSpan) * 72;
    const y = 82 - ((lat - minLat) / latSpan) * 64;
    return {
      left: `${Math.min(88, Math.max(12, x))}%`,
      top: `${Math.min(85, Math.max(15, y))}%`,
    };
  }

  return (
    <div
      className="relative w-full h-[460px] lg:h-[620px] rounded-stadium bg-[#191918] text-white overflow-hidden border border-ink/15 shadow-halo select-none"
      data-testid="interactive-orbit-map"
    >
      {/* Architectural Topographic & Orbital SVG Grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle Urban Grid */}
        <path
          d="M0 120 H800 M0 240 H800 M0 360 H800 M0 480 H800 M160 0 V600 M320 0 V600 M480 0 V600 M640 0 V600"
          stroke="#696969"
          strokeWidth="0.6"
          strokeDasharray="4 6"
        />
        {/* Signature Light Signal Orange (#F37338) Orbital Trajectories per DESIGN-mastercard.md */}
        <path
          d="M -60 460 C 180 180, 480 110, 860 310"
          stroke="#F37338"
          strokeWidth="1.5"
        />
        <path
          d="M 80 580 C 260 320, 540 280, 790 90"
          stroke="#F37338"
          strokeWidth="1.2"
          strokeDasharray="6 6"
        />
        <circle
          cx="400"
          cy="300"
          r="190"
          stroke="#F37338"
          strokeWidth="1"
          strokeOpacity="0.45"
        />
        <circle
          cx="400"
          cy="300"
          r="105"
          stroke="#F3F0EE"
          strokeWidth="0.75"
          strokeOpacity="0.2"
        />
      </svg>

      {/* Top Bar: Map Header & Geolocation Trigger */}
      <div className="absolute top-5 left-5 right-5 z-20 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-pill bg-ink/90 backdrop-blur-md border border-white/15 px-4 py-2 text-[13px]">
          <Compass className="size-4 text-signal-light" />
          <span className="font-medium text-canvas">
            {searchCenter
              ? `Orbit Center: ${searchCenter.label} (${searchCenter.lat.toFixed(3)}°N, ${searchCenter.lng.toFixed(3)}°E)`
              : "Multi-City Live Coordinate Map"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onUseBrowserLocation && (
            <button
              type="button"
              onClick={onUseBrowserLocation}
              className="inline-flex items-center gap-2 rounded-pill bg-white text-ink px-4 py-2 text-[13px] font-medium hover:bg-canvas transition-colors shadow-sm"
            >
              <Navigation className="size-3.5 text-signal" />
              <span>Near Me (GPS)</span>
            </button>
          )}
        </div>
      </div>

      {geoStatus && (
        <div className="absolute top-16 left-5 z-20 rounded-pill bg-ink/85 border border-white/15 px-3.5 py-1 text-[12px] text-taupe">
          {geoStatus}
        </div>
      )}

      {/* Search Center Reference Marker */}
      {searchCenter && (
        <div
          style={toViewportPercent(searchCenter.lat, searchCenter.lng)}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
        >
          <div className="size-16 rounded-full bg-signal-light/20 border border-signal-light animate-pulse flex items-center justify-center">
            <div className="size-3.5 rounded-full bg-signal-light border-2 border-white" />
          </div>
        </div>
      )}

      {/* Interactive Price Pins for Listings */}
      {listings.map((item) => {
        const pos = toViewportPercent(item.latitude, item.longitude);
        const isSelected = activeListing?.id === item.id;
        const isAvailable = item.availability.available;

        return (
          <button
            key={item.id}
            type="button"
            style={pos}
            onClick={() => onSelect(item.id)}
            data-testid={`map-pin-${item.id}`}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 z-20 inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-all",
              isSelected
                ? "bg-signal-light text-ink scale-110 shadow-halo ring-4 ring-white/30 z-30 font-bold"
                : isAvailable
                  ? "bg-white text-ink hover:scale-105 shadow-md"
                  : "bg-charcoal text-taupe border border-white/20 opacity-75"
            )}
          >
            <span>{formatInr(item.hourlyRateInr)}/hr</span>
            {item.distanceKm !== undefined && (
              <span className="text-[11px] opacity-75">
                • {item.distanceKm}km
              </span>
            )}
          </button>
        );
      })}

      {/* Bottom Selected Listing Preview Card inside Stadium Map */}
      {activeListing && (
        <div className="absolute bottom-5 left-5 right-5 z-30 rounded-[28px] bg-white text-ink p-4 md:p-5 shadow-halo flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-ink/10">
          <div className="flex items-center gap-4">
            {/* Circular portrait thumbnail per DESIGN-mastercard.md */}
            <div className="relative size-16 md:size-20 rounded-full overflow-hidden shrink-0 border border-ink/15">
              <img
                src={activeListing.photos[0]?.url}
                alt={activeListing.title}
                className="size-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-signal">
                  • {activeListing.locality}, {activeListing.city}
                </span>
                {activeListing.isDemo && <Badge variant="demo">DEMO</Badge>}
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink">
                  <Star className="size-3.5 fill-mc-yellow text-mc-yellow" />
                  {activeListing.ratingAvg} ({activeListing.reviewCount})
                </span>
              </div>
              <h4 className="text-[18px] font-medium tracking-[-0.02em] text-ink line-clamp-1">
                {activeListing.title}
              </h4>
              <div className="flex flex-wrap items-center gap-3 text-[13px] text-slate">
                <span>
                  <strong className="text-ink">
                    {formatInr(activeListing.hourlyRateInr)}
                  </strong>
                  /hr • {formatInr(activeListing.dailyRateInr)}/day
                </span>
                {activeListing.distanceKm !== undefined && (
                  <span>• {activeListing.distanceKm} km from destination</span>
                )}
                {activeListing.estimatedPrice && (
                  <span className="text-ink font-medium">
                    • Est. Total:{" "}
                    {formatInr(activeListing.estimatedPrice.totalDriverPaidInr)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Satellite Circular CTA arrow on right */}
          <Link
            href={`/listings/${activeListing.id}`}
            aria-label={`Inspect ${activeListing.title}`}
            className="inline-flex items-center gap-2 rounded-cta bg-ink text-canvas px-5 py-2.5 text-[14px] font-medium tracking-[-0.02em] hover:bg-charcoal shrink-0"
          >
            <span>Inspect & Reserve</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
