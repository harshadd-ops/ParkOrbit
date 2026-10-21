"use client";

import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoJsonObject } from "geojson";
import { PUNE_BOUNDARY_GEOJSON } from "@/lib/pune-geojson";

export interface BasicMapMarker {
  id?: string | number;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  priceInr?: number;
  locality?: string;
  onClick?: () => void;
}

export interface FitBoundsProps {
  data?: GeoJsonObject | null;
  lockBounds?: boolean;
}

export function FitBounds({ data, lockBounds = true }: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;
    const layer = L.geoJSON(data);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
      if (lockBounds) {
        map.setMaxBounds(bounds.pad(0.25));
      }
    }
    map.invalidateSize();
  }, [data, lockBounds, map]);

  return null;
}

export function InvalidateSize() {
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

export interface BasicMapProps {
  geoJsonData?: GeoJsonObject | null;
  geoJsonUrl?: string;
  markers?: BasicMapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string | number;
  boundaryStyle?: L.PathOptions;
  lockBounds?: boolean;
  className?: string;
}

export default function BasicMap({
  geoJsonData = PUNE_BOUNDARY_GEOJSON,
  geoJsonUrl,
  markers = [],
  center = [18.52, 73.85],
  zoom = 12,
  height = "500px",
  boundaryStyle = { color: "#0055A4", weight: 2, fillOpacity: 0.1 },
  lockBounds = true,
  className = "",
}: BasicMapProps) {
  const [fetchedGeoJson, setFetchedGeoJson] = useState<GeoJsonObject | null>(
    null
  );

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
        // Fallback to inline geoJsonData if fetch fails
      });
    return () => {
      active = false;
    };
  }, [geoJsonUrl]);

  const activeBoundary = fetchedGeoJson || geoJsonData;

  return (
    <div
      style={{ height, width: "100%" }}
      className={className}
      data-testid="react-leaflet-basic-map"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <InvalidateSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {activeBoundary && (
          <>
            <GeoJSON data={activeBoundary} style={boundaryStyle} />
            <FitBounds data={activeBoundary} lockBounds={lockBounds} />
          </>
        )}
        {markers.map((m, i) => (
          <CircleMarker
            key={m.id ?? i}
            center={[m.lat, m.lng]}
            radius={7}
            pathOptions={{
              color: "#d32f2f",
              fillColor: "#e53935",
              fillOpacity: 0.9,
            }}
            eventHandlers={
              m.onClick
                ? {
                    click: () => m.onClick?.(),
                  }
                : undefined
            }
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <span>
                {m.title}
                {m.priceInr != null ? ` (₹${m.priceInr}/hr)` : ""}
              </span>
            </Tooltip>
            <Popup>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-[#141413]">{m.title}</div>
                {m.locality && (
                  <div className="text-[#595550]">{m.locality}, Pune</div>
                )}
                {m.subtitle && (
                  <div className="text-[#595550]">{m.subtitle}</div>
                )}
                {m.priceInr != null && (
                  <div className="font-semibold text-[#CF4500]">
                    ₹{m.priceInr}/hr
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
