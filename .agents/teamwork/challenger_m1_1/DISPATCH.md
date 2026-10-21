# Milestone 1: Challenger 1 Dispatch

Adversarially challenge the Milestone 1 data layer:
1. Empirically verify that every coordinate in `data/parkorbit-db.json` and `src/lib/seed.ts` falls strictly within Pune bounds: `18.40 <= lat <= 18.65` and `73.70 <= lng <= 74.00`.
2. Perform search queries across the database to prove zero legacy city names (Bengaluru, Bangalore, Mumbai, Delhi) exist in seed data.
3. Stress-test search filtering (`searchListings`) with boundary coordinates and edge queries.
State verdict in `d:\lms_project\.agents\teamwork\challenger_m1_1\handoff.md` and report via send_message.

## 2026-10-19T16:53:57Z
You are Challenger 1 for Milestone 1 (Pune Localization & Data Layer).
Your working directory is: d:\lms_project\.agents\teamwork\challenger_m1_1
Read:
- d:\lms_project\PROJECT.md
- d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\lms_project\.agents\teamwork\worker_m1\handoff.md
- Your dispatch instructions at d:\lms_project\.agents\teamwork\challenger_m1_1\DISPATCH.md

MISSION:
Empirically stress-test the Milestone 1 data layer:
1. Verify 100% of coordinates in `data/parkorbit-db.json` and `src/lib/seed.ts` fall within `18.40 <= lat <= 18.65` and `73.70 <= lng <= 74.00`.
2. Verify zero occurrences of Bengaluru, Bangalore, Mumbai, or Delhi in `data/parkorbit-db.json` and `src/lib/seed.ts`.
3. Test search and coordinate bounding logic.
State your verdict with empirical evidence in `d:\lms_project\.agents\teamwork\challenger_m1_1\handoff.md` and send_message back.
