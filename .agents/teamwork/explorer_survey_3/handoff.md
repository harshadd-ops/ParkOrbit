# Handoff Report: Map Implementation & Leaflet Architecture for Pune City Revamp

**Agent:** Survey Explorer 3  
**Mission:** Comprehensive exploration of map implementation and Leaflet/OSM/Carto requirements  
**Date:** 2026-10-19T16:27:00Z  

---

## 1. Observation

### 1.1 Existing Map Implementation in `src/components/`
- **Location:** `src/components/map/OrbitMap.tsx` (239 lines).
- **Usage:** Only imported and rendered in `src/app/page.tsx` (lines 24 and 638).
- **Mechanism:**
  - It is **not a real map**. It is an SVG illustration (`<svg viewBox="0 0 800 600">`) with hardcoded architectural and orbital rings (`#F37338`, `#F3F0EE`).
  - Lines 38–41 calculate coordinate bounds with fallback coordinates hardcoded strictly to **Bengaluru**:
    ```typescript
    const minLat = lats.length ? Math.min(...lats) : 12.9;
    const maxLat = lats.length ? Math.max(...lats) : 13.0;
    const minLng = lngs.length ? Math.min(...lngs) : 77.55;
    const maxLng = lngs.length ? Math.max(...lngs) : 77.75;
    ```
  - Pin positions are calculated via crude 2D percentage math (`toViewportPercent`, lines 46–53):
    ```typescript
    function toViewportPercent(lat: number, lng: number) {
      const x = 14 + ((lng - minLng) / lngSpan) * 72;
      const y = 82 - ((lat - minLat) / latSpan) * 64;
      return {
        left: `${Math.min(88, Math.max(12, x))}%`,
        top: `${Math.min(85, Math.max(15, y))}%`,
      };
    }
    ```
  - Markers are rendered as absolutely positioned `<button>` tags with `style={pos}` displaying `formatInr(item.hourlyRateInr)/hr`.
  - Active listing preview card (lines 180–235) floats over the bottom of the map stadium with portrait image, locality, star rating, hourly/daily price, and a direct CTA link to `/listings/${activeListing.id}`.
- **Host Form (`src/components/host/ListingForm.tsx`):**
  - Step 2 ("Address & Exact Coordinates", lines 381–483) contains **zero map component**.
  - Only plain numeric `<Input id="listing-lat" type="number" step="0.0001">` and `<Input id="listing-lng">`, plus 4 preset buttons from `URBAN_HUBS.slice(0, 4)` which set Bengaluru coordinates (`12.9784, 77.6408`).

### 1.2 Dependencies in `package.json`
- **`package.json` Inspection:**
  - Framework: `next: "15.1.7"`, `react: "^19.0.0"`, `react-dom: "^19.0.0"`.
  - Styling: `tailwindcss: "^3.4.17"`, `lucide-react: "^0.475.0"`, `@radix-ui/*`.
  - **Leaflet is completely absent**: Neither `leaflet`, `@types/leaflet`, nor `react-leaflet` exists in `dependencies` or `devDependencies`.
- **Test & Build Environment:**
  - `vitest.config.ts` specifies `environment: "node"` (line 6).
  - Current `npm test` passes all 14 tests in 34ms.
  - Current `npm run build` succeeds cleanly with 14 static/dynamic routes.

---

## 2. Logic Chain

### 2.1 Dependency Selection: Vanilla `leaflet` vs `react-leaflet`
1. **Observation:** `package.json` is on React 19 (`react: "^19.0.0"`).
2. **Observation:** Vitest runs with `environment: "node"`.
3. **Reasoning:**
   - In Next.js 15 App Router, React 19 is active. `react-leaflet` v5 has recently added React 19 peer dependency support, but `<MapContainer>` has notorious quirks: props like `center` and `zoom` are immutable after mount (requiring custom child components with `useMap()`), and rendering custom styled HTML markers requires dropping down to `L.divIcon` anyway.
   - Conversely, standard `leaflet` (`^1.9.4`) + `@types/leaflet` (`^1.9.22`) with an imperative React wrapper (`useRef`, `useEffect`) provides:
     - 100% guarantee of zero React 19 peer dependency conflicts.
     - Direct, imperative access to `map.panTo()`, `map.flyTo()`, `map.fitBounds()`, `marker.setLatLng()`.
     - Direct lifecycle control: `map.remove()` on unmount cleanly prevents React 18/19 StrictMode double-mount leaks and "Map container is already initialized" errors.
     - Dynamic `import("leaflet")` inside `useEffect` completely shields Node SSR and Vitest from executing Leaflet code where `window` is undefined.
4. **Conclusion:** Installing `leaflet` and `@types/leaflet` is the most resilient, predictable, and maintainable path.

### 2.2 Next.js 15 SSR Isolation Strategy
1. **Observation:** Leaflet references `window.navigator`, `window.document` immediately upon file evaluation.
2. **Observation:** In Next.js App Router, even files with `"use client"` undergo server-side pre-rendering during `next build`. Furthermore, Vitest runs in Node.
3. **Reasoning:**
   - Any static `import L from "leaflet"` at the top level of a file that is imported by a server component or pre-rendered page will trigger: `ReferenceError: window is not defined`.
4. **Resolution Plan:**
   - **Rule 1 (Dynamic Import with SSR false):** Any page or parent component consuming the map must import it via `next/dynamic`:
     ```typescript
     import dynamic from "next/dynamic";

     const DriverDiscoveryMap = dynamic(
       () => import("@/components/map/DriverDiscoveryMap"),
       {
         ssr: false,
         loading: () => <MapLoadingSkeleton />,
       }
     );
     ```
   - **Rule 2 (Component-Level Browser Guard):** Within the map component itself, import Leaflet dynamically inside `useEffect` or guard execution with `typeof window !== "undefined"`:
     ```typescript
     useEffect(() => {
       if (typeof window === "undefined" || !containerRef.current) return;
       let isMounted = true;
       import("leaflet").then((L) => {
         if (!isMounted || mapInstanceRef.current) return;
         // initialize map...
       });
       return () => {
         isMounted = false;
         mapInstanceRef.current?.remove();
         mapInstanceRef.current = null;
       };
     }, []);
     ```

### 2.3 Marker Icon Asset Architecture (`L.divIcon`)
1. **Observation:** The default Leaflet marker relies on PNG images (`marker-icon.png`, `marker-shadow.png`) resolved via relative asset paths, which routinely break in Webpack/Turbopack bundlers resulting in broken 404 images.
2. **Observation:** R3 explicitly specifies interactive price pins displaying `₹/hr` at each listing's Pune coordinates, highlighting on selection, and syncing with listing cards.
3. **Reasoning:**
   - Using `L.divIcon` bypasses all static image asset bundling issues.
   - Pure HTML + Tailwind CSS rendered inside `L.divIcon` produces razor-sharp, Retina-ready badges that perfectly adhere to ParkOrbit's Mastercard design system:
     - Unselected pin: `bg-white text-ink px-3 py-1.5 rounded-pill text-xs font-bold shadow-md hover:scale-105 transition-transform flex items-center gap-1`
     - Selected pin: `bg-[#F37338] text-white px-3.5 py-2 rounded-pill text-xs font-bold shadow-halo ring-4 ring-white/50 scale-110 z-30 flex items-center gap-1`
     - Host drag pin: Red/orange stadium teardrop with pulsing shadow dot and central pin glyph.

### 2.4 Tile Provider Selection (Free, No API Key)
1. **Observation:** Requirement R3 calls for free OpenStreetMap / Carto Voyager tiles without paid API keys.
2. **Evaluation:**
   - **Option A: Carto Voyager (Recommended Primary)**
     - URL Template: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
     - Subdomains: `['a', 'b', 'c', 'd']`
     - Attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>`
     - Max Zoom: `20`
     - **Design Fit:** Clean, warm cream/gray tones with subtle road lines and crisp typography that harmonizes seamlessly with ParkOrbit's `#F3F0EE` canvas and `#141413` ink palette.
   - **Option B: OpenStreetMap Standard (Fallback)**
     - URL Template: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
     - Attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`
     - Max Zoom: `19`

### 2.5 Pune Coordinates Reference Catalog
To guarantee that 100% of seeded listings, quick presets, and search centers adhere to authentic Pune boundaries (`18.40° N <= lat <= 18.65° N`, `73.70° E <= lng <= 74.00° E`):

| Locality | Latitude | Longitude | Strategic Character / Landmark |
|---|---|---|---|
| **Pune City Core (Default)** | `18.5204` | `73.8567` | Shaniwar Wada / PMC Central Hub |
| **Koregaon Park** | `18.5362` | `73.8940` | North Main Road, Osho Ashram, Cafe Lane |
| **Baner** | `18.5590` | `73.7868` | Baner High Street, Aundh-Baner Link |
| **Hinjewadi Phase 1** | `18.5913` | `73.7389` | Rajiv Gandhi Infotech Park, Quadron |
| **Hinjewadi Phase 2** | `18.5976` | `73.7198` | Wipro Circle, Infosys Phase 2 Campus |
| **Kothrud** | `18.5074` | `73.8077` | Paud Road, MIT World Peace University, Karve Statue |
| **Viman Nagar** | `18.5679` | `73.9143` | Phoenix Marketcity, Pune Airport Link |
| **FC Road (Deccan)** | `18.5186` | `73.8415` | Fergusson College Road, Deccan Gymkhana |
| **Wakad** | `18.5987` | `73.7634` | Dutt Mandir Road, Hinjewadi Flyover Junction |
| **Magarpatta City** | `18.5158` | `73.9272` | Cybercity, Destination Center, Hadapsar SEZ |
| **Shivajinagar** | `18.5314` | `73.8446` | Shivajinagar Junction, COEP, JM Road |
| **Aundh** | `18.5580` | `73.8075` | Westend Mall, Parihar Chowk |
| **Kalyani Nagar** | `18.5463` | `73.9034` | Jogger's Park, East Avenue |

---

## 3. Detailed Component Specifications

### 3.1 Driver Discovery Map (`PuneDiscoveryMap.tsx`)

#### Props Interface
```typescript
interface PuneDiscoveryMapProps {
  listings: EnrichedListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchCenter?: { lat: number; lng: number; label: string } | null;
  onUseBrowserLocation?: () => void;
  geoStatus?: string | null;
  className?: string;
}
```

#### Behavior & Interactions
1. **Container Styling:**
   - Outer wrapper: `relative w-full h-[460px] lg:h-[620px] rounded-stadium overflow-hidden border border-ink/15 shadow-halo select-none`.
   - Leaflet container div with `w-full h-full`.
2. **Tile & Center Initialization:**
   - Initial center: Pune (`18.5204, 73.8567`), Zoom `12` or `13`.
   - Bounded panning: `maxBounds: [[18.30, 73.60], [18.75, 74.15]]`.
3. **Marker Synchronization:**
   - Maintain an `L.layerGroup` on the map.
   - Whenever `listings` or `selectedId` changes:
     - Clear layers.
     - For each listing, create an `L.marker([listing.latitude, listing.longitude])` using `L.divIcon({ className: "custom-price-pin", html: ... })`.
     - Clicking the pin calls `onSelect(listing.id)` and smoothly pans map: `map.panTo([listing.latitude, listing.longitude], { animate: true, duration: 0.4 })`.
4. **Locality & Search Sync:**
   - When user clicks a locality pill (e.g. "Koregaon Park"):
     - Parent updates `searchCenter`.
     - An effect triggers `map.flyTo([searchCenter.lat, searchCenter.lng], 14, { duration: 1.0 })`.
   - If listings change and count > 0:
     - `map.fitBounds(L.latLngBounds(listings.map(l => [l.latitude, l.longitude])), { padding: [50, 50], maxZoom: 15 })`.
5. **Floating Bottom Preview Card:**
   - Retain the exact Mastercard-styled bottom preview card from `OrbitMap.tsx` (lines 180–235):
     - Displays listing photo thumbnail, locality badge (`• Koregaon Park, Pune`), rating (`★ 4.9`), hourly and daily rate, distance, and direct CTA button `Inspect & Reserve ->` linking to `/listings/${listing.id}`.
6. **Top Control Overlay:**
   - Glass pill showing `Pune Live Map · ${activeLocality}` with Compass icon.
   - "Near Me (GPS)" button triggering browser geolocation.

---

### 3.2 Host Location Picker (`HostLocationPicker.tsx`)

#### Props Interface
```typescript
interface HostLocationPickerProps {
  latitude: number;
  longitude: number;
  locality?: string;
  onLocationChange: (coords: { lat: number; lng: number; locality?: string; landmark?: string }) => void;
  className?: string;
}
```

#### Behavior & Interactions
1. **Container Styling:**
   - `relative w-full h-[340px] sm:h-[380px] rounded-[24px] overflow-hidden border border-ink/15 shadow-inner`.
2. **Pune Neighborhood Presets:**
   - Render horizontal pill buttons directly above the map:
     - `["Koregaon Park", "Baner", "Hinjewadi", "Kothrud", "Viman Nagar", "FC Road", "Wakad", "Magarpatta", "Shivajinagar"]`.
   - Clicking a preset:
     - Sets marker location to preset coordinates.
     - Pans map with `map.flyTo([preset.lat, preset.lng], 15)`.
     - Fires `onLocationChange({ lat: preset.lat, lng: preset.lng, locality: preset.name })`.
3. **Interactive Draggable Pin:**
   - Place a single draggable marker at `[latitude, longitude]` using custom `L.divIcon` with orange pin style.
   - **On Pin Drag (`dragend` event):**
     - Extract `const { lat, lng } = marker.getLatLng()`.
     - Call `onLocationChange({ lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) })`.
   - **On Map Click (`click` event):**
     - Extract `const { lat, lng } = e.latlng`.
     - Move marker: `marker.setLatLng([lat, lng])`.
     - Call `onLocationChange({ lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) })`.
     - Pan map smoothly: `map.panTo([lat, lng])`.
4. **Coordinate HUD Overlay:**
   - Top-left floating glass badge displaying:
     - `Pinned: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`
     - Subtitle: "Click anywhere on map or drag pin to your parking stall entrance"
5. **Form Integration in `ListingForm.tsx`:**
   - Replace the static text-only Step 2 inputs with `HostLocationPicker` placed directly above the synchronized text inputs.
   - The Street Address, Locality, City ("Pune"), Latitude, and Longitude input fields remain synchronized with the map pin.

---

### 3.3 CSS & Global Styles Integration

In `src/app/globals.css`:
```css
/* Leaflet Core Styles */
@import "leaflet/dist/leaflet.css";

/* Leaflet Layout & Stacking Context Fixes */
.leaflet-container {
  width: 100%;
  height: 100%;
  font-family: inherit;
  background-color: #F3F0EE;
}

/* Ensure Leaflet panes do not overlap modals, toasts, or navbar */
.leaflet-pane {
  z-index: 10 !important;
}
.leaflet-top,
.leaflet-bottom {
  z-index: 20 !important;
}

/* DivIcon container reset */
.leaflet-div-icon {
  background: transparent !important;
  border: none !important;
}
```

---

## 4. Caveats

1. **Read-Only Scope Enforced:** No packages were installed and no source files were modified during this investigation.
2. **React 19 vs `react-leaflet`:** While `react-leaflet@5` has added React 19 in its package descriptor, the vanilla Leaflet wrapper via React `useEffect` + `useRef` was found to be significantly safer and simpler for Next.js App Router dynamic imports. If the team prefers `react-leaflet`, it must be imported exclusively through `next/dynamic` with `{ ssr: false }`.
3. **Database & Seed Sync Dependency:** The map depends on `latitude` and `longitude` fields in listings. The data layer (`seed.ts` and `data/parkorbit-db.json`) must be localized to Pune coordinates simultaneously so that all listing pins cluster neatly within Pune rather than Bengaluru.

---

## 5. Conclusion & Actionable Recommendations

1. **Dependencies to Install:**
   ```bash
   npm install leaflet
   npm install -D @types/leaflet
   ```
2. **Replace `OrbitMap.tsx`:**
   - Create `src/components/map/DriverDiscoveryMap.tsx` (using Carto Voyager tiles, `L.divIcon` price pins, listing sync, locality pan/zoom).
   - Export wrapped with `next/dynamic(..., { ssr: false })` or replace `OrbitMap` directly with an SSR-safe dynamic export.
3. **Enhance `ListingForm.tsx`:**
   - Create `src/components/map/HostLocationPicker.tsx` (using Carto Voyager tiles, draggable pin, click-to-pin, Pune neighborhood presets).
   - Embed in `src/components/host/ListingForm.tsx` in Step 2.
4. **Import Leaflet CSS in `src/app/globals.css`** with the z-index containment rules.

---

## 6. Verification Method

To independently verify these findings and validate future implementations:

1. **Check Dependencies:**
   ```bash
   npm info leaflet version
   npm info @types/leaflet version
   ```
2. **Build Verification (Ensuring zero SSR / window errors):**
   ```bash
   npm run build
   ```
   *Expected outcome:* Build succeeds with 0 errors, all 14 routes compile without `ReferenceError: window is not defined`.
3. **Test Suite Verification:**
   ```bash
   npm test
   ```
   *Expected outcome:* Vitest executes in Node environment with 0 failures.
4. **Code Inspection:**
   - Check `src/components/map/` for dynamic import pattern (`next/dynamic` with `ssr: false`).
   - Check that `L.divIcon` is used instead of default image icons.
   - Verify all coordinate constants fall within Pune range: `18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`.
