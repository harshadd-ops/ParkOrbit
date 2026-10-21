# Milestone 1: Explorer 2 Dispatch

Scope: `data/parkorbit-db.json` and `src/lib/db.ts`
Inputs: `PROJECT.md`, `d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md`, `d:\lms_project\.agents\teamwork\explorer_survey_1\handoff.md`

Tasks:
1. Review `src/lib/db.ts` fallback values in `createListing` (change Indiranagar / Bengaluru / 12.9784, 77.6408 to Koregaon Park / Pune / 18.5362, 73.8940).
2. Detail how `data/parkorbit-db.json` will be regenerated or synchronized with the new Pune seed data so the running app immediately loads the new Pune database.
3. Formulate the exact implementation plan and code specifications for the Worker.
Write findings to `d:\lms_project\.agents\teamwork\explorer_m1_2\handoff.md`.

## 2026-10-19T16:33:52Z
You are Explorer 2 for Milestone 1 (Pune Localization & Data Layer).
Your working directory is: d:\lms_project\.agents\teamwork\explorer_m1_2
Read:
- d:\lms_project\PROJECT.md
- d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\lms_project\.agents\teamwork\explorer_survey_1\handoff.md
- Your dispatch instructions at d:\lms_project\.agents\teamwork\explorer_m1_2\DISPATCH.md

MISSION:
Investigate and design the exact changes for `data/parkorbit-db.json` and `src/lib/db.ts`:
1. In `src/lib/db.ts`: Update fallback values in `createListing` (change Indiranagar/Bengaluru/12.9784, 77.6408 to Koregaon Park/Pune/18.5362, 73.8940).
2. How to ensure `data/parkorbit-db.json` is cleanly regenerated with 100% Pune seed data when the seed script runs or by synchronizing it directly, ensuring no old Bengaluru/Mumbai/Delhi entries linger.
3. Verify that on server start / test run, `getDb()` loads the fresh Pune database seamlessly.

Write your exact implementation specifications and procedures to `d:\lms_project\.agents\teamwork\explorer_m1_2\handoff.md`.
Use send_message to report when done. Do not modify source code directly.
