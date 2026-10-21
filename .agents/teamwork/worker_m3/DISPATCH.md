# Dispatch: Worker 1 (Milestone 3 — Interactive Leaflet Map Integration)

## Working Directory
`d:\lms_project\.agents\teamwork\worker_m3\`

## Context
Milestone 1 and 2 are complete and verified clean.
We are now implementing Milestone 3: Interactive Leaflet Map Integration.

## Reference Specifications
- Explorer 1 Report: `d:\lms_project\.agents\teamwork\explorer_m3_1\handoff.md`
- Explorer 2 Report: `d:\lms_project\.agents\teamwork\explorer_m3_2\handoff.md`
  - Proposed Component: `d:\lms_project\.agents\teamwork\explorer_m3_2\proposed_HostLocationPicker.tsx`
  - Proposed Patch: `d:\lms_project\.agents\teamwork\explorer_m3_2\proposed_ListingForm.patch`
- Explorer 3 Report: `d:\lms_project\.agents\teamwork\explorer_m3_3\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusive Write Scope
- `package.json` & `package-lock.json` (via `npm install leaflet` and `npm install -D @types/leaflet`)
- `src/app/globals.css`
- `src/components/map/DriverDiscoveryMap.tsx` (new)
- `src/components/map/HostLocationPicker.tsx` (new)
- `src/app/page.tsx`
- `src/components/host/ListingForm.tsx`
- `tests/` (if updating or adding tests)
DO NOT touch any other files in this milestone. Preserve `/logo.png` and `src/app/icon.png`.

## Required Tasks
1. Install dependencies:
   - Run `npm install leaflet` and `npm install -D @types/leaflet`.
   - DO NOT install `react-leaflet`.
2. Update `src/app/globals.css`:
   - Add Leaflet CSS import `@import "leaflet/dist/leaflet.css";`.
   - Add stacking and z-index isolation:
     ```css
     .leaflet-container {
       isolation: isolate;
       z-index: 1;
       font-family: inherit;
     }
     .leaflet-pane {
       z-index: 10 !important;
     }
     .leaflet-top,
     .leaflet-bottom {
       z-index: 20 !important;
     }
     .custom-div-icon {
       background: transparent !important;
       border: none !important;
     }
     ```
3. Implement `src/components/map/DriverDiscoveryMap.tsx`:
   - Follow `explorer_m3_1/handoff.md` design.
   - Use dynamic Leaflet import inside `useEffect` with client guard.
   - Use Carto Voyager tiles with OpenStreetMap attribution.
   - Center on Pune `[18.5204, 73.8567]`.
   - Create price markers using `L.divIcon` displaying `₹{listing.hourlyRate}/hr`.
   - Implement bidirectional hover and selection sync between map pins and listing cards.
   - Support locality quick-pills flight (`map.flyTo([lat, lng], 14)`).
4. Update `src/app/page.tsx`:
   - Dynamically import `DriverDiscoveryMap` using `next/dynamic(() => import('@/components/map/DriverDiscoveryMap'), { ssr: false, loading: () => <MapLoadingSkeleton /> })`.
   - Replace the old placeholder/OrbitMap with `DriverDiscoveryMap`.
5. Implement `src/components/map/HostLocationPicker.tsx`:
   - Follow `explorer_m3_2/handoff.md` and `proposed_HostLocationPicker.tsx`.
   - Draggable marker with live coordinate updates.
   - Click-to-pin anywhere on map.
   - Pune neighborhood presets (Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta).
   - Coordinate HUD badge.
6. Update `src/components/host/ListingForm.tsx`:
   - Dynamically import `HostLocationPicker` with `{ ssr: false }`.
   - Embed `HostLocationPicker` in Step 2 (Location details).
   - Replace legacy Bengaluru initial state defaults (`city: "Bengaluru"`, `12.9784, 77.6408`) with Pune defaults (`city: "Pune"`, `locality: "Koregaon Park"`, `latitude: 18.5362`, `longitude: 73.8940`, `state: "Maharashtra"`, `pincode: "411001"`).
7. Run Verification:
   - Execute `npm test` using `run_command` tool. Ensure all 67+ tests pass.
   - Execute `npm run build` using `run_command` tool. Ensure zero SSR errors, zero TypeScript errors, and clean generation of all static pages.
8. Deliver handoff:
   - Write comprehensive report to `d:\lms_project\.agents\teamwork\worker_m3\handoff.md`.
   - Use `send_message` to report back to parent orchestrator.
