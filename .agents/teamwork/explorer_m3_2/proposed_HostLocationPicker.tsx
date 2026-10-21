"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Compass, Navigation, RotateCcw } from "lucide-react";
import type L from "leaflet";

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

export function HostLocationPicker({
  latitude,
  longitude,
  locality,
  city = "Pune",
  onChange,
  className = "",
}: HostLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number }>({
    lat: latitude || 18.5362,
    lng: longitude || 73.8940,
  });
  const [activePreset, setActivePreset] = useState<string | null>(
    locality || "Koregaon Park"
  );

  // Initialize Leaflet dynamically inside useEffect to ensure SSR immunity
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    let isMounted = true;

    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous map if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialLat = latitude || 18.5362;
      const initialLng = longitude || 73.8940;

      // Create Leaflet Map Instance
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: [
          [18.30, 73.60], // Southwest boundary
          [18.75, 74.15], // Northeast boundary
        ],
        zoomControl: true,
        attributionControl: true,
      });

      // Carto Voyager Tiles (Crisp, warm aesthetic, no paid API key)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Custom Draggable Pin Icon using L.divIcon
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

      // Create Draggable Marker
      const marker = L.marker([initialLat, initialLng], {
        icon: pinIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      // Event: Real-time update while dragging
      marker.on("drag", () => {
        const pos = marker.getLatLng();
        setLiveCoords({
          lat: Number(pos.lat.toFixed(4)),
          lng: Number(pos.lng.toFixed(4)),
        });
      });

      // Event: Commit location when drag finishes
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        const roundedLat = Number(pos.lat.toFixed(4));
        const roundedLng = Number(pos.lng.toFixed(4));
        setLiveCoords({ lat: roundedLat, lng: roundedLng });
        onChangeRef.current({
          latitude: roundedLat,
          longitude: roundedLng,
        });
      });

      // Event: Click-to-pin anywhere on the map
      map.on("click", (e: L.LeafletMouseEvent) => {
        const roundedLat = Number(e.latlng.lat.toFixed(4));
        const roundedLng = Number(e.latlng.lng.toFixed(4));
        marker.setLatLng([roundedLat, roundedLng]);
        setLiveCoords({ lat: roundedLat, lng: roundedLng });
        map.panTo([roundedLat, roundedLng], { animate: true, duration: 0.3 });
        onChangeRef.current({
          latitude: roundedLat,
          longitude: roundedLng,
        });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate size to ensure proper tile rendering in flex/grid layouts
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Sync external prop changes (e.g. typing directly into latitude/longitude inputs)
  useEffect(() => {
    if (!markerRef.current || !mapInstanceRef.current) return;
    const currentPos = markerRef.current.getLatLng();
    const latDiff = Math.abs(currentPos.lat - latitude);
    const lngDiff = Math.abs(currentPos.lng - longitude);

    if (latDiff > 0.0001 || lngDiff > 0.0001) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude], {
        animate: true,
        duration: 0.3,
      });
      setLiveCoords({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  // Handle Preset Selection
  const handleSelectPreset = useCallback((preset: PunePreset) => {
    setActivePreset(preset.name);
    setLiveCoords({ lat: preset.lat, lng: preset.lng });

    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([preset.lat, preset.lng]);
      mapInstanceRef.current.flyTo([preset.lat, preset.lng], 15, {
        duration: 0.8,
      });
    }

    onChangeRef.current({
      latitude: preset.lat,
      longitude: preset.lng,
      locality: preset.locality,
      landmark: preset.landmark,
      city: "Pune",
      pincode: preset.pincode,
    });
  }, []);

  // Recenter to Pune City Center Hub
  const handleRecenterCity = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([18.5204, 73.8567], 13, { duration: 0.6 });
    }
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
      <div className="relative w-full h-[360px] sm:h-[400px] rounded-[24px] overflow-hidden border border-black/12 shadow-sm bg-[#F3F0EE]">
        {/* Leaflet DOM Anchor */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

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

        {/* Recenter to Pune Button (Top-Right) */}
        <button
          type="button"
          onClick={handleRecenterCity}
          className="absolute top-3 right-3 z-[15] bg-white/95 hover:bg-white text-[#141413] shadow-md px-2.5 py-1.5 rounded-xl text-xs font-medium border border-black/10 flex items-center gap-1.5 transition-colors"
          title="Recenter view to Pune Central Hub"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#F37338]" />
          <span className="hidden sm:inline">Recenter Pune</span>
        </button>

        {/* Bottom Helper Bar */}
        <div className="absolute bottom-2 left-3 right-3 z-[15] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-black/8 flex items-center justify-between text-[11px] text-[#595550]">
          <span className="flex items-center gap-1">
            <Navigation className="w-3 h-3 text-[#F37338]" />
            <span>Interactive OpenStreetMap + Carto Voyager Tiles</span>
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
