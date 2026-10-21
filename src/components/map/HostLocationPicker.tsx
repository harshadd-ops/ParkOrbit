"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type * as LeafletTypes from "leaflet";
import type * as ReactLeafletTypes from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoJsonObject } from "geojson";
import { Compass, Navigation, RotateCcw } from "lucide-react";
import { PUNE_BOUNDARY_GEOJSON } from "@/lib/pune-geojson";

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
  geoJsonData?: GeoJsonObject | null;
  geoJsonUrl?: string;
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
  city = "Pune",
  geoJsonData = PUNE_BOUNDARY_GEOJSON,
  geoJsonUrl,
  onChange,
  className = "",
}: HostLocationPickerProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [mods, setMods] = useState<LoadedModules | null>(null);
  const [fetchedGeoJson, setFetchedGeoJson] = useState<GeoJsonObject | null>(
    null
  );
  const [fitTrigger, setFitTrigger] = useState(0);
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
        setMods({ L, RL: rlModule });
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  // Optional GeoJSON URL loader
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

  // Sync external prop changes
  useEffect(() => {
    const latDiff = Math.abs(liveCoords.lat - latitude);
    const lngDiff = Math.abs(liveCoords.lng - longitude);
    if (latDiff > 0.0001 || lngDiff > 0.0001) {
      setLiveCoords({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  const activeBoundary = fetchedGeoJson || geoJsonData;

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

    function FitBounds({
      data,
      trigger,
    }: {
      data: GeoJsonObject | null;
      trigger: number;
    }) {
      const map = useMap();
      useEffect(() => {
        if (!data) return;
        const layer = L.geoJSON(data);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.setMaxBounds(bounds.pad(0.35));
          if (trigger > 0) {
            map.fitBounds(bounds, { padding: [20, 20] });
          }
        }
        map.invalidateSize();
      }, [data, trigger, map]);
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
          const roundedLat = Number(e.latlng.lat.toFixed(4));
          const roundedLng = Number(e.latlng.lng.toFixed(4));
          map.panTo([roundedLat, roundedLng], { animate: true, duration: 0.3 });
          onPick(roundedLat, roundedLng);
        },
      });

      useEffect(() => {
        map.panTo([coords.lat, coords.lng], { animate: true, duration: 0.3 });
      }, [coords.lat, coords.lng, map]);

      return null;
    }

    const pinIcon = L.divIcon({
      className: "custom-host-pin-icon",
      html: `
        <div class="relative -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-auto cursor-grab active:cursor-grabbing select-none group">
          <div class="bg-[#F37338] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg border-2 border-white flex items-center gap-1.5 whitespace-nowrap transform group-hover:scale-105 transition-transform">
            <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span>Your Spot Pin</span>
          </div>
          <div class="w-3 h-3 bg-[#F37338] rotate-45 -mt-1.5 border-r-2 border-b-2 border-white"></div>
          <div class="w-3.5 h-1.5 bg-black/35 rounded-full blur-[1px] mt-0.5"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    return { InvalidateSize, FitBounds, MapClickAndSync, pinIcon };
  }, [mods]);

  // Handle Preset Selection
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

  // Fit to Pune GeoJSON Boundary
  const handleRecenterCity = useCallback(() => {
    setFitTrigger((prev) => prev + 1);
  }, []);

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Pune Neighborhood Presets Quick-Selector Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#141413] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#F37338]" />
            <span>Pune Neighborhood Presets:</span>
          </span>
          <span className="text-[11px] text-[#595550]">
            Snaps pin & pre-fills locality
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? "bg-[#141413] text-white border-[#141413] shadow-sm scale-[1.02]"
                    : "bg-[#F3F0EE] hover:bg-[#E8E2DA] text-[#141413] border-black/8"
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Stadium Viewport Container */}
      <div
        className="relative w-full h-[360px] sm:h-[400px] rounded-[24px] overflow-hidden border border-black/12 shadow-sm bg-[#F3F0EE]"
        style={{ height: "400px", width: "100%" }}
      >
        {/* React-Leaflet MapContainer with OpenStreetMap Tiles & Pune GeoJSON Boundary */}
        {mods && helpers && (
          <mods.RL.MapContainer
            center={[liveCoords.lat, liveCoords.lng]}
            zoom={13}
            minZoom={10}
            maxZoom={18}
            maxBounds={TILE_FALLBACK_CONFIG.maxBounds}
            style={{ height: "100%", width: "100%" }}
            className="w-full h-full z-0"
          >
            <helpers.InvalidateSize />
            <helpers.MapClickAndSync
              coords={liveCoords}
              onPick={handlePickLocation}
            />

            <mods.RL.TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {activeBoundary && (
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
                />
              </>
            )}

            {/* Clickable CircleMarkers for Pune Neighborhood Hubs */}
            {PUNE_NEIGHBORHOOD_PRESETS.map((preset) => (
              <mods.RL.CircleMarker
                key={preset.name}
                center={[preset.lat, preset.lng]}
                radius={6}
                pathOptions={{
                  color: "#0055A4",
                  fillColor: "#0055A4",
                  fillOpacity: 0.65,
                }}
                eventHandlers={{
                  click: () => handleSelectPreset(preset),
                }}
              >
                <mods.RL.Tooltip direction="top" offset={[0, -6]}>
                  <span>
                    {preset.name} ({preset.tag})
                  </span>
                </mods.RL.Tooltip>
                <mods.RL.Popup>
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-[#141413]">
                      {preset.locality}, Pune
                    </div>
                    <div className="text-[#595550]">{preset.landmark}</div>
                    <div className="text-[#0055A4] font-semibold">
                      PIN: {preset.pincode}
                    </div>
                  </div>
                </mods.RL.Popup>
              </mods.RL.CircleMarker>
            ))}

            {/* Host Draggable Pin Marker */}
            <mods.RL.Marker
              position={[liveCoords.lat, liveCoords.lng]}
              icon={helpers.pinIcon}
              draggable={true}
              autoPan={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as LeafletTypes.Marker;
                  const pos = marker.getLatLng();
                  handlePickLocation(
                    Number(pos.lat.toFixed(4)),
                    Number(pos.lng.toFixed(4))
                  );
                },
              }}
            >
              <mods.RL.Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-[#141413]">
                    Your Pune Parking Spot
                  </div>
                  <div className="text-[#595550]">
                    {liveCoords.lat.toFixed(4)}° N, {liveCoords.lng.toFixed(4)}° E
                  </div>
                </div>
              </mods.RL.Popup>
            </mods.RL.Marker>
          </mods.RL.MapContainer>
        )}

        {/* Live Coordinate HUD Overlay (Top-Left) */}
        <div className="absolute top-3 left-3 z-[15] bg-[#141413]/90 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-white/10 text-xs space-y-1 pointer-events-auto max-w-[290px] sm:max-w-none">
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F37338] animate-pulse shrink-0" />
            <span className="truncate">
              Spot Pin: {liveCoords.lat.toFixed(4)}° N, {liveCoords.lng.toFixed(4)}° E
            </span>
          </div>
          <p className="text-[11px] text-[#D1CDC7] leading-snug">
            Pune, MH • Drag marker or click anywhere on map to pinpoint stall entrance
          </p>
        </div>

        {/* Fit to Pune GeoJSON Boundary Button (Top-Right) */}
        <button
          type="button"
          onClick={handleRecenterCity}
          className="absolute top-3 right-3 z-[15] bg-white/95 hover:bg-white text-[#141413] shadow-md px-2.5 py-1.5 rounded-xl text-xs font-medium border border-black/10 flex items-center gap-1.5 transition-colors"
          title="Fit view to Pune GeoJSON Boundary"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#F37338]" />
          <span className="hidden sm:inline">Fit Pune Boundary</span>
        </button>

        {/* Bottom Helper Bar */}
        <div className="absolute bottom-2 left-3 right-3 z-[15] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-black/8 flex items-center justify-between text-[11px] text-[#595550]">
          <span className="flex items-center gap-1">
            <Navigation className="w-3 h-3 text-[#F37338]" />
            <span>Interactive React-Leaflet + OpenStreetMap + GeoJSON Boundary</span>
          </span>
          <span className="font-medium text-[#141413]">
            Target City: {city || "Pune"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default HostLocationPicker;
