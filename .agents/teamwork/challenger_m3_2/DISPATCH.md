# Challenger 2 Dispatch — Milestone 3 (Interactive Leaflet Map Integration)

## Mission
You are Challenger 2 for Milestone 3 (Interactive Leaflet Map Integration).
Working directory: `d:\lms_project\.agents\teamwork\challenger_m3_2\`

## Context & Inputs to Read
1. `d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `d:\lms_project\PROJECT.md`
3. `d:\lms_project\.agents\teamwork\worker_m3\handoff.md`

## Mission & Stress Testing Objectives
Empirically stress-test Host Location Picker and Pune Form Defaults:
1. Write and execute an automated test script:
   - Test all 8 Pune neighborhood presets in `HostLocationPicker.tsx` (Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta):
     - Every preset must have `city === "Pune"`.
     - Every preset's `[lat, lng]` must be strictly within Pune bounds (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`).
   - Test that default form values in `ListingForm.tsx` default to Pune (`city: "Pune"`, `locality: "Koregaon Park"`, `18.5362, 73.8940`), and that creating a listing with these defaults will NEVER trigger the legacy city wipe guard in `src/lib/db.ts:46`.
   - Test that no legacy city names (Bengaluru, Bangalore, Mumbai, Delhi) appear anywhere in `ListingForm.tsx` or `HostLocationPicker.tsx`.
2. Run `npm test` and your empirical test script.
3. State your verdict: **PASS** or **FAIL** with empirical data.
Write your report to `d:\lms_project\.agents\teamwork\challenger_m3_2\handoff.md` and call `send_message` when done.
