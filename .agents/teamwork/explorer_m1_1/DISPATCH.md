# Milestone 1: Explorer 1 Dispatch

Scope: `src/lib/types.ts` and `src/lib/seed.ts`
Inputs: `PROJECT.md`, `d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md`, `d:\lms_project\.agents\teamwork\explorer_survey_1\handoff.md`

Tasks:
1. Review `src/lib/types.ts` for updating `UserRole` to `"driver" | "host" | "admin" | "user"`.
2. Review `src/lib/seed.ts` to replace all non-Pune hubs (8 hubs -> 10 Pune hubs), users (4 Pune users with MH plates and roles: `driver`, `host`, `admin`), 8 Pune listings with authentic coordinates (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`), sample Pune bookings, reviews, and blocked periods.
3. Formulate the exact implementation plan and code specifications for the Worker.
Write findings to `d:\lms_project\.agents\teamwork\explorer_m1_1\handoff.md`.

## 2026-10-19T16:33:52Z
You are Explorer 1 for Milestone 1 (Pune Localization & Data Layer).
Your working directory is: d:\lms_project\.agents\teamwork\explorer_m1_1
Read:
- d:\lms_project\PROJECT.md
- d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\lms_project\.agents\teamwork\explorer_survey_1\handoff.md
- Your dispatch instructions at d:\lms_project\.agents\teamwork\explorer_m1_1\DISPATCH.md

MISSION:
Investigate and design the exact code changes for `src/lib/types.ts` and `src/lib/seed.ts`:
1. `UserRole` definition in `src/lib/types.ts`: `"driver" | "host" | "admin" | "user"`.
2. Replacement of `URBAN_HUBS` in `src/lib/seed.ts` with 10 authentic Pune Urban Hubs (Koregaon Park, Baner, Hinjewadi P1/P2, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta, Shivajinagar).
3. 4 Pune Demo Users (`user-driver-1`, `user-host-1`, `user-host-2`, `user-admin-1`) with authentic Pune bios, MH-12/14 vehicle plates, and explicit roles (`driver`, `host`, `admin`).
4. 8 authentic Pune Listings (`listing-koregaon-park-1` through `listing-wakad-8`), Pune coordinates (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`), Pune sample bookings, reviews, and blocked periods.
Ensure 0 references to Bengaluru/Mumbai/Delhi remain in seed.ts.

Write your exact implementation specifications and code templates to `d:\lms_project\.agents\teamwork\explorer_m1_1\handoff.md`.
Use send_message to report when done. Do not modify source code directly.
