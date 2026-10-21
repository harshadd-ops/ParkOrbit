# BRIEFING — 2026-10-19T17:35:10Z

## Mission
Investigate and design dependencies, styles, SSR/build safety, and Vitest test runner resilience for Leaflet in Milestone 3.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: d:\lms_project\.agents\teamwork\explorer_m3_3
- Original parent: 13904d61-68e8-4ba4-b41b-c36b15babd1c
- Milestone: Milestone 3 (Interactive Leaflet Map Integration)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code directly
- Must check package.json and specify exact npm install commands
- Confirm react-leaflet is avoided (React 19 compatibility & imperative lifecycle)
- Leaflet CSS import & z-index stacking context in globals.css
- Next.js App Router SSR safety with next/dynamic and skeleton
- Vitest test runner safety

## Current Parent
- Conversation ID: 13904d61-68e8-4ba4-b41b-c36b15babd1c
- Updated: 2026-10-19T17:35:10Z

## Investigation State
- **Explored paths**:
  - `package.json`: react 19.0.0, next 15.1.7, vitest 3.0.6.
  - `src/app/globals.css`: Tailwind v3 + custom design tokens. No Leaflet CSS currently present.
  - `src/components/layout/Navbar.tsx`: Header uses `sticky top-6 z-40`.
  - `src/components/ui/primitives.tsx`: Dialog overlay and modal content use `z-50`.
  - `vitest.config.ts`: Environment set to `"node"`. Tests in `tests/` currently execute purely in Node.
  - `src/components/map/OrbitMap.tsx`: Legacy SVG illustration with Bengaluru hardcoded bounds.
  - `src/components/host/ListingForm.tsx`: Currently has no map in Step 2; uses text inputs.
- **Key findings**:
  1. Package install commands: `npm install leaflet` and `npm install -D @types/leaflet`. Avoid `react-leaflet` to ensure React 19 compatibility, avoid StrictMode double-init bugs, and enable direct imperative Leaflet controls (`panTo`, `flyTo`, `L.divIcon`).
  2. Z-index stacking context: Navbar is `z-40`, Dialog is `z-50`. Leaflet defaults are 400-700 (panes) and 1000 (controls). Must constrain Leaflet panes to `z-index: 10 !important;` and controls to `z-index: 20 !important;`, plus `.leaflet-container { isolation: isolate; z-index: 1; }`.
  3. SSR safety: Two-tier architecture — `next/dynamic` with `ssr: false` + `MapLoadingSkeleton` in consumer components, combined with dynamic `import("leaflet")` inside `useEffect` in map components.
  4. Vitest safety: With dynamic imports inside `useEffect`, Node test runners will never evaluate Leaflet code when importing components or running test suites.
- **Unexplored areas**: None.

## Key Decisions Made
- Use vanilla `leaflet@^1.9.4` and `@types/leaflet@^1.9.22` with imperative React wrappers.
- Enforce strict z-index containment in `src/app/globals.css` below `z-40` (Navbar).
- Use `L.divIcon` exclusively for price pills and pins to eliminate 404 image asset bundler errors.

## Artifact Index
- d:\lms_project\.agents\teamwork\explorer_m3_3\DISPATCH.md — Task dispatch and instructions
- d:\lms_project\.agents\teamwork\explorer_m3_3\BRIEFING.md — Persistent working memory
- d:\lms_project\.agents\teamwork\explorer_m3_3\progress.md — Liveness heartbeat
- d:\lms_project\.agents\teamwork\explorer_m3_3\handoff.md — 5-Component handoff report
