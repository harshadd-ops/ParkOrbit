"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type * as LeafletTypes from "leaflet";
import type * as ReactLeafletTypes from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { EnrichedListing } from "@/lib/db";
import { formatInr, cn } from "@/lib/utils";
import { ArrowRight, LocateFixed, Star } from "lucide-react";

export interface DriverDiscoveryMapProps {
  listings: EnrichedListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchCenter?: { lat: number; lng: number; label: string } | null;
  onUseBrowserLocation?: () => void;
  hrefFor?: (listingId: string) => string;
  showPreview?: boolean;
  className?: string;
}

export const OSM_TILE_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const CARTO_VOYAGER_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const TILE_OPTIONS = {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
};

const PUNE_CENTER: [number, number] = [18.5204, 73.8567];
const PUNE_METRO_BOUNDS: [[number, number], [number, number]] = [
  [18.25, 73.50],
  [18.85, 74.25],
];

interface LoadedModules {
  L: typeof LeafletTypes;
  RL: typeof ReactLeafletTypes;
}

export function DriverDiscoveryMap({
  listings,
  selectedId,
  onSelect,
  searchCenter,
  onUseBrowserLocation,
  hrefFor = (id) => `/listings/${id}`,
  showPreview = true,
  className,
}: DriverDiscoveryMapProps) {
  const [mods, setMods] = useState<LoadedModules | null>(null);

  const activeListing = listings.find((l) => l.id === selectedId) || null;

  // Load Leaflet on the client only (it touches window at import time)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let isMounted = true;

    Promise.all([import("leaflet"), import("react-leaflet")]).then(
      ([leafletModule, rlModule]) => {
        if (!isMounted) return;
        const L = (leafletModule.default ||
          leafletModule) as typeof LeafletTypes;
        if (
          L &&
          L.Map &&
          L.Map.prototype &&
          !(L.Map.prototype as any).__parkorbit_patched
        ) {
          // React strict mode mounts twice; clear the stale Leaflet id so re-init doesn't throw
          const mapProto = L.Map.prototype as any;
          const originalInit = mapProto._initContainer;
          mapProto._initContainer = function (id: any) {
            const container =
              typeof id === "string" ? document.getElementById(id) : id;
            if (container && container._leaflet_id) {
              delete container._leaflet_id;
              container.innerHTML = "";
            }
            return originalInit.call(this, id);
          };
          mapProto.__parkorbit_patched = true;
        }
        setMods({ L, RL: rlModule });
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  // Fit to the result set whenever it changes and no explicit locality is chosen
  const listingsKey = listings.map((l) => l.id).join(",");

  const helpers = useMemo(() => {
    if (!mods) return null;
    const { L, RL } = mods;
    const { useMap } = RL;

    function InvalidateSize() {
      const map = useMap();
      useEffect(() => {
        map.invalidateSize();
        const timer = setTimeout(() => {
          map.invalidateSize();
        }, 150);

        const handleResize = () => {
          map.invalidateSize();
        };

        window.addEventListener("resize", handleResize);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("resize", handleResize);
        };
      }, [map]);
      return null;
    }

    function FitBounds({
      points,
      fitKey,
    }: {
      points: Array<[number, number]>;
      fitKey: string;
    }) {
      const map = useMap();
      useEffect(() => {
        if (points.length === 0) return;
        const bounds = L.latLngBounds(points);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [fitKey, map]);
      return null;
    }

    function ViewportController({
      center,
      selected,
    }: {
      center?: { lat: number; lng: number; label: string } | null;
      selected: EnrichedListing | null;
    }) {
      const map = useMap();

      useEffect(() => {
        if (!center) return;
        map.flyTo([center.lat, center.lng], 14, {
          duration: 0.9,
          easeLinearity: 0.25,
        });
      }, [center?.lat, center?.lng, map]);

      // Only pan when the chosen pin is off-screen, so the map doesn't jump around
      useEffect(() => {
        if (!selected) return;
        const target = L.latLng(selected.latitude, selected.longitude);
        if (!map.getBounds().pad(-0.15).contains(target)) {
          map.panTo(target, { animate: true, duration: 0.5 });
        }
      }, [selected?.id, map]);

      return null;
    }

    return { InvalidateSize, FitBounds, ViewportController };
  }, [mods]);

  return (
    <div
      className={cn(
        "relative w-full h-[520px] rounded-stadium bg-[#E8E2DA] overflow-hidden select-none",
        className
      )}
      data-testid="interactive-driver-discovery-map"
    >
      {mods && helpers ? (
        <mods.RL.MapContainer
          center={searchCenter ? [searchCenter.lat, searchCenter.lng] : PUNE_CENTER}
          zoom={12}
          minZoom={10}
          maxZoom={18}
          maxBounds={PUNE_METRO_BOUNDS}
          zoomControl={false}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          className="w-full h-full z-0"
        >
          <helpers.InvalidateSize />
          <helpers.ViewportController center={searchCenter} selected={activeListing} />
          {!searchCenter && (
            <helpers.FitBounds
              points={listings.map((l) => [l.latitude, l.longitude])}
              fitKey={listingsKey}
            />
          )}

          {/* Carto now watermarks keyless requests, so use OSM tiles (softened in globals.css) */}
          <mods.RL.TileLayer
            url={OSM_TILE_URL}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <mods.RL.ZoomControl position="topright" />

          {searchCenter && (
            <mods.RL.Marker
              position={[searchCenter.lat, searchCenter.lng]}
              interactive={false}
              icon={mods.L.divIcon({
                className: "pko-radar-icon",
                html: `
                  <div class="relative flex items-center justify-center w-12 h-12">
                    <div class="absolute w-12 h-12 rounded-full bg-[#141413]/15 animate-ping"></div>
                    <div class="relative w-3.5 h-3.5 rounded-full bg-[#141413] border-2 border-white shadow-md"></div>
                  </div>
                `,
                iconSize: [48, 48],
                iconAnchor: [24, 24],
              })}
            />
          )}

          {listings.map((listing) => {
            const isSelected = listing.id === selectedId;
            const isAvailable = listing.availability?.available ?? true;

            const markerHtml = `
              <div class="relative inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-transform duration-200 select-none cursor-pointer ${
                isSelected
                  ? "bg-[#141413] text-[#F3F0EE] shadow-xl scale-110"
                  : isAvailable
                    ? "bg-white text-[#141413] shadow-md hover:scale-105"
                    : "bg-white/70 text-[#696969] shadow-sm line-through"
              }">
                <span>₹${listing.hourlyRateInr}/hr</span>
              </div>
            `;

            return (
              <mods.RL.Marker
                key={listing.id}
                position={[listing.latitude, listing.longitude]}
                icon={mods.L.divIcon({
                  className: "pko-marker-div-icon",
                  html: markerHtml,
                  iconSize: [80, 32],
                  iconAnchor: [40, 16],
                })}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{ click: () => onSelect(listing.id) }}
              />
            );
          })}
        </mods.RL.MapContainer>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-ink/20 border-t-ink animate-spin" />
        </div>
      )}

      {onUseBrowserLocation && (
        <button
          type="button"
          onClick={onUseBrowserLocation}
          aria-label="Find parking near me"
          className="absolute top-4 left-4 z-[25] inline-flex items-center gap-2 rounded-pill bg-white px-4 py-2.5 text-[14px] font-medium text-ink shadow-nav hover:bg-canvas transition-colors"
        >
          <LocateFixed className="size-4" />
          Near me
        </button>
      )}

      {showPreview && activeListing && (
        <div className="absolute bottom-4 left-4 right-4 z-[25] flex items-center gap-4 rounded-stadium bg-white p-3 pr-4 shadow-halo animate-in fade-in slide-in-from-bottom-2 duration-300">
          <img
            src={activeListing.photos[0]?.url}
            alt={activeListing.title}
            className="size-16 rounded-full object-cover shrink-0 bg-canvas"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium text-ink truncate">
              {activeListing.title}
            </div>
            <div className="flex items-center gap-2 text-[13px] text-slate mt-0.5">
              <span>{activeListing.locality}</span>
              <span className="inline-flex items-center gap-1 text-ink">
                <Star className="size-3 fill-ink" />
                {activeListing.ratingAvg.toFixed(1)}
              </span>
              <span className="font-medium text-ink">
                {formatInr(activeListing.hourlyRateInr)}/hr
              </span>
            </div>
          </div>
          <Link
            href={hrefFor(activeListing.id)}
            aria-label={`View ${activeListing.title}`}
            className="inline-flex size-11 items-center justify-center rounded-full bg-ink text-canvas hover:bg-charcoal transition-colors shrink-0"
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default DriverDiscoveryMap;
