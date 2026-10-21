# Dispatch — Worker for Milestone 2 (Role-Specific Views & 1-Click Demo Persona Switcher)

## Mission
Implement the complete Milestone 2 specifications across the frontend layout, navigation, role routing, and UI de-cluttering:
1. `src/context/AuthContext.tsx`:
   - Strongly type `role` as `UserRole` (`"driver" | "host" | "admin" | "user"`).
   - Export `DEMO_PERSONAS` constant with Pune personas:
     - `user-driver-1` (Aarav Mehta, `driver`)
     - `user-host-1` (Neha Kulkarni, `host`)
     - `user-admin-1` (Nandini Sharma, `admin`)
   - Ensure `switchUser(userId)` properly updates active user and syncs cookie/session.
2. `src/components/layout/Navbar.tsx`:
   - Prominent 1-click segmented Demo Persona Switcher directly in the Navbar header:
     - 3 segmented pill buttons: `🚗 Driver: Aarav`, `🏠 Host: Neha`, `🛡️ Admin: Nandini`.
     - Active indicator styling (`bg-ink text-canvas shadow-sm` + live dot).
     - Clicking any persona executes immediate switch via `switchUser(personaId)`.
     - Route synchronization: if switching to driver from host/admin page -> `/`; if switching to host from driver page -> `/dashboard/host`; if switching to admin -> `/admin`.
   - Strict role-based navigation links:
     - `driver`: `Find Parking` (`/`), `My Bookings` (`/dashboard/driver`)
     - `host`: `My Spaces & Bookings` (`/dashboard/host`), `Host a Space` (`/host/new`)
     - `admin`: `Trust & Moderation` (`/admin`)
   - Retain `/logo.png` intact with proper dimensions (`width={29}`, `height={36}`, `className="h-9 w-auto object-contain"`).
3. `src/app/page.tsx`:
   - Role guard: If active user is `host`, redirect or transition to `/dashboard/host`. If active user is `admin`, redirect or transition to `/admin`.
   - When active as `driver`, provide clean, focused Driver discovery:
     - Strip stadium hero marketing text, stats strip ("12%", "4-Digit", "Zero"), and Indiranagar portrait.
     - Strip "HOW PARKORBIT WORKS" 3-card constellation.
     - Strip Section 4 Host monetization banner.
     - Center around Pune: search placeholder (`"Search Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta..."`), search center fallback (`18.5204, 73.8567`), Pune locality dropdown, Pune neighborhood pills, discovery map placeholder/view, and listing cards.
     - Strip all `/host/new` and `/dashboard/host` CTAs from driver discovery.
4. `src/app/dashboard/host/page.tsx`:
   - Remove ad-hoc in-page switcher buttons (lines 242-252 and lines 358-366) and legacy name "Priya Nair".
5. `src/app/admin/page.tsx`:
   - Remove ad-hoc "Activate Admin Persona" button (lines 143-153) and replace with non-interactive role badge.
6. `src/components/layout/Footer.tsx`:
   - Update hub links to Pune neighborhood hubs (`Pune Neighborhood Hubs (KP • Baner • Viman Nagar)`), preserve `/logo.png`.
7. `src/lib/seed.ts` & `data/parkorbit-db.json` & `tests/challenger_m1_stress.test.ts`:
   - Clean up Wakad listing (`listing-wakad-8`): replace "Mumbai-Pune Expressway" with "Yashwantrao Chavan Expressway" and "Mumbai-Pune bypass" with "Pune bypass".
   - Update `tests/challenger_m1_stress.test.ts` to expect 0 occurrences of "Mumbai".
8. Verification:
   - Run `npm test` and `npm run build`.
   - Ensure all tests pass with 0 failures and build succeeds with exit code 0.

## Exclusive Write Scope
- `src/context/AuthContext.tsx`
- `src/components/layout/Navbar.tsx`
- `src/app/page.tsx`
- `src/app/dashboard/host/page.tsx`
- `src/app/admin/page.tsx`
- `src/components/layout/Footer.tsx`
- `src/lib/seed.ts`
- `data/parkorbit-db.json`
- `tests/challenger_m1_stress.test.ts`

## Input References
- `d:\lms_project\.agents\teamwork\explorer_m2_1\handoff.md` (Navbar & AuthContext exact specifications)
- `d:\lms_project\.agents\teamwork\explorer_m2_2\handoff.md` (Role routing & dashboard switcher cleanup specifications)
- `d:\lms_project\.agents\teamwork\explorer_m2_3\handoff.md` (De-cluttering & copy localization specifications)
- `d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md`
- `d:\lms_project\PROJECT.md`


## 2026-10-19T17:07:41Z
Received System Message:
You are Worker 1 for Milestone 2 (Role-Specific Views & 1-Click Demo Persona Switcher).
Your working directory is: d:\lms_project\.agents\teamwork\worker_m2
Read:
- d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
- d:\lms_project\PROJECT.md
- Your dispatch instructions at d:\lms_project\.agents\teamwork\worker_m2\DISPATCH.md
- Comprehensive specifications from the 3 Explorers:
  - d:\lms_project\.agents\teamwork\explorer_m2_1\handoff.md
  - d:\lms_project\.agents\teamwork\explorer_m2_2\handoff.md
  - d:\lms_project\.agents\teamwork\explorer_m2_3\handoff.md

EXCLUSIVE WRITE SCOPE:
- `src/context/AuthContext.tsx`
- `src/components/layout/Navbar.tsx`
- `src/app/page.tsx`
- `src/app/dashboard/host/page.tsx`
- `src/app/admin/page.tsx`
- `src/components/layout/Footer.tsx`
- `src/lib/seed.ts`
- `data/parkorbit-db.json`
- `tests/challenger_m1_stress.test.ts`
DO NOT modify any other files in this milestone.
