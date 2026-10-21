# Milestone 1: Worker Dispatch

## Objective
Implement Milestone 1: Pune Localization & Data Layer.
Own exclusively:
- `src/lib/types.ts`
- `src/lib/seed.ts`
- `src/lib/db.ts`
- `data/parkorbit-db.json`
- `tests/marketplace.test.ts`

## Input Documents
Read before editing:
1. `d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `d:\lms_project\PROJECT.md`
3. `d:\lms_project\.agents\teamwork\explorer_m1_1\handoff.md` & `d:\lms_project\.agents\teamwork\explorer_m1_1\proposed_seed.ts`
4. `d:\lms_project\.agents\teamwork\explorer_m1_2\handoff.md`
5. `d:\lms_project\.agents\teamwork\explorer_m1_3\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Instructions
1. Update `src/lib/types.ts`:
   - Change `UserRole = "driver" | "host" | "admin" | "user"`.
2. Update `src/lib/seed.ts`:
   - Replace all 8 Bengaluru/Mumbai/Delhi hubs with 10 authentic Pune Urban Hubs (Koregaon Park, Baner, Hinjewadi P1/P2, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta, Shivajinagar).
   - Replace seeded demo users with 4 authentic Pune users (`user-driver-1`, `user-host-1`, `user-host-2`, `user-admin-1`) having explicit roles (`driver`, `host`, `admin`) and Maharashtra plates (`MH-12-*`, `MH-14-*`).
   - Replace seeded listings with 8 authentic Pune listings with Pune coordinates (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`).
   - Replace sample bookings, reviews, and blocked periods with Pune entities.
   - Reference `d:\lms_project\.agents\teamwork\explorer_m1_1\proposed_seed.ts` for the verified full code.
3. Update `src/lib/db.ts`:
   - In `createListing`: update fallback defaults to Koregaon Park, Pune, lat 18.5362, lng 73.8940.
   - In `readDb()`: auto-detect if existing database is non-Pune (e.g. check for `Indiranagar` or lack of Pune listings) and auto-regenerate with `createInitialSeedData()`.
   - Export `getDb` if helpful.
4. Regenerate `data/parkorbit-db.json`:
   - Ensure `data/parkorbit-db.json` contains 100% Pune entities and 0 references to Bengaluru/Mumbai/Delhi.
5. Update `tests/marketplace.test.ts`:
   - Synchronize all existing tests with the new Pune listing IDs (`listing-koregaon-park-1`, `listing-baner-2`, etc.), MH plates, and Pune coordinates.
   - Add the 5 new tests in `describe("8. Pune Localization, Demographic & Geospatial Integrity")` per `explorer_m1_3/handoff.md`.
6. Run `npm test` and `npm run build` to verify that all 19 tests pass and the build succeeds cleanly.
7. Write your handoff report to `d:\lms_project\.agents\teamwork\worker_m1\handoff.md` and report back using `send_message`.


## 2026-10-19T16:48:14Z
You are Worker 1 for Milestone 1 (Pune Localization & Data Layer).
Your working directory is: d:\lms_project\.agents\teamwork\worker_m1
Read:
- d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\lms_project\PROJECT.md
- Your dispatch instructions at d:\lms_project\.agents\teamwork\worker_m1\DISPATCH.md
- Findings from Explorers:
  - d:\lms_project\.agents\teamwork\explorer_m1_1\handoff.md
  - d:\lms_project\.agents\teamwork\explorer_m1_1\proposed_seed.ts
  - d:\lms_project\.agents\teamwork\explorer_m1_2\handoff.md
  - d:\lms_project\.agents\teamwork\explorer_m1_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE SCOPE:
- `src/lib/types.ts`
- `src/lib/seed.ts`
- `src/lib/db.ts`
- `data/parkorbit-db.json`
- `tests/marketplace.test.ts`
- `scripts/seed.ts` (if needed)
DO NOT modify any other files in this milestone.

GOAL:
1. Update `src/lib/types.ts`: `UserRole = "driver" | "host" | "admin" | "user"`.
2. Update `src/lib/seed.ts`: 10 Pune Urban Hubs, 4 Pune Demo Users (`user-driver-1`, `user-host-1`, `user-host-2`, `user-admin-1`) with explicit roles (`driver`, `host`, `admin`) and Maharashtra plates (`MH-12-*`, `MH-14-*`), 8 Pune Listings with authentic Pune coordinates (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`), Pune sample bookings, reviews, and blocked periods. Use `proposed_seed.ts` as the reference.
3. Update `src/lib/db.ts`: Pune fallback defaults (`Koregaon Park`, `Pune`, `18.5362, 73.8940`), auto-refresh stale non-Pune database in `readDb()`, export `getDb`.
4. Regenerate `data/parkorbit-db.json` with 100% Pune entities and 0 references to Bengaluru/Mumbai/Delhi.
5. Update `tests/marketplace.test.ts`: synchronize all 14 tests to Pune listing IDs and MH plates, and add the 5 new tests in `describe("8. Pune Localization, Demographic & Geospatial Integrity")` per `explorer_m1_3/handoff.md`.
6. Run `npm test` and `npm run build` using your tool. Verify all tests pass (expected 19 passing tests) and build compiles cleanly.
7. Write your handoff report to `d:\lms_project\.agents\teamwork\worker_m1\handoff.md` with exact before/after verification outputs, and send a message when done.
