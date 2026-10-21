# Survey Explorer 3 Dispatch

Focus: Map implementation (current SVG/orbital map), Leaflet and OpenStreetMap/Carto Voyager integration requirements in Next.js (SSR handling, dynamic import `next/dynamic`, Leaflet CSS, marker icons, Leaflet coordinates for Pune `18.5204, 73.8567`), Host location picker, and Driver discovery map.


## 2026-10-19T16:21:48Z
You are Survey Explorer 3 for the ParkOrbit revamp project.
Your working directory is: d:\lms_project\.agents\teamwork\explorer_survey_3
Read the original request at: d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
Your dispatch instructions: d:\lms_project\.agents\teamwork\explorer_survey_3\DISPATCH.md

MISSION:
Conduct a comprehensive exploration of the map implementation and requirements:
1. Inspect current map implementation in `src/components/` (find any SVG orbital map, mock map, or map components).
2. Check `package.json` for Leaflet dependencies (`leaflet`, `@types/leaflet`, `react-leaflet` or vanilla Leaflet).
3. Investigate how Leaflet should be integrated in Next.js (handling SSR / window not defined, dynamic imports `next/dynamic` with `ssr: false`, Leaflet CSS imports, marker icon asset paths / custom div icons).
4. Plan the OpenStreetMap / Carto Voyager tile setup (free, no API key, centered on Pune `18.5204, 73.8567`).
5. Map out the specifications for:
   a. Driver Discovery Map: Pune price markers (`₹/hr`), popup/preview sync with listing card, locality pan/zoom.
   b. Host Location Picker: Pune neighborhood presets, interactive click/drag pin to set lat/lng.

RULES:
- Read-only exploration! DO NOT modify any code or data files.
- Write your comprehensive findings to `d:\lms_project\.agents\teamwork\explorer_survey_3\handoff.md`.
- Keep `progress.md` updated during your work.
- When done, use send_message to report back to orchestrator.
