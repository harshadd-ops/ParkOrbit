# BRIEFING — 2026-10-19T17:33:00Z

## Mission
Investigate and design `src/components/map/DriverDiscoveryMap.tsx` and its seamless integration into `src/app/page.tsx` for Milestone 3 (Interactive Leaflet Map Integration).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesis
- Working directory: d:\lms_project\.agents\teamwork\explorer_m3_1
- Original parent: 13904d61-68e8-4ba4-b41b-c36b15babd1c
- Milestone: Milestone 3 — Interactive Leaflet Map Integration

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code directly
- Must prevent SSR `window is not defined` errors using dynamic import `next/dynamic` with `{ ssr: false }` or client-side `useEffect`
- Free Carto Voyager tiles centered on Pune `[18.5204, 73.8567]`
- Price markers (`₹/hr`) with `L.divIcon` and custom Tailwind markup, syncing with listing cards
- Locality quick-pills flying/panning to Pune neighborhoods
- Output structured 5-component handoff report to `handoff.md`

## Current Parent
- Conversation ID: 13904d61-68e8-4ba4-b41b-c36b15babd1c
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `package.json` (Leaflet not yet installed)
  - `PROJECT.md` (Architecture, M3 scope, interface contracts)
  - `ORIGINAL_REQUEST.md` (Requirements R1-R4)
  - `explorer_survey_3/handoff.md` (Initial survey recommendations for Leaflet & Carto tiles)
  - `src/app/page.tsx` (Current Driver discovery page with OrbitMap, filters, and listing feed)
  - `src/components/map/OrbitMap.tsx` (Current SVG orbital map implementation)
  - `src/app/globals.css` (Design system tokens, need Leaflet CSS and z-index fixes)
  - `tests/marketplace.test.ts` (19 tests passing in Vitest node environment)
- **Key findings**:
  - `OrbitMap.tsx` is an SVG mockup hardcoded with Bengaluru bounds (`12.9-13.0, 77.55-77.75`).
  - Next.js 15 App Router + React 19 requires Leaflet to be dynamically loaded with `ssr: false` or guarded with `typeof window !== "undefined"` and `import("leaflet")` inside `useEffect`.
  - Vanilla Leaflet (`leaflet` + `@types/leaflet`) avoids React 19 peer-dependency issues that `react-leaflet` often causes, and allows direct imperative control (`flyTo`, `panTo`, `fitBounds`, `L.divIcon`, cleanup).
  - Price markers should be rendered using `L.divIcon` with custom Tailwind HTML, avoiding broken PNG marker assets.
  - Carto Voyager tile URL: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`.
  - Stacking context and Leaflet z-index require `.leaflet-pane { z-index: 10 !important; }` and `.leaflet-top, .leaflet-bottom { z-index: 20 !important; }` in `globals.css` so modals/navbars stay on top.
- **Unexplored areas**:
  - None for Explorer 1 mission scope. Full design for `DriverDiscoveryMap.tsx`, `src/app/page.tsx` integration, and `globals.css` styling is complete and documented in `handoff.md`.

## Key Decisions Made
- Use vanilla `leaflet` imported dynamically with `ssr: false` wrapper and internal `useEffect` guard.
- Design `DriverDiscoveryMap.tsx` with full support for:
  1. Carto Voyager tiles with OSM attribution.
  2. `L.divIcon` HTML markers displaying `₹<rate>/hr` with active/hover styling.
  3. Floating bottom preview card matching the current sleek Mastercard aesthetic.
  4. Top header badge with Pune live map info + "Near Me" GPS trigger.
  5. Smooth programmatic panning when `selectedId` or `searchCenter` changes.
  6. Pulsing radar circle marker at `searchCenter` locality epicenter.
- Replacement in `src/app/page.tsx`: drop-in dynamic import of `DriverDiscoveryMap` replacing `OrbitMap`.
- Z-index containment in `src/app/globals.css`: `.leaflet-pane { z-index: 10 !important; }`, `.leaflet-top, .leaflet-bottom { z-index: 20 !important; }`.

## Artifact Index
- `d:\lms_project\.agents\teamwork\explorer_m3_1\DISPATCH.md` — Assigned dispatch instructions
- `d:\lms_project\.agents\teamwork\explorer_m3_1\BRIEFING.md` — Situational awareness and working memory
- `d:\lms_project\.agents\teamwork\explorer_m3_1\handoff.md` — Final 5-component handoff report
