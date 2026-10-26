"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type * as LeafletTypes from "leaflet";
import type * as ReactLeafletTypes from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PunePreset {
  name: string;
  locality: string;
  landmark: string;
  lat: number;
  lng: number;
  pincode: string;
  tag: string;
}

export const PUNE_NEIGHBORHOOD_PRESETS: PunePreset[] = [
  {
    name: "Koregaon Park",
    locality: "Koregaon Park",
    landmark: "North Main Road & Lane 5",
    lat: 18.5362,
    lng: 73.8940,
    pincode: "411001",
    tag: "Cafes & Nightlife",
  },
  {
    name: "Baner",
    locality: "Baner",
    landmark: "Balewadi High Street Junction",
    lat: 18.5590,
    lng: 73.7868,
    pincode: "411045",
    tag: "Commercial & Tech",
  },
  {
    name: "Hinjewadi",
    locality: "Hinjewadi Phase 1",
    landmark: "Rajiv Gandhi Infotech Park & Shivaji Chowk",
    lat: 18.5913,
    lng: 73.7389,
    pincode: "411057",
    tag: "IT Mega Hub",
  },
  {
    name: "Kothrud",
    locality: "Kothrud",
    landmark: "Paud Road & Vanaz Metro Station",
    lat: 18.5074,
    lng: 73.8077,
    pincode: "411038",
    tag: "Metro & Culture",
  },
  {
    name: "Viman Nagar",
    locality: "Viman Nagar",
    landmark: "Phoenix Marketcity & Airport Road",
    lat: 18.5679,
    lng: 73.9143,
    pincode: "411014",
    tag: "Airport Hub & Retail",
  },
  {
    name: "FC Road",
    locality: "FC Road (Deccan)",
    landmark: "Fergusson College Rd & Goodluck Chowk",
    lat: 18.5222,
    lng: 73.8416,
    pincode: "411004",
    tag: "Heritage & Student Hub",
  },
  {
    name: "Wakad",
    locality: "Wakad",
    landmark: "Datta Mandir Road & Hinjewadi Flyover",
    lat: 18.5987,
    lng: 73.7686,
    pincode: "411057",
    tag: "Transit Hub",
  },
  {
    name: "Magarpatta",
    locality: "Magarpatta City",
    landmark: "Cybercity Tower & Destination Centre",
    lat: 18.5158,
    lng: 73.9272,
    pincode: "411028",
    tag: "Cybercity SEZ",
  },
];

export const OSM_TILE_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const CARTO_VOYAGER_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const TILE_FALLBACK_CONFIG = {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  draggable: true,
  autoPan: true,
  maxBounds: [
    [18.30, 73.60],
    [18.75, 74.15],
  ] as [[number, number], [number, number]],
};

export interface HostLocationPickerProps {
  latitude: number;
  longitude: number;
  locality?: string;
  city?: string;
  onChange: (location: {
    latitude: number;
    longitude: number;
    locality?: string;
    landmark?: string;
    city?: string;
    pincode?: string;
  }) => void;
  className?: string;
}

interface LoadedModules {
  L: typeof LeafletTypes;
  RL: typeof ReactLeafletTypes;
}

export function HostLocationPicker({
  latitude,
  longitude,
  locality,
  onChange,
  className = "",
}: HostLocationPickerProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [mods, setMods] = useState<LoadedModules | null>(null);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number }>({
    lat: latitude || 18.5362,
    lng: longitude || 73.8940,
  });
  const [activePreset, setActivePreset] = useState<string | null>(
    locality || "Koregaon Park"
  );

  // SSR-safe dynamic import of leaflet and react-leaflet
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

  // Sync external prop changes
  useEffect(() => {
    const latDiff = Math.abs(liveCoords.lat - latitude);
    const lngDiff = Math.abs(liveCoords.lng - longitude);
    if (latDiff > 0.0001 || lngDiff > 0.0001) {
      setLiveCoords({ lat: latitude, lng: longitude });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  const handlePickLocation = useCallback(
    (roundedLat: number, roundedLng: number) => {
      setLiveCoords({ lat: roundedLat, lng: roundedLng });
      onChangeRef.current({
        latitude: roundedLat,
        longitude: roundedLng,
      });
    },
    []
  );

  const helpers = useMemo(() => {
    if (!mods) return null;
    const { L, RL } = mods;
    const { useMap, useMapEvents } = RL;

    function InvalidateSize() {
      const map = useMap();
      useEffect(() => {
        map.invalidateSize();
        const timer = setTimeout(() => {
          map.invalidateSize();
        }, 180);

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

    function MapClickAndSync({
      coords,
      onPick,
    }: {
      coords: { lat: number; lng: number };
      onPick: (lat: number, lng: number) => void;
    }) {
      const map = useMapEvents({
        click(e) {
          onPick(Number(e.latlng.lat.toFixed(4)), Number(e.latlng.lng.toFixed(4)));
        },
      });

      useEffect(() => {
        map.panTo([coords.lat, coords.lng], { animate: true, duration: 0.4 });
      }, [coords.lat, coords.lng, map]);

      return null;
    }

    const pinIcon = L.divIcon({
      className: "custom-host-pin-icon",
      html: `
        <div class="relative -translate-x-1/2 -translate-y-full flex flex-col items-center cursor-grab active:cursor-grabbing select-none">
          <div class="w-11 h-11 rounded-full bg-[#141413] border-[3px] border-white shadow-xl flex items-center justify-center">
            <span class="w-3 h-3 rounded-full bg-[#F37338]"></span>
          </div>
          <div class="w-0.5 h-3 bg-[#141413]"></div>
          <div class="w-4 h-1.5 bg-black/25 rounded-full blur-[1px]"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    return { InvalidateSize, MapClickAndSync, pinIcon };
  }, [mods]);

  const handleSelectPreset = useCallback((preset: PunePreset) => {
    setActivePreset(preset.name);
    setLiveCoords({ lat: preset.lat, lng: preset.lng });

    onChangeRef.current({
      latitude: preset.lat,
      longitude: preset.lng,
      locality: preset.locality,
      landmark: preset.landmark,
      city: "Pune",
      pincode: preset.pincode,
    });
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
        {PUNE_NEIGHBORHOOD_PRESETS.map((preset) => {
          const isSelected =
            activePreset?.toLowerCase() === preset.name.toLowerCase() ||
            (Math.abs(liveCoords.lat - preset.lat) < 0.002 &&
              Math.abs(liveCoords.lng - preset.lng) < 0.002);

          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              aria-pressed={isSelected}
              className={cn(
                "shrink-0 rounded-pill px-4 py-2 text-[14px] font-medium whitespace-nowrap transition-colors",
                isSelected ? "bg-ink text-canvas" : "bg-canvas text-ink hover:bg-[#E8E2DA]"
              )}
            >
              {preset.name}
            </button>
          );
        })}
      </div>

      <div className="relative w-full h-[360px] md:h-[420px] rounded-stadium overflow-hidden bg-[#E8E2DA]">
        {mods && helpers && (
          <mods.RL.MapContainer
            center={[liveCoords.lat, liveCoords.lng]}
            zoom={15}
            minZoom={10}
            maxZoom={18}
            maxBounds={TILE_FALLBACK_CONFIG.maxBounds}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
            className="w-full h-full z-0"
          >
            <helpers.InvalidateSize />
            <helpers.MapClickAndSync coords={liveCoords} onPick={handlePickLocation} />

            {/* Carto now watermarks keyless requests, so use OSM tiles (softened in globals.css) */}
            <mods.RL.TileLayer
              url={OSM_TILE_URL}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <mods.RL.ZoomControl position="topright" />

            <mods.RL.Marker
              position={[liveCoords.lat, liveCoords.lng]}
              icon={helpers.pinIcon}
              draggable={TILE_FALLBACK_CONFIG.draggable}
              autoPan={TILE_FALLBACK_CONFIG.autoPan}
              eventHandlers={{
                dragend: (e) => {
                  const pos = (e.target as LeafletTypes.Marker).getLatLng();
                  handlePickLocation(Number(pos.lat.toFixed(4)), Number(pos.lng.toFixed(4)));
                },
              }}
            />
          </mods.RL.MapContainer>
        )}

        <div className="absolute bottom-4 left-4 z-[25] flex items-center gap-2 rounded-pill bg-white px-4 py-2.5 shadow-nav text-[13px]">
          <MapPin className="size-4 shrink-0" />
          <span className="sr-only">
            Spot Pin: {liveCoords.lat.toFixed(4)}, {liveCoords.lng.toFixed(4)}
          </span>
          <span aria-hidden="true">Drag the pin or tap the map</span>
        </div>
      </div>
    </div>
  );
}

export default HostLocationPicker;
