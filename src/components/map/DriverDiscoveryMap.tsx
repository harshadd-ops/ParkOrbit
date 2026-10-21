"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type * as LeafletTypes from "leaflet";
import type * as ReactLeafletTypes from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoJsonObject } from "geojson";
import type { EnrichedListing } from "@/lib/db";
import { PUNE_BOUNDARY_GEOJSON } from "@/lib/pune-geojson";
import { formatInr, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Compass,
  Navigation,
  Star,
  RotateCcw,
  Maximize2,
} from "lucide-react";

export interface DriverDiscoveryMapProps {
  listings: EnrichedListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchCenter?: { lat: number; lng: number; label: string } | null;
  onUseBrowserLocation?: () => void;
  geoStatus?: string | null;
  geoJsonData?: GeoJsonObject | null;
  geoJsonUrl?: string;
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
  geoStatus,
  geoJsonData = PUNE_BOUNDARY_GEOJSON,
  geoJsonUrl,
  className,
}: DriverDiscoveryMapProps) {
  const [mods, setMods] = useState<LoadedModules | null>(null);
  const [fetchedGeoJson, setFetchedGeoJson] = useState<GeoJsonObject | null>(
    null
  );
  const [showBoundary, setShowBoundary] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);

  const activeListing =
    listings.find((l) => l.id === selectedId) || listings[0] || null;

  // 1. Dynamically load Leaflet & React-Leaflet on client (SSR-safe)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let isMounted = true;

    Promise.all([import("leaflet"), import("react-leaflet")]).then(
      ([leafletModule, rlModule]) => {
        if (!isMounted) return;
        const L = (leafletModule.default ||
          leafletModule) as typeof LeafletTypes;
        setMods({ L, RL: rlModule });
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Optional external GeoJSON URL loader
  useEffect(() => {
    if (!geoJsonUrl) {
      setFetchedGeoJson(null);
      return;
    }
    let active = true;
    fetch(geoJsonUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json) {
          setFetchedGeoJson(json);
        }
      })
      .catch(() => {
        // Fallback to inline Pune boundary GeoJSON
      });
    return () => {
      active = false;
    };
  }, [geoJsonUrl]);

  const activeBoundary = fetchedGeoJson || geoJsonData;

  const initialCenter: [number, number] = useMemo(
    () =>
      searchCenter ? [searchCenter.lat, searchCenter.lng] : PUNE_CENTER,
    [searchCenter]
  );

  // Inner React-Leaflet helper components bound to useMap()
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
      data,
      trigger,
      skipInitial,
    }: {
      data: GeoJsonObject | null;
      trigger: number;
      skipInitial?: boolean;
    }) {
      const map = useMap();
      useEffect(() => {
        if (!data) return;
        const layer = L.geoJSON(data);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.setMaxBounds(bounds.pad(0.35));
          if (!skipInitial || trigger > 0) {
            map.fitBounds(bounds, { padding: [20, 20] });
          }
        }
        map.invalidateSize();
      }, [data, trigger, skipInitial, map]);
      return null;
    }

    function ViewportController({
      center,
      selected,
      resetCount,
    }: {
      center?: { lat: number; lng: number; label: string } | null;
      selected: EnrichedListing | null;
      resetCount: number;
    }) {
      const map = useMap();

      useEffect(() => {
        if (!center) return;
        map.flyTo([center.lat, center.lng], 13, {
          duration: 0.9,
          easeLinearity: 0.25,
        });
      }, [center?.lat, center?.lng, map]);

      useEffect(() => {
        if (!selected) return;
        map.panTo([selected.latitude, selected.longitude], {
          animate: true,
          duration: 0.4,
        });
      }, [selected?.id, selected?.latitude, selected?.longitude, map]);

      useEffect(() => {
        if (resetCount === 0) return;
        map.flyTo(PUNE_CENTER, 12, { duration: 0.8 });
      }, [resetCount, map]);

      return null;
    }

    return { InvalidateSize, FitBounds, ViewportController };
  }, [mods]);

  const handleResetView = useCallback(() => {
    setResetTrigger((prev) => prev + 1);
  }, []);

  const handleFitBoundary = useCallback(() => {
    setShowBoundary(true);
    setFitTrigger((prev) => prev + 1);
  }, []);

  return (
    <div
      className={cn(
        "relative w-full h-[460px] lg:h-[620px] rounded-stadium bg-[#191918] text-white overflow-hidden border border-ink/15 shadow-halo select-none",
        className
      )}
      style={{ height: "500px", width: "100%" }}
      data-testid="interactive-driver-discovery-map"
    >
      {/* React-Leaflet MapContainer with OpenStreetMap Tiles & Pune GeoJSON Boundary */}
      {mods && helpers && (
        <mods.RL.MapContainer
          center={initialCenter}
          zoom={12}
          minZoom={10}
          maxZoom={18}
          maxBounds={PUNE_METRO_BOUNDS}
          style={{ height: "100%", width: "100%" }}
          className="w-full h-full z-0"
        >
          <helpers.InvalidateSize />
          <helpers.ViewportController
            center={searchCenter}
            selected={activeListing}
            resetCount={resetTrigger}
          />

          <mods.RL.TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Administrative Boundary GeoJSON Layer + Auto-Fit Bounds */}
          {showBoundary && activeBoundary && (
            <>
              <mods.RL.GeoJSON
                data={activeBoundary}
                style={{
                  color: "#0055A4",
                  weight: 2,
                  fillColor: "#0055A4",
                  fillOpacity: 0.1,
                }}
              />
              <helpers.FitBounds
                data={activeBoundary}
                trigger={fitTrigger}
                skipInitial={Boolean(
                  searchCenter && searchCenter.label !== "Pune City Center"
                )}
              />
            </>
          )}

          {/* Search Center Radar Pulse Marker */}
          {searchCenter && (
            <mods.RL.Marker
              position={[searchCenter.lat, searchCenter.lng]}
              interactive={false}
              icon={mods.L.divIcon({
                className: "pko-radar-icon",
                html: `
                  <div class="relative flex items-center justify-center w-12 h-12">
                    <div class="absolute w-12 h-12 rounded-full bg-[#CF4500]/25 animate-ping"></div>
                    <div class="relative w-4 h-4 rounded-full bg-[#CF4500] border-2 border-white shadow-md"></div>
                  </div>
                `,
                iconSize: [48, 48],
                iconAnchor: [24, 24],
              })}
            />
          )}

          {/* Clickable CircleMarkers + Price Pin Badges with Tooltip & Popup */}
          {listings.map((listing) => {
            const isSelected = listing.id === selectedId;
            const isAvailable = listing.availability?.available ?? true;

            const markerHtml = `
              <div class="group relative inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 select-none cursor-pointer ${
                isSelected
                  ? "bg-[#CF4500] text-white shadow-xl scale-110 ring-4 ring-white/60 z-30"
                  : isAvailable
                    ? "bg-white text-[#141413] shadow-md hover:scale-105 hover:bg-[#FCFBFA] border border-black/10"
                    : "bg-[#262627] text-[#D1CDC7] border border-white/20 opacity-75"
              }">
                <span>₹${listing.hourlyRateInr}/hr</span>
                ${
                  listing.distanceKm != null
                    ? `<span class="text-[10px] opacity-75 font-normal">• ${listing.distanceKm}km</span>`
                    : ""
                }
              </div>
            `;

            const divIcon = mods.L.divIcon({
              className: "pko-marker-div-icon",
              html: markerHtml,
              iconSize: isSelected ? [88, 36] : [78, 32],
              iconAnchor: isSelected ? [44, 18] : [39, 16],
            });

            return (
              <React.Fragment key={listing.id}>
                <mods.RL.CircleMarker
                  center={[listing.latitude, listing.longitude]}
                  radius={isSelected ? 9 : 7}
                  pathOptions={{
                    color: isSelected ? "#CF4500" : "#d32f2f",
                    fillColor: isSelected ? "#F37338" : "#e53935",
                    fillOpacity: 0.9,
                  }}
                  eventHandlers={{
                    click: () => onSelect(listing.id),
                  }}
                >
                  <mods.RL.Tooltip direction="top" offset={[0, -10]}>
                    <span>
                      {listing.title} — ₹{listing.hourlyRateInr}/hr
                    </span>
                  </mods.RL.Tooltip>
                  <mods.RL.Popup>
                    <div className="space-y-1 text-xs min-w-[180px]">
                      <div className="font-bold text-[#141413]">
                        {listing.title}
                      </div>
                      <div className="text-[#595550]">
                        {listing.locality}, Pune
                      </div>
                      <div className="font-semibold text-[#CF4500]">
                        ₹{listing.hourlyRateInr}/hr • ₹{listing.dailyRateInr}/day
                      </div>
                    </div>
                  </mods.RL.Popup>
                </mods.RL.CircleMarker>

                <mods.RL.Marker
                  position={[listing.latitude, listing.longitude]}
                  icon={divIcon}
                  zIndexOffset={isSelected ? 1000 : 100}
                  eventHandlers={{
                    click: () => onSelect(listing.id),
                  }}
                >
                  <mods.RL.Popup>
                    <div className="space-y-1.5 text-xs min-w-[190px]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#CF4500]">
                        {listing.locality}, Pune
                      </div>
                      <div className="font-bold text-[#141413]">
                        {listing.title}
                      </div>
                      <div className="text-[#595550]">
                        <strong>{formatInr(listing.hourlyRateInr)}</strong>/hr •{" "}
                        {formatInr(listing.dailyRateInr)}/day
                      </div>
                      <Link
                        href={`/listings/${listing.id}`}
                        className="inline-block mt-1 font-semibold text-[#0055A4] underline"
                      >
                        Inspect & Reserve →
                      </Link>
                    </div>
                  </mods.RL.Popup>
                </mods.RL.Marker>
              </React.Fragment>
            );
          })}
        </mods.RL.MapContainer>
      )}

      {/* Top Header Overlay Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 rounded-pill bg-[#141413]/90 backdrop-blur-md border border-white/15 px-3.5 py-1.5 text-xs pointer-events-auto shadow-md">
          <Compass className="size-3.5 text-[#F37338]" />
          <span className="font-medium text-[#F3F0EE]">
            {searchCenter ? searchCenter.label : "Pune City Center"}
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={handleFitBoundary}
            className="inline-flex items-center gap-1.5 rounded-pill bg-[#0055A4] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#004488] transition-colors shadow-sm"
            title="Fit map to Pune GeoJSON Boundary"
          >
            <Maximize2 className="size-3" />
            <span className="hidden sm:inline">Pune Boundary</span>
          </button>

          {onUseBrowserLocation && (
            <button
              type="button"
              onClick={onUseBrowserLocation}
              className="inline-flex items-center gap-1.5 rounded-pill bg-white text-[#141413] px-3 py-1.5 text-xs font-semibold hover:bg-[#F3F0EE] transition-colors shadow-sm"
              title="Locate nearest parking via GPS"
            >
              <Navigation className="size-3 text-[#CF4500]" />
              <span>Near Me</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetView}
            className="inline-flex items-center justify-center size-8 rounded-pill bg-[#141413]/90 text-white hover:bg-black border border-white/15 transition-colors shadow-sm"
            title="Reset Map to Pune Center"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {geoStatus && (
        <div className="absolute top-14 left-4 z-20 rounded-pill bg-[#141413]/85 border border-white/15 px-3 py-1 text-[11px] text-[#D1CDC7]">
          {geoStatus}
        </div>
      )}

      {/* Bottom Selected Listing Preview Card */}
      {activeListing && (
        <div className="absolute bottom-4 left-4 right-4 z-30 rounded-[24px] bg-white text-[#141413] p-4 shadow-halo flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-black/10">
          <div className="flex items-center gap-3.5">
            {/* Circular portrait thumbnail */}
            <div className="relative size-14 sm:size-16 rounded-full overflow-hidden shrink-0 border-2 border-[#E8E2DA] bg-[#E8E2DA]">
              <img
                src={
                  activeListing.photos[0]?.url ||
                  "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=900&q=80"
                }
                alt={activeListing.title}
                className="size-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#CF4500]">
                  • {activeListing.locality}, Pune
                </span>
                {activeListing.isDemo && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    DEMO
                  </Badge>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141413]">
                  <Star className="size-3 fill-[#CF4500] text-[#CF4500]" />
                  {activeListing.ratingAvg.toFixed(2)} ({activeListing.reviewCount})
                </span>
              </div>

              <h4 className="text-sm font-semibold tracking-tight text-[#141413] line-clamp-1">
                {activeListing.title}
              </h4>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[#595550]">
                <span>
                  <strong className="text-[#141413]">
                    {formatInr(activeListing.hourlyRateInr)}
                  </strong>
                  /hr • {formatInr(activeListing.dailyRateInr)}/day
                </span>
                {activeListing.distanceKm != null && (
                  <span>• {activeListing.distanceKm} km away</span>
                )}
              </div>
            </div>
          </div>

          {/* Inspect & Reserve Link CTA */}
          <Link
            href={`/listings/${activeListing.id}`}
            aria-label={`Inspect ${activeListing.title}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#141413] text-[#F3F0EE] px-4 py-2 text-xs font-semibold hover:bg-[#262627] shrink-0 transition-colors shadow-sm"
          >
            <span>Reserve Spot</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default DriverDiscoveryMap;
