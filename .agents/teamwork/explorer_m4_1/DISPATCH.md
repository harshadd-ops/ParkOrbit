# Explorer Dispatch — Milestone 4 (End-to-End Demo Flow & Final Test/Build Verification)

## Mission
You are Explorer 1 for Milestone 4 (End-to-End Demo Flow & Final Test/Build Verification).
Working directory: `d:\lms_project\.agents\teamwork\explorer_m4_1\`

## Context & Inputs to Read
1. `d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `d:\lms_project\PROJECT.md`
3. Code files to investigate:
   - `src/app/host/new/page.tsx` and `src/components/host/ListingForm.tsx` (listing submission)
   - `src/app/api/listings/route.ts` (listing creation API)
   - `src/app/api/bookings/route.ts` (booking creation API)
   - `src/app/dashboard/host/page.tsx` (Host dashboard reservations view)
   - `src/app/dashboard/driver/page.tsx` (Driver reservations view)
   - `src/app/admin/page.tsx` (Check for stale persona 'Meera Krishnan' vs 'Nandini Sharma')
   - `tests/marketplace.test.ts` (existing 25 tests)

## Investigation Objectives
1. Trace the complete Host -> Driver -> Host demo flow:
   - Step A: Host creates a new Pune space in `ListingForm.tsx` / `POST /api/listings`. Verify fields, validation, and JSON DB persistence.
   - Step B: 1-click persona switch to Driver (`user-driver-1`).
   - Step C: Driver discovery: Verify that the newly created space is searchable by locality/name and appears in `DriverDiscoveryMap` listings feed.
   - Step D: Driver booking: Verify `POST /api/bookings` creates a confirmed booking for the new listing.
   - Step E: 1-click persona switch back to Host (`user-host-1`).
   - Step F: Host incoming reservations queue displays the new booking with driver details, plate (`MH-12-RN-4821`), and accurate payout.
2. Check for any friction points, UI quirks, or stale labels:
   - Verify `src/app/admin/page.tsx` and ensure any stale persona references (`Meera Krishnan`) are replaced with `Nandini Sharma`.
   - Verify no lingering legacy city references in any API routes or dashboards.
3. Design a comprehensive automated test suite for this demo flow:
   - Provide exact test implementation to be placed in `tests/e2e_demo_flow.test.ts` (or `tests/marketplace.test.ts`) covering Steps A through F end-to-end against the database and API logic.
4. Document the exact findings and proposed changes for Worker 4 in `d:\lms_project\.agents\teamwork\explorer_m4_1\handoff.md`.
Use `send_message` when done. Do not modify source code directly.
