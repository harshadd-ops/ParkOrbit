# Handoff Report: Leaflet Dependencies, Styles, SSR & Test Resilience for Milestone 3

**Agent:** Explorer 3 (Milestone 3 — Leaflet Build, Styles & SSR Safety)  
**Date:** 2026-10-19T17:36:00Z  
**Target Working Directory:** `d:\lms_project\.agents\teamwork\explorer_m3_3`  

---

## 1. Observation

### 1.1 Current Package Dependencies (`package.json`)
- **File:** `package.json` (lines 15–46).
- **Core Framework Versions:**
  - `next`: `"15.1.7"` (line 27)
  - `react`: `"^19.0.0"` (line 28)
  - `react-dom`: `"^19.0.0"` (line 29)
  - `tailwindcss`: `"^3.4.17"` (line 42)
  - `vitest`: `"^3.0.6"` (line 44)
- **Current Map Dependencies:** Neither `leaflet`, `@types/leaflet`, nor `react-leaflet` is present in `dependencies` or `devDependencies`.
- **Registry Inspection (`npm view`):**
  - `leaflet` latest stable version: `1.9.4`
  - `@types/leaflet` latest stable version: `1.9.22`
  - `react-leaflet` peer dependencies require `react: '^19.0.0'`, but introduces complex hook-only abstractions (`<MapContainer>`, `useMap`) where top-level props (`center`, `zoom`) are immutable post-mount and React StrictMode double-mounting frequently triggers unhandled `Error: Map container is already initialized`.

### 1.2 Layout & Stacking Context Hierarchy
- **Sticky Navbar (`src/components/layout/Navbar.tsx`):**
  - Line 140: `<header className="sticky top-6 z-40 mx-auto w-full max-w-[1280px] px-3 md:px-8">`
  - The sticky header operates at **`z-index: 40`**.
- **Modal Dialogs (`src/components/ui/primitives.tsx`):**
  - Line 24: `DialogOverlay` has class `fixed inset-0 z-50 ...`
  - Line 41: `DialogPrimitive.Content` has class `fixed left-[50%] top-[50%] z-50 ...`
  - Dialog modals operate at **`z-index: 50`**.
- **Leaflet Default Stacking Context (`leaflet/dist/leaflet.css`):**
  - Default `.leaflet-pane` ranges from `100` (`map-pane`), `200` (`tile-pane`), `400` (`overlay-pane`), `600` (`marker-pane`), to `700` (`popup-pane`).
  - Default `.leaflet-top` and `.leaflet-bottom` (zoom controls, attribution) operate at **`z-index: 1000`**.
  - Without explicit overrides, Leaflet controls (`z-1000`) and popups/markers (`z-600`–`z-700`) will render **above** the sticky Navbar (`z-40`) and Modal Dialogs (`z-50`), causing severe visual bleeding when scrolling or opening dialogs.
- **Global Stylesheet (`src/app/globals.css`):**
  - Lines 1–4: standard Tailwind directives `@tailwind base; @tailwind components; @tailwind utilities;`.
  - Currently contains zero Leaflet imports or overrides.

### 1.3 Map Usage in Consumer Components
- **`src/app/page.tsx`:**
  - Line 21: `import { OrbitMap } from "@/components/map/OrbitMap";`
  - Line 601: renders `<OrbitMap listings={listings} selectedId={selectedListingId} onSelect={setSelectedListingId} />`
- **`src/components/host/ListingForm.tsx`:**
  - Lines 381–483 (Step 2: Location & Coordinates): Currently contains **no map component**. It renders standard numeric inputs for `latitude` and `longitude` and preset buttons referencing `URBAN_HUBS.slice(0, 4)`.

### 1.4 Test Runner Configuration & Behavior (`vitest.config.ts`)
- **`vitest.config.ts` (lines 4–9):**
  ```typescript
  export default defineConfig({
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
      globals: true,
    },
    ...
  });
  ```
- **Test Execution (`npm test`):**
  - Currently runs 4 test files (`challenger_m1_stress.test.ts`, `challenger_m1_2.test.ts`, `marketplace.test.ts`, `challenger_m2_stress.test.ts`) with 67 tests passing in 827ms.
  - Vitest runs strictly in a Node environment (`environment: "node"`).
  - Test files directly import backend modules (`src/lib/db`, `src/lib/seed`, `src/lib/pricing`, API routes) and inspect source files via `fs.readFileSync`.
  - If a top-level `import L from "leaflet"` is imported during Node execution, it immediately crashes with:
    `ReferenceError: window is not defined` (because Leaflet references `window` and `document` at module evaluation time).

---

## 2. Logic Chain

### 2.1 Dependency Selection: Why Vanilla `leaflet` + Avoid `react-leaflet`
1. *From Observation 1.1:* The project runs Next.js 15.1.7 and React 19.
2. *Technical Analysis of `react-leaflet`:*
   - `<MapContainer>` renders an immutable map instance. Props like `center` and `zoom` cannot be changed by React state changes without creating custom child components utilizing `useMap().flyTo()`.
   - ParkOrbit requires custom `₹/hr` pill badges and interactive hover states. In `react-leaflet`, custom HTML markers still require dropping down to vanilla `L.divIcon` and manual HTML string generation.
   - In Next.js dev server with React StrictMode, `<MapContainer>` causes intermittent `Error: Map container is already initialized` crashes during hot reloads or fast navigation.
3. *Technical Advantages of Vanilla `leaflet`:*
   - Direct lifecycle control via `useRef<L.Map | null>(null)` and `useEffect`.
   - Clean cleanup with `map.remove()` prevents memory leaks and StrictMode initialization bugs.
   - Zero React peer dependency mismatch.
   - Dynamic `import("leaflet")` inside `useEffect` completely shields Node.js SSR from executing Leaflet code.
4. *Conclusion:* Install only `leaflet` and `@types/leaflet`. Do NOT install `react-leaflet`.

### 2.2 Stacking Context Architecture & Z-Index Containment
1. *From Observation 1.2:* Sticky Navbar is `z-40`, Dialog modals are `z-50`, while default Leaflet controls are `z-1000` and marker panes are `z-600`.
2. *Resolution Strategy:*
   - Establish an isolated stacking context on `.leaflet-container` using modern CSS `isolation: isolate;` and `z-index: 1;`.
   - Explicitly cap all Leaflet panes to `z-index: 10 !important;`.
   - Explicitly cap Leaflet top/bottom controls to `z-index: 20 !important;`.
   - Hierarchy established:
     `Map Panes (z-10) < Map Controls (z-20) < Sticky Navbar (z-40) < Modals / Dialogs / Toasts (z-50+)`.
   - Additionally, apply `.leaflet-div-icon { background: transparent !important; border: none !important; }` to eliminate default white border squares around custom HTML price badges.

### 2.3 SSR & Next.js App Router Dynamic Loading Pattern
1. *From Observation 1.4:* Leaflet fails in Node.js server pre-rendering with `ReferenceError: window is not defined`.
2. *Two-Tier Defense Architecture:*
   - **Tier 1 (Consumer / Page Level):** In `src/app/page.tsx` and `src/components/host/ListingForm.tsx`, load map components strictly via `next/dynamic` with `ssr: false`:
     ```typescript
     const DriverDiscoveryMap = dynamic(
       () => import("@/components/map/DriverDiscoveryMap"),
       {
         ssr: false,
         loading: () => <MapLoadingSkeleton className="h-[460px] lg:h-[620px]" label="Loading Pune Discovery Map..." />,
       }
     );
     ```
   - **Tier 2 (Component Level):** In `DriverDiscoveryMap.tsx` and `HostLocationPicker.tsx`, NEVER write `import L from "leaflet"` at the module root.
     Instead, use a type-only import (`import type L from "leaflet"`) and dynamically load the library inside `useEffect`:
     ```typescript
     useEffect(() => {
       if (typeof window === "undefined" || !containerRef.current) return;
       let isCancelled = false;
       import("leaflet").then((leafletModule) => {
         if (isCancelled || !containerRef.current) return;
         const L = leafletModule.default || leafletModule;
         // Initialize map safely...
       });
       return () => {
         isCancelled = true;
         mapRef.current?.remove();
         mapRef.current = null;
       };
     }, []);
     ```
   - Tier 1 prevents Next.js SSR from compiling the component during build time. Tier 2 ensures that even if a server test or module bundler resolves the component file in Node, Leaflet code is never evaluated.

### 2.4 Vitest Test Runner Safety
1. *From Observation 1.4:* Current Vitest environment is `node`. All 67 tests pass.
2. *Resilience Verification:*
   - Tier 1 and Tier 2 ensure that importing pages or forms will NOT trigger Leaflet evaluation in Node.
   - If future integration tests in `tests/` render components importing `DriverDiscoveryMap` or `HostLocationPicker`, mock the dynamic components cleanly:
     ```typescript
     vi.mock("@/components/map/DriverDiscoveryMap", () => ({
       default: (props: any) => <div data-testid="mock-driver-map" {...props} />,
       DriverDiscoveryMap: (props: any) => <div data-testid="mock-driver-map" {...props} />,
     }));
     ```

---

## 3. Caveats

1. **Read-Only Investigation:** No packages were installed and no source files were modified during this investigation.
2. **CDN Tile Availability:** Carto Voyager tiles (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`) require public internet access from the client browser. In offline environments, the base tiles will show grid patterns, though custom pins, coordinate calculations, and map mechanics will continue to function.
3. **Map Container Sizing:** In flexbox or dynamic grid containers, Leaflet may initialize before the container dimensions are fully calculated by the browser layout engine. An explicit call to `map.invalidateSize()` after a brief tick (e.g. `setTimeout(() => map.invalidateSize(), 150)`) must be included in the map mount effect.

---

## 4. Conclusion & Actionable Blueprint

### 4.1 Exact Package Installation Commands
Run in `d:\lms_project`:
```bash
npm install leaflet@^1.9.4
npm install -D @types/leaflet@^1.9.22
```
Confirm: Do NOT install `react-leaflet`.

### 4.2 Exact CSS Additions for `src/app/globals.css`
Add the following block to `src/app/globals.css` (recommended right before or after `@tailwind utilities;`):

```css
/* =========================================================================
   Leaflet Core Styles & Container Isolation
   ========================================================================= */
@import "leaflet/dist/leaflet.css";

/* Leaflet Container Defaults & Modern Stacking Isolation */
.leaflet-container {
  width: 100%;
  height: 100%;
  font-family: inherit;
  background-color: #F3F0EE;
  isolation: isolate; /* Enforces strict stacking context boundary */
  z-index: 1;
}

/* Stacking Context Isolation:
   Leaflet default controls use z-index: 1000 and panes use 400-700.
   Constrain them below sticky Navbar (z-40) and Dialog Modals (z-50). */
.leaflet-pane {
  z-index: 10 !important;
}

.leaflet-top,
.leaflet-bottom {
  z-index: 20 !important;
}

/* DivIcon container reset: clear default white square background & border */
.leaflet-div-icon {
  background: transparent !important;
  border: none !important;
}

/* Leaflet Attribution custom styling matching ParkOrbit design system */
.leaflet-control-attribution {
  background: rgba(243, 240, 238, 0.85) !important;
  backdrop-filter: blur(4px);
  color: #696969 !important;
  font-size: 10px !important;
  border-radius: 8px !important;
  padding: 2px 6px !important;
  margin: 6px !important;
}

.leaflet-control-attribution a {
  color: #141413 !important;
  font-weight: 500;
  text-decoration: none;
}
.leaflet-control-attribution a:hover {
  text-decoration: underline;
}
```

### 4.3 Loading Skeleton Component (`src/components/map/MapLoadingSkeleton.tsx`)
Create this reusable component:
```tsx
"use client";

import React from "react";

interface MapLoadingSkeletonProps {
  className?: string;
  height?: string;
  label?: string;
}

export function MapLoadingSkeleton({
  className = "h-[460px] lg:h-[620px]",
  height,
  label = "Loading Pune Map...",
}: MapLoadingSkeletonProps) {
  return (
    <div
      style={height ? { height } : undefined}
      className={`relative w-full rounded-stadium border border-ink/15 bg-[#E8E2DA]/40 animate-pulse flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-white/80 shadow-md flex items-center justify-center mb-3">
        <div className="w-6 h-6 border-2 border-[#F37338] border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-xs font-semibold text-[#141413]/70 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-[11px] text-[#696969] mt-1">
        Pune, Maharashtra · Carto Voyager
      </p>
    </div>
  );
}
```

### 4.4 Next.js App Router Dynamic Wrapper Pattern

**In `src/app/page.tsx` (Driver Discovery View):**
```tsx
import dynamic from "next/dynamic";
import { MapLoadingSkeleton } from "@/components/map/MapLoadingSkeleton";

const DriverDiscoveryMap = dynamic(
  () => import("@/components/map/DriverDiscoveryMap"),
  {
    ssr: false,
    loading: () => (
      <MapLoadingSkeleton
        className="h-[460px] lg:h-[620px]"
        label="Loading Pune Discovery Map..."
      />
    ),
  }
);
```

**In `src/components/host/ListingForm.tsx` (Host Location Picker in Step 2):**
```tsx
import dynamic from "next/dynamic";
import { MapLoadingSkeleton } from "@/components/map/MapLoadingSkeleton";

const HostLocationPicker = dynamic(
  () => import("@/components/map/HostLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <MapLoadingSkeleton
        className="h-[340px] sm:h-[380px]"
        label="Loading Location Picker..."
      />
    ),
  }
);
```

### 4.5 Component-Level Browser Guard Pattern
Both `DriverDiscoveryMap.tsx` and `HostLocationPicker.tsx` must implement:
1. `import type L from "leaflet";` (type-only import)
2. `useRef<L.Map | null>(null)` for map instance tracking
3. `useEffect` with dynamic `import("leaflet")` and StrictMode cleanup:
```tsx
useEffect(() => {
  if (typeof window === "undefined" || !containerRef.current) return;
  let isCancelled = false;

  import("leaflet").then((leafletModule) => {
    if (isCancelled || !containerRef.current || mapRef.current) return;
    const L = leafletModule.default || leafletModule;
    leafletRef.current = L;

    const map = L.map(containerRef.current, {
      center: [18.5204, 73.8567],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: "abcd",
      }
    ).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);
  });

  return () => {
    isCancelled = true;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  };
}, []);
```

### 4.6 Vitest Test Runner Safety Guidelines
1. In `tests/marketplace.test.ts` (and any new test files), continue keeping `environment: "node"`.
2. Do not import `DriverDiscoveryMap.tsx` or `HostLocationPicker.tsx` directly in node test files without a mock.
3. If testing components that render the map, provide the mock:
```typescript
vi.mock("@/components/map/DriverDiscoveryMap", () => ({
  default: (props: any) => <div data-testid="driver-discovery-map-mock" {...props} />,
  DriverDiscoveryMap: (props: any) => <div data-testid="driver-discovery-map-mock" {...props} />,
}));
vi.mock("@/components/map/HostLocationPicker", () => ({
  default: (props: any) => <div data-testid="host-location-picker-mock" {...props} />,
  HostLocationPicker: (props: any) => <div data-testid="host-location-picker-mock" {...props} />,
}));
```

---

## 5. Verification Method

### 5.1 Dependency Verification
After dependencies are installed:
```bash
npm list leaflet @types/leaflet
```
*Expected Result:* `leaflet@1.9.4` and `@types/leaflet@1.9.22` listed without peer dependency warnings. `react-leaflet` is NOT installed.

### 5.2 Build & SSR Verification
```bash
npm run build
```
*Expected Result:*
- Clean production build with 0 TypeScript errors.
- 0 `ReferenceError: window is not defined` errors.
- All dynamic and static routes compile successfully.

### 5.3 Test Suite Verification
```bash
npm test
```
*Expected Result:*
- All Vitest test files pass with 0 failures in the Node environment.

### 5.4 Visual & Stacking Context Verification
- Scroll down past the map on the landing page: map markers and controls must stay strictly underneath the sticky navbar (`z-40`).
- Open the Auth/Persona modal or any dialog: modal dialog overlay and card (`z-50`) must render completely on top of map controls and markers.
