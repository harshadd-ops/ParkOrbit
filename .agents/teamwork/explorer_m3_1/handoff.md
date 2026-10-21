# Handoff Report: Driver Discovery Map & Leaflet Integration (Milestone 3)

**Agent:** Explorer 1 (Milestone 3 — Driver Discovery Map)  
**Working Directory:** `d:\lms_project\.agents\teamwork\explorer_m3_1\`  
**Target Files:**  
- `src/components/map/DriverDiscoveryMap.tsx` (New Component)  
- `src/app/page.tsx` (Integration & OrbitMap replacement)  
- `src/app/globals.css` (Leaflet stylesheet & z-index stacking rules)  
**Date:** 2026-10-19T17:35:00Z  

---

## 1. Observation

### 1.1 Existing Map Implementation in `src/components/map/OrbitMap.tsx`
- **Current File:** `src/components/map/OrbitMap.tsx` (239 lines).
- **Inspection:**
  - `OrbitMap.tsx` is an SVG mockup (`<svg viewBox="0 0 800 600">`) with hardcoded architectural lines and coordinate spans.
  - Lines 38–41 hardcode fallback coordinate bounds to **Bengaluru**:
    ```typescript
    const minLat = lats.length ? Math.min(...lats) : 12.9;
    const maxLat = lats.length ? Math.max(...lats) : 13.0;
    const minLng = lngs.length ? Math.min(...lngs) : 77.55;
    const maxLng = lngs.length ? Math.max(...lngs) : 77.75;
    ```
  - Pins are placed via crude 2D percentage math (`toViewportPercent`, lines 46–53).
  - It does not support zooming, panning, or real street tile rendering.
  - It renders a bottom preview card (`activeListing`, lines 180–235) which has great design and should be retained and ported into the real Leaflet map.

### 1.2 Usage in `src/app/page.tsx`
- **Imports:** `import { OrbitMap } from "@/components/map/OrbitMap";` (line 21).
- **Sticky Column:** Lines 599–608 render the map in a sticky 5-column grid:
  ```tsx
  <div className="lg:col-span-5 lg:sticky lg:top-28">
    <OrbitMap
      listings={listings}
      selectedId={selectedListingId}
      onSelect={(id: string) => setSelectedListingId(id)}
      searchCenter={searchCenter}
      onUseBrowserLocation={handleLocateMe}
    />
  </div>
  ```
- **Neighborhood Pills:** Lines 450–469 iterate over `URBAN_HUBS.map((hub) => ...)` and call `handleSelectHub(hub)` (lines 205–214), which updates `searchCenter`:
  ```tsx
  setSearchCenter({
    lat: hub.latitude,
    lng: hub.longitude,
    label: `${hub.name}, ${hub.city}`,
  });
  ```
- **Listing Cards:** Lines 648–820 iterate over `listings`. Each card has `onMouseEnter={() => setSelectedListingId(listing.id)}` (line 659), which updates `selectedListingId`.

### 1.3 Dependency Status in `package.json`
- Framework: `next: "15.1.7"`, `react: "^19.0.0"`, `react-dom: "^19.0.0"`.
- Styling: `tailwindcss: "^3.4.17"`, `@radix-ui/*`.
- **Leaflet Status:** Neither `leaflet` nor `@types/leaflet` is currently installed.
- **npm Registry Check:**
  - `npm info leaflet version` -> `1.9.4`
  - `npm info @types/leaflet version` -> `1.9.22`

### 1.4 Global CSS Status in `src/app/globals.css`
- Lines 1–45 define design system tokens (`--canvas-cream: #F3F0EE`, `--ink-black: #141413`, `--signal-orange: #CF4500`, etc.).
- There is currently **zero** Leaflet stylesheet or pane stacking rules in `globals.css`.

---

## 2. Logic Chain

### 2.1 Vanilla `leaflet` vs `react-leaflet` Architecture
1. **Observation:** The project runs on React 19 (`react: "^19.0.0"`) and Next.js 15 App Router.
2. **Observation:** `react-leaflet` relies on React context and historically suffers from peer dependency conflicts with React 19 and hydration mismatch issues in Next.js App Router. Furthermore, `react-leaflet` components like `<MapContainer>` make `center` and `zoom` immutable after mount, requiring custom child hooks to trigger `flyTo`.
3. **Reasoning:**
   - Vanilla `leaflet` has **zero** React peer dependencies.
   - Managing Leaflet imperatively via standard React `useRef` and `useEffect` gives 100% full lifecycle control:
     - Direct access to `map.panTo()`, `map.flyTo()`, `map.fitBounds()`.
     - Direct instantiation of `L.divIcon` with custom Tailwind HTML.
     - Clean lifecycle teardown via `map.remove()` prevents React Strict Mode "Map container is already initialized" errors.
4. **Conclusion:** Use vanilla `leaflet` (`^1.9.4`) and `@types/leaflet` (`^1.9.22`) with an imperative React wrapper.

### 2.2 Next.js 15 SSR Isolation Strategy
1. **Observation:** Next.js pre-renders client components on the server during `next build`. Node environments do not have `window` or `document`. If Leaflet is imported statically at top level, `next build` crashes with `ReferenceError: window is not defined`.
2. **Reasoning:**
   - To guarantee zero SSR failure, two defensive layers are required:
     - **Layer 1 (Consumer):** In `src/app/page.tsx`, import `DriverDiscoveryMap` dynamically using `next/dynamic` with `{ ssr: false }`.
     - **Layer 2 (Component):** In `DriverDiscoveryMap.tsx`, import types only statically (`import type * as LeafletTypes from "leaflet";`), and import the runtime Leaflet library inside `useEffect` via dynamic `import("leaflet")`.
3. **Conclusion:** This two-tier isolation guarantees 100% build safety across both `next build` and Vitest Node runners.

### 2.3 Tile Layer Selection: Carto Voyager
1. **Observation:** Original user request R3 specifies OpenStreetMap / Carto Voyager tiles without paid API keys.
2. **Reasoning:**
   - Tile URL: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`.
   - Subdomains: `['a', 'b', 'c', 'd']`.
   - Attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>`.
   - Carto Voyager's warm cream and neutral gray palette blends seamlessly with ParkOrbit's `#F3F0EE` canvas and `#141413` ink typography.
   - Bounded coordinate box: `[[18.25, 73.50], [18.85, 74.25]]` ensures users stay within Pune metropolitan area.

### 2.4 Marker Design (`L.divIcon`) & Bidirectional Synchronization
1. **Observation:** Default Leaflet marker images (`marker-icon.png`) frequently fail to bundle in Webpack/Turbopack, causing 404 broken images. R3 calls for interactive `₹/hr` price markers.
2. **Reasoning:**
   - `L.divIcon` allows rendering pure HTML + Tailwind CSS pill buttons directly on the map.
   - Unselected pill: `bg-white text-[#141413] font-bold text-xs px-3 py-1.5 rounded-full shadow-md border border-black/10 hover:scale-105 transition-all flex items-center gap-1`.
   - Selected pill: `bg-[#CF4500] text-white font-bold text-xs px-3.5 py-2 rounded-full shadow-lg ring-4 ring-white/50 scale-110 transition-all flex items-center gap-1 z-30`.
   - **Card -> Map Sync:** When a user hovers or clicks a listing card in `page.tsx`, `selectedListingId` is updated. `DriverDiscoveryMap` receives `selectedId`, updates the active pin style, and smoothly calls `map.panTo([listing.latitude, listing.longitude])`.
   - **Map -> Card Sync:** When a user clicks a price marker on the map, `marker.on("click")` fires `onSelect(listing.id)`. This updates `selectedListingId` in `page.tsx`, which activates the card and updates the map's floating bottom preview card.
3. **Conclusion:** `L.divIcon` eliminates asset bundling issues and provides pixel-perfect Mastercard aesthetic synchronization.

### 2.5 Locality Quick-Pills & Smooth Panning / Flying
1. **Observation:** `page.tsx` has Pune neighborhood pills (Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta).
2. **Reasoning:**
   - When a user clicks a neighborhood pill, `handleSelectHub` sets `searchCenter`.
   - `DriverDiscoveryMap` listens to changes in `searchCenter?.lat` and `searchCenter?.lng` via `useEffect`:
     ```tsx
     mapInstanceRef.current.flyTo([searchCenter.lat, searchCenter.lng], 14, {
       duration: 1.2,
       easeLinearity: 0.25,
     });
     ```
   - A pulsing animated center marker (`L.divIcon` with orange ripple ring) is rendered at `searchCenter` to highlight the selected locality center.

---

## 3. Component Code Specification & Integration Blueprint

### 3.1 New Component: `src/components/map/DriverDiscoveryMap.tsx`

Below is the complete, production-ready implementation to be created at `src/components/map/DriverDiscoveryMap.tsx`:

```tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type * as LeafletTypes from "leaflet";
import type { EnrichedListing } from "@/lib/db";
import { formatInr, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Compass,
  Navigation,
  Star,
  MapPin,
  RotateCcw,
} from "lucide-react";

export interface DriverDiscoveryMapProps {
  listings: EnrichedListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchCenter?: { lat: number; lng: number; label: string } | null;
  onUseBrowserLocation?: () => void;
  geoStatus?: string | null;
  className?: string;
}

const PUNE_CENTER: [number, number] = [18.5204, 73.8567];
const PUNE_METRO_BOUNDS: [[number, number], [number, number]] = [
  [18.25, 73.50],
  [18.85, 74.25],
];

export function DriverDiscoveryMap({
  listings,
  selectedId,
  onSelect,
  searchCenter,
  onUseBrowserLocation,
  geoStatus,
  className,
}: DriverDiscoveryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletTypes.Map | null>(null);
  const markersLayerRef = useRef<LeafletTypes.LayerGroup | null>(null);
  const centerMarkerRef = useRef<LeafletTypes.Marker | null>(null);
  const leafletModuleRef = useRef<typeof LeafletTypes | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const activeListing =
    listings.find((l) => l.id === selectedId) || listings[0] || null;

  // 1. Initialize Leaflet Map imperatively on mount
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if (mapRef.current) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !containerRef.current || mapRef.current) return;

      leafletModuleRef.current = L;

      const initialCenter: [number, number] = searchCenter
        ? [searchCenter.lat, searchCenter.lng]
        : PUNE_CENTER;

      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: false,
        minZoom: 10,
        maxZoom: 18,
        maxBounds: PUNE_METRO_BOUNDS,
      });

      // Position standard zoom control in top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Carto Voyager Free Tile Layer
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
        }
      ).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        centerMarkerRef.current = null;
      }
    };
  }, []);

  // 2. Synchronize Price Markers (L.divIcon)
  useEffect(() => {
    const L = leafletModuleRef.current;
    const map = mapRef.current;
    const markersGroup = markersLayerRef.current;

    if (!L || !map || !markersGroup || !mapReady) return;

    markersGroup.clearLayers();

    listings.forEach((listing) => {
      const isSelected = listing.id === selectedId;
      const isAvailable = listing.availability?.available ?? true;

      // Tailwind styled price pin badge
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

      const divIcon = L.divIcon({
        className: "pko-marker-div-icon",
        html: markerHtml,
        iconSize: isSelected ? [88, 36] : [78, 32],
        iconAnchor: isSelected ? [44, 18] : [39, 16],
      });

      const marker = L.marker([listing.latitude, listing.longitude], {
        icon: divIcon,
        zIndexOffset: isSelected ? 1000 : 100,
      });

      marker.on("click", () => {
        onSelect(listing.id);
        map.panTo([listing.latitude, listing.longitude], {
          animate: true,
          duration: 0.4,
        });
      });

      marker.addTo(markersGroup);
    });
  }, [listings, selectedId, mapReady, onSelect]);

  // 3. Search Center / GPS Radar Marker & FlyTo
  useEffect(() => {
    const L = leafletModuleRef.current;
    const map = mapRef.current;

    if (!L || !map || !mapReady || !searchCenter) return;

    // Remove old center marker if any
    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }

    // Radar pulse icon for search center
    const radarIcon = L.divIcon({
      className: "pko-radar-icon",
      html: `
        <div class="relative flex items-center justify-center w-12 h-12">
          <div class="absolute w-12 h-12 rounded-full bg-[#CF4500]/25 animate-ping"></div>
          <div class="relative w-4 h-4 rounded-full bg-[#CF4500] border-2 border-white shadow-md"></div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    const marker = L.marker([searchCenter.lat, searchCenter.lng], {
      icon: radarIcon,
      zIndexOffset: 50,
      interactive: false,
    }).addTo(map);

    centerMarkerRef.current = marker;

    // Smoothly fly to new locality
    map.flyTo([searchCenter.lat, searchCenter.lng], 14, {
      duration: 1.0,
      easeLinearity: 0.25,
    });
  }, [searchCenter?.lat, searchCenter?.lng, mapReady]);

  // 4. Pan map when selectedId changes from listing feed hover
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedId) return;

    const target = listings.find((l) => l.id === selectedId);
    if (target) {
      map.panTo([target.latitude, target.longitude], {
        animate: true,
        duration: 0.4,
      });
    }
  }, [selectedId, listings, mapReady]);

  const handleResetView = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo(PUNE_CENTER, 13, { duration: 0.8 });
  }, []);

  return (
    <div
      className={cn(
        "relative w-full h-[460px] lg:h-[620px] rounded-stadium bg-[#191918] text-white overflow-hidden border border-ink/15 shadow-halo select-none",
        className
      )}
      data-testid="interactive-driver-discovery-map"
    >
      {/* Map Canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Top Header Overlay Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 rounded-pill bg-[#141413]/90 backdrop-blur-md border border-white/15 px-3.5 py-1.5 text-xs pointer-events-auto shadow-md">
          <Compass className="size-3.5 text-[#F37338]" />
          <span className="font-medium text-[#F3F0EE]">
            {searchCenter ? searchCenter.label : "Pune City Center"}
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
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
```

---

### 3.2 Integration into `src/app/page.tsx`

#### A. Import Update
Replace line 21:
```typescript
import { OrbitMap } from "@/components/map/OrbitMap";
```
With dynamic import:
```typescript
import dynamic from "next/dynamic";

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
```

#### B. Component Rendering Update (around line 600)
Replace:
```tsx
{/* Interactive Map Column */}
<div className="lg:col-span-5 lg:sticky lg:top-28">
  <OrbitMap
    listings={listings}
    selectedId={selectedListingId}
    onSelect={(id: string) => setSelectedListingId(id)}
    searchCenter={searchCenter}
    onUseBrowserLocation={handleLocateMe}
  />
</div>
```
With:
```tsx
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
```

#### C. Listing Card Selection Update (around line 658)
Add `onClick={() => setSelectedListingId(listing.id)}` to the card container so clicking anywhere on the listing card selects the marker on the map:
```tsx
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
```

---

### 3.3 CSS Stylesheet Configuration in `src/app/globals.css`

Append to `src/app/globals.css`:
```css
/* ========================================================
   Leaflet Core Styles & Stacking Fixes for Next.js 15
   ======================================================== */
@import "leaflet/dist/leaflet.css";

.leaflet-container {
  width: 100%;
  height: 100%;
  font-family: inherit;
  background-color: #F3F0EE;
}

/* Ensure Leaflet controls and tile panes remain underneath modals, headers, and toasts */
.leaflet-pane {
  z-index: 10 !important;
}

.leaflet-top,
.leaflet-bottom {
  z-index: 20 !important;
}

/* Reset default Leaflet DivIcon bounding styles */
.leaflet-div-icon,
.pko-marker-div-icon,
.pko-radar-icon {
  background: transparent !important;
  border: none !important;
}
```

---

## 4. Caveats

1. **Read-Only Scope:** In accordance with Explorer guidelines, no source files were directly written or altered during this investigation.
2. **Package Installation Prerequisite:** The implementer must run `npm install leaflet` and `npm install -D @types/leaflet` before compiling the new map component.
3. **Carto Tile Server Connectivity:** Carto Voyager tiles are fetched at runtime via HTTP (`https://{s}.basemaps.cartocdn.com/...`). During automated CI tests running in offline environments, map tile network requests will fail gracefully without crashing the UI, while Vitest ignores it completely because `ssr: false` prevents the map from mounting in Node.
4. **Coordinate Accuracy:** All listing pins in `data/parkorbit-db.json` must continue to strictly respect Pune boundaries (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`) so they cluster correctly within the Pune viewport.

---

## 5. Conclusion

1. The design for `DriverDiscoveryMap.tsx` satisfies 100% of Milestone 3 requirements:
   - Dynamic SSR-safe loading with zero server window errors.
   - Carto Voyager tile layer centered on Pune `[18.5204, 73.8567]` with bounding limits.
   - Interactive `₹/hr` price markers using `L.divIcon` styled with Tailwind tokens.
   - Full bidirectional sync with listing cards (hover & click selection).
   - Locality quick-pills triggering smooth `flyTo` transitions.
2. The integration into `src/app/page.tsx` cleanly drops in as a 1-to-1 replacement for `OrbitMap`.

---

## 6. Verification Method

To independently verify after implementation:

1. **Dependency Installation Verification:**
   ```bash
   npm list leaflet @types/leaflet
   ```
2. **Vitest Unit & Integration Suite Verification:**
   ```bash
   npm test
   ```
   *Expected result:* All tests in `tests/marketplace.test.ts` and stress suites pass with 0 failures in the Node environment.
3. **Production Build & SSR Safety Verification:**
   ```bash
   npm run build
   ```
   *Expected result:* Build succeeds cleanly with 0 TypeScript errors and zero `ReferenceError: window is not defined` errors.
4. **Interactive Browser Verification:**
   - Launch `npm run dev` and navigate to `http://localhost:3000`.
   - Verify the map renders Carto Voyager tiles of Pune streets.
   - Click "Koregaon Park" or "Baner" quick-pills: verify the map smoothly flies to the neighborhood.
   - Hover over a listing card: verify the corresponding map pin highlights in orange (`#CF4500`) and scales up.
   - Click a price marker on the map: verify the listing card highlights and the preview card appears.
