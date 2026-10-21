# BRIEFING — 2026-10-19T17:39:30Z

## Mission
Investigate and design `src/components/map/HostLocationPicker.tsx` and its integration into `src/components/host/ListingForm.tsx` with SSR safety, interactive draggable marker, click-to-pin, Pune neighborhood presets, coordinate HUD, and localized Pune initial state.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: d:\lms_project\.agents\teamwork\explorer_m3_2
- Original parent: 13904d61-68e8-4ba4-b41b-c36b15babd1c
- Milestone: Milestone 3 (Interactive Leaflet Map Integration)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code directly
- Output detailed specifications and code proposals in handoff.md and proposed files
- SSR safety is mandatory (`window is not defined` protection via `next/dynamic` or `useEffect` dynamic import)
- Pune boundary enforcement (`18.40° N <= lat <= 18.65° N`, `73.70° E <= lng <= 74.00° E`)

## Current Parent
- Conversation ID: 13904d61-68e8-4ba4-b41b-c36b15babd1c
- Updated: 2026-10-19T17:39:30Z

## Investigation State
- **Explored paths**:
  - `src/components/host/ListingForm.tsx` (state, props, Step 2 layout, input placeholders)
  - `src/lib/seed.ts` (URBAN_HUBS with Pune coords)
  - `src/lib/db.ts` (lines 46-54: stale seed wipe hazard)
  - `src/components/map/OrbitMap.tsx`
  - `.agents/teamwork/explorer_survey_3/handoff.md`
- **Key findings**:
  - `ListingForm.tsx` had legacy Bengaluru defaults that pose a data loss hazard if submitted (triggering auto-reseed guard in `db.ts`)
  - Two-tiered SSR guard ensures zero `window is not defined` errors during Next.js builds and Vitest test runs
  - `L.divIcon` HTML badge solves all missing PNG 404 asset issues
  - 8 Pune presets allow 1-click snapping and form auto-fill
- **Unexplored areas**:
  - None. Full drop-in code and patch delivered.

## Key Decisions Made
- Implemented `proposed_HostLocationPicker.tsx` with Carto Voyager tiles, draggable pin, click-to-pin, coordinate HUD, and 8 Pune presets
- Produced unified diff patch `proposed_ListingForm.patch` updating initial state, input placeholders, and embedding `HostLocationPicker` via `next/dynamic` with `ssr: false`
- Wrote full 5-component handoff report `handoff.md`

## Artifact Index
- `d:\lms_project\.agents\teamwork\explorer_m3_2\DISPATCH.md` — Dispatch mission
- `d:\lms_project\.agents\teamwork\explorer_m3_2\BRIEFING.md` — Situational awareness
- `d:\lms_project\.agents\teamwork\explorer_m3_2\progress.md` — Liveness heartbeat
- `d:\lms_project\.agents\teamwork\explorer_m3_2\proposed_HostLocationPicker.tsx` — Drop-in component
- `d:\lms_project\.agents\teamwork\explorer_m3_2\proposed_ListingForm.patch` — Unified diff patch for ListingForm.tsx
- `d:\lms_project\.agents\teamwork\explorer_m3_2\handoff.md` — Final 5-component handoff report
