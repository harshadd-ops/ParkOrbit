# Milestone 2: Explorer 3 Dispatch

Scope: De-cluttering marketing text and complete Pune UI copy in `src/app/page.tsx` and `src/components/layout/Footer.tsx`.
Inputs: `PROJECT.md`, `d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md`, `d:\lms_project\.agents\teamwork\explorer_survey_2\handoff.md`.

Tasks:
1. Identify all marketing walls of text in `src/app/page.tsx`:
   - Stadium hero marketing paragraphs ("Every idle driveway is a destination...", stats row with 12%, 4-Digit, Zero).
   - "HOW PARKORBIT WORKS" 3-card marketing constellation.
   - Host monetization callout banner at the bottom of the page.
2. Detail how to strip this clutter so the Driver lands directly on a clean, focused Pune search bar + Pune neighborhood quick-pills + discovery map + listing cards.
3. Clean up any remaining legacy city references:
   - Search placeholder: `"Search Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar..."`
   - Neighborhood quick-pills: authentic Pune localities.
   - Clean up Wakad listing text in `src/lib/seed.ts` and `data/parkorbit-db.json` from "Mumbai-Pune Expressway" to "Pune Expressway" / "Yashwantrao Chavan Expressway".
   - Footer links: replace "BLR • BOM • DEL" with Pune neighborhoods.
Write findings and code template to `d:\lms_project\.agents\teamwork\explorer_m2_3\handoff.md`.

## 2026-10-19T17:02:18Z
You are Explorer 3 for Milestone 2 (Role-Specific Views & 1-Click Demo Persona Switcher).
Your working directory is: d:\lms_project\.agents\teamwork\explorer_m2_3
Read:
- d:\lms_project\PROJECT.md
- d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\lms_project\.agents\teamwork\explorer_survey_2\handoff.md
- Your dispatch instructions at d:\lms_project\.agents\teamwork\explorer_m2_3\DISPATCH.md

MISSION:
Design the de-cluttering of `src/app/page.tsx` and UI copy localization:
1. Identify all marketing walls of text, 3-stat strips, "HOW IT WORKS" cards, and bottom monetization banners to strip out of `src/app/page.tsx` so the Driver lands on a clean, focused Pune search bar + Pune neighborhood quick-pills + discovery map + listing cards.
2. Replace search placeholder and city dropdown with Pune localities: Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta.
3. Clean up the Wakad listing in `src/lib/seed.ts` and `data/parkorbit-db.json` from "Mumbai-Pune Expressway" to "Pune Expressway" / "Yashwantrao Chavan Expressway" to achieve 100% elimination of the word "Mumbai".
4. Update Footer links to replace legacy city hubs with Pune neighborhoods.
Write exact specifications to `d:\lms_project\.agents\teamwork\explorer_m2_3\handoff.md` and send a message when done. Do not modify source code directly.
