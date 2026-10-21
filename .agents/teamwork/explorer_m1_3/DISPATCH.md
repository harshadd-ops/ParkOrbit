# Milestone 1: Explorer 3 Dispatch

Scope: `tests/marketplace.test.ts`
Inputs: `PROJECT.md`, `d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md`, `d:\lms_project\.agents\teamwork\explorer_survey_1\handoff.md`

Tasks:
1. Review all 14 tests in `tests/marketplace.test.ts` that reference old Bengaluru IDs (`listing-indiranagar-1`, `listing-koramangala-2`, `listing-mgroad-3`, `KA-*` plates, Bengaluru coordinates).
2. Map each test to the new Pune listing IDs (`listing-koregaon-park-1`, `listing-baner-2`, `listing-fc-road-3`, `MH-*` plates, Pune coordinates).
3. Plan new tests to assert that 100% of seeded listings are in Pune (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`), zero non-Pune cities exist in the seeded db, and user roles are correctly assigned.
4. Formulate the exact implementation plan and test specifications for the Worker.
Write findings to `d:\lms_project\.agents\teamwork\explorer_m1_3\handoff.md`.


## 2026-10-19T16:33:52Z
You are Explorer 3 for Milestone 1 (Pune Localization & Data Layer).
Your working directory is: d:\lms_project\.agents\teamwork\explorer_m1_3
Read:
- d:\lms_project\PROJECT.md
- d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\lms_project\.agents\teamwork\explorer_survey_1\handoff.md
- Your dispatch instructions at d:\lms_project\.agents\teamwork\explorer_m1_3\DISPATCH.md

MISSION:
Investigate and design the test adaptation for `tests/marketplace.test.ts` for Milestone 1:
1. Examine all 14 tests in `tests/marketplace.test.ts`. Detail the exact mapping from Bengaluru IDs (`listing-indiranagar-1`, `listing-koramangala-2`, `listing-mgroad-3`, `KA-*` plates) to Pune IDs (`listing-koregaon-park-1`, `listing-baner-2`, `listing-fc-road-3`, `MH-*` plates).
2. Specify new assertions to verify that all seeded listings have valid Pune coordinates (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`), all seeded listings have `city === "Pune"`, and seeded user roles match `"driver"`, `"host"`, `"admin"`.
3. Provide the exact test code modifications so the Worker can apply them and run `npm test` cleanly.

Write your exact test specifications to `d:\lms_project\.agents\teamwork\explorer_m1_3\handoff.md`.
Use send_message to report when done. Do not modify source code directly.
