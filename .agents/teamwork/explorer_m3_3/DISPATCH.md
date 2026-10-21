# Dispatch: Explorer 3 (Milestone 3 — Leaflet Build, Styles & SSR Safety)

## Working Directory
`d:\lms_project\.agents\teamwork\explorer_m3_3\`

## Context
Milestone 2 is completed and verified clean.
We are now implementing Milestone 3: Interactive Open-Source Leaflet Map Integration.

## Mission
Investigate and design dependencies, styles, and SSR/build safety for Leaflet:
1. Package dependencies:
   - Check `package.json`. Determine exact installation command: `npm install leaflet` and `npm install -D @types/leaflet`.
   - Verify that `react-leaflet` is NOT installed (React 19 conflict).
2. Leaflet Styles in `src/app/globals.css`:
   - Determine how Leaflet CSS should be imported (e.g. `@import "leaflet/dist/leaflet.css";` or `<link>` / import).
   - Check z-index stacking context: Leaflet default map controls/panes often use `z-index: 400` which can clip over sticky navbars (`z-50`) or modals. Specify `.leaflet-pane { z-index: 10 !important; }` and `.leaflet-top, .leaflet-bottom { z-index: 20 !important; }`.
3. SSR & Next.js App Router safety:
   - Leaflet references `window`, `document`, and `navigator` upon import.
   - Specify dynamic wrapper pattern using `next/dynamic(() => import('./...'), { ssr: false, loading: () => <MapSkeleton /> })`.
4. Vitest test suite compatibility:
   - Verify if any tests in `tests/` render or import pages that include Leaflet.
   - If tests import `page.tsx` or `ListingForm.tsx`, ensure `next/dynamic` or mock ensures Vitest does not throw `ReferenceError: window is not defined` or canvas errors.

Write exact configuration, CSS additions, and test resilience guidelines to `d:\lms_project\.agents\teamwork\explorer_m3_3\handoff.md`.
Use `send_message` to report when done. Do not modify source code directly.

## 2026-10-19T17:31:54Z
You are Explorer 3 for Milestone 3 (Interactive Leaflet Map Integration).
Your working directory is: d:\lms_project\.agents\teamwork\explorer_m3_3
Read:
- d:\lms_project\PROJECT.md
- d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\lms_project\.agents\teamwork\explorer_survey_3\handoff.md
- Your dispatch instructions at d:\lms_project\.agents\teamwork\explorer_m3_3\DISPATCH.md

MISSION:
Investigate and design dependencies, styles, and SSR/build safety for Leaflet:
1. Package dependencies: specify exact install commands for `leaflet` and `@types/leaflet`. Confirm `react-leaflet` is avoided.
2. Leaflet CSS import in `src/app/globals.css` and z-index fixes (`.leaflet-pane { z-index: 10 !important; }`, etc.) so it doesn't break fixed navbar or modals.
3. SSR & Next.js App Router dynamic wrapper patterns (`next/dynamic` with loading skeleton).
4. Vitest test runner safety: ensure Leaflet dynamic imports don't break Vitest tests (`npm test`).

Write your exact configuration, CSS additions, and test resilience guidelines to `d:\lms_project\.agents\teamwork\explorer_m3_3\handoff.md`.
Use send_message to report when done. Do not modify source code directly.
