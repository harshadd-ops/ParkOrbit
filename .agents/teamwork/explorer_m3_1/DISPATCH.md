# Dispatch: Explorer 1 (Milestone 3 — Driver Discovery Map)

## Working Directory
`d:\lms_project\.agents\teamwork\explorer_m3_1\`

## Context
Milestone 2 (Role-Specific Views & 1-Click Persona Switcher) is completed and verified clean.
We are now implementing Milestone 3: Interactive Open-Source Leaflet Map Integration.

## Mission
Investigate and design `src/components/map/DriverDiscoveryMap.tsx` and its integration into `src/app/page.tsx`:
1. Leaflet integration without `react-leaflet`:
   - Must use dynamic import `next/dynamic` with `{ ssr: false }` or client-side `useEffect` with `typeof window !== "undefined"` to prevent SSR `window is not defined` errors during Next.js build and test runs.
2. Tile layer:
   - Free Carto Voyager tiles: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` with OpenStreetMap attribution.
   - Initial center: Pune City Center `[18.5204, 73.8567]`, zoom 12-13.
3. Price Markers (`₹/hr` pins):
   - Use `L.divIcon` with custom Tailwind markup (e.g. pill badge `bg-emerald-600 text-white font-bold text-xs px-2 py-1 rounded-full shadow-md border-2 border-white hover:scale-110 cursor-pointer`).
   - Sync with listing cards: when a listing card is hovered or selected, marker highlights and map pans/zooms; when marker is clicked, corresponding listing card is highlighted/selected or popup shows title, price, and "Reserve" CTA.
4. Locality Quick-Pills interaction:
   - When user clicks Pune locality pill (Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta), map smoothly flies/pans to that neighborhood center (`map.flyTo([lat, lng], 14)`).

Write exact component code specifications and integration details to `d:\lms_project\.agents\teamwork\explorer_m3_1\handoff.md`.
Use `send_message` to report when done. Do not modify source code directly.


## 2026-10-19T17:31:54Z
You are Explorer 1 for Milestone 3 (Interactive Leaflet Map Integration).
Your working directory is: d:\lms_project\.agents\teamwork\explorer_m3_1
Read:
- d:\lms_project\PROJECT.md
- d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\lms_project\.agents\teamwork\explorer_survey_3\handoff.md
- Your dispatch instructions at d:\lms_project\.agents\teamwork\explorer_m3_1\DISPATCH.md

MISSION:
Investigate and design `src/components/map/DriverDiscoveryMap.tsx` and its integration into `src/app/page.tsx`:
1. Leaflet integration using dynamic import `next/dynamic` with `{ ssr: false }` or client-side `useEffect` to prevent SSR `window is not defined` errors.
2. Carto Voyager tile layer (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`) centered on Pune `[18.5204, 73.8567]`.
3. Price Markers (`₹/hr`) using `L.divIcon` with custom Tailwind markup, syncing with listing cards on hover/select and popup view.
4. Locality quick-pills flying/panning to selected Pune neighborhoods.

Write your exact component code specifications and integration details to `d:\lms_project\.agents\teamwork\explorer_m3_1\handoff.md`.
Use send_message to report when done. Do not modify source code directly.
