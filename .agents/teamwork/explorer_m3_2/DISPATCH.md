# Dispatch: Explorer 2 (Milestone 3 — Host Location Picker)

## Working Directory
`d:\lms_project\.agents\teamwork\explorer_m3_2\`

## Context
Milestone 2 is completed and verified clean.
We are now implementing Milestone 3: Interactive Open-Source Leaflet Map Integration.

## Mission
Investigate and design `src/components/map/HostLocationPicker.tsx` and its integration into `src/components/host/ListingForm.tsx`:
1. Leaflet integration in Host studio:
   - Must be loaded dynamically or client-only to prevent SSR errors (`window is not defined`).
   - Center on Pune `[18.5204, 73.8567]`.
2. Interactive location selection:
   - Draggable marker: Host can drag the pin across Pune map, which updates latitude and longitude state in `ListingForm.tsx` in real-time.
   - Click-to-pin: Clicking anywhere on the map moves the pin and updates lat/lng.
   - Coordinate HUD: Display live latitude and longitude badge on or below the map.
3. Pune Locality Presets:
   - Preset buttons for Pune neighborhoods (e.g. Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta).
   - Clicking a preset snaps the map and pin to that neighborhood's coordinates, sets the `city` to `"Pune"`, and pre-fills `locality`.
4. Fix legacy city defaults in `src/components/host/ListingForm.tsx`:
   - Challenger 2 and Auditor noted that `ListingForm.tsx` still has legacy defaults (`city: "Bengaluru"`, `12.9784, 77.6408`). Update initial state and schema defaults to `city: "Pune"`, `locality: "Koregaon Park"`, `latitude: 18.5362`, `longitude: 73.8940`.

Write exact component code specifications and integration details to `d:\lms_project\.agents\teamwork\explorer_m3_2\handoff.md`.
Use `send_message` to report when done. Do not modify source code directly.


## 2026-10-19T17:31:54Z
You are Explorer 2 for Milestone 3 (Interactive Leaflet Map Integration).
Your working directory is: d:\lms_project\.agents\teamwork\explorer_m3_2
Read:
- d:\lms_project\PROJECT.md
- d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\lms_project\.agents\teamwork\explorer_survey_3\handoff.md
- Your dispatch instructions at d:\lms_project\.agents\teamwork\explorer_m3_2\DISPATCH.md

MISSION:
Investigate and design `src/components/map/HostLocationPicker.tsx` and its integration into `src/components/host/ListingForm.tsx`:
1. Leaflet integration in Host studio with SSR safety (`next/dynamic` with `{ ssr: false }`).
2. Interactive location selection: draggable marker updating lat/lng in real-time, click-to-pin anywhere on map, coordinate HUD.
3. Pune neighborhood preset buttons (Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta) that pan map, move pin, set `city: "Pune"`, and pre-fill locality.
4. Localize `ListingForm.tsx` default state from Bengaluru to Pune defaults (`city: "Pune"`, `locality: "Koregaon Park"`, `latitude: 18.5362`, `longitude: 73.8940`).

Write your exact component code specifications and integration details to `d:\lms_project\.agents\teamwork\explorer_m3_2\handoff.md`.
Use send_message to report when done. Do not modify source code directly.
