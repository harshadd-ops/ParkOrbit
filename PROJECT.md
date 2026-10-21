# Project: ParkOrbit Pune Revamp

## Architecture
ParkOrbit is a peer-to-peer urban parking marketplace built on Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS, backed by a persistent file-based JSON store (`data/parkorbit-db.json`) and Leaflet + Carto Voyager open-source maps.

### Core Modules
1. **Data & Storage Layer (`src/lib/`)**:
   - `types.ts`: Domain models (`User`, `UserRole = "driver" | "host" | "admin"`, `ParkingListing`, `Booking`, `Review`, `UrbanHub`).
   - `seed.ts` & `data/parkorbit-db.json`: Seed data strictly localized to Pune, Maharashtra (10 hubs, 4 users with MH plates, 8 listings, sample bookings/reviews).
   - `db.ts`: In-memory and file-persisted JSON database operations with Pune defaults.
   - `auth-server.ts` & `src/context/AuthContext.tsx`: Session cookie and context management for instant 1-click persona switching.
2. **Interactive Map Layer (`src/components/map/`)**:
   - Leaflet + OpenStreetMap/Carto Voyager tiles with client-only dynamic loading (`next/dynamic` with `ssr: false`).
   - `DriverDiscoveryMap.tsx`: Interactive `₹/hr` price markers, listing list sync, popup preview card, and locality pan/zoom.
   - `HostLocationPicker.tsx`: Drag/click pin placement with coordinate HUD and Pune neighborhood presets.
3. **Role-Specific UI & Navigation (`src/components/`, `src/app/`)**:
   - `Navbar.tsx`: 1-click segmented Demo Persona Switcher (Driver / Host / Admin) and strictly role-filtered navigation links.
   - Driver Landing View (`src/app/page.tsx`): Clean discovery interface with Pune search bar, neighborhood pills, Leaflet discovery map, and listing feed. Removed dense marketing walls and host banners.
   - Host Workspace (`src/app/dashboard/host/` & `src/app/host/new/`): Host space management, reservations queue, and new listing creation with interactive map picker.
   - Admin Console (`src/app/admin/`): Trust & Safety moderation.
   - Asset preservation: `/logo.png` and `src/app/icon.png` preserved intact in Navbar and Footer.
4. **Verification & Testing Layer (`tests/`)**:
   - `tests/marketplace.test.ts`: Vitest suite validating Pune database localization, role management, listing search/filtering, and the complete end-to-end Host-to-Driver demo lifecycle.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Pune Seed Data & Schema | Update `UserRole` to `"driver" \| "host" \| "admin"`, localize all 10 hubs, 4 demo users with MH plates, 8 listings, bookings, and reviews to Pune (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`) in `src/lib/seed.ts` and `data/parkorbit-db.json`. | M1 | Survey |
| F2 | Pune DB Defaults & Helpers | Update fallback locality, city ("Pune"), and coordinates in `src/lib/db.ts` to Pune defaults. | M1 | Survey |
| F3 | 1-Click Navbar Demo Switcher | Segmented persona switcher in `Navbar.tsx` for instant 1-click switching between Pune Driver, Pune Host, and Admin. | M2 | Survey |
| F4 | Role-Filtered Navigation & Views | Filter navbar links and page UI strictly by role (`driver`: Find Parking & My Bookings; `host`: My Spaces & Host Space; `admin`: Moderation). | M2 | Survey |
| F5 | De-cluttered Driver Discovery | Strip marketing walls, stat strips, and host monetization banners from `src/app/page.tsx`; localize search placeholder and neighborhood filter pills to Pune. | M2 | Survey |
| F6 | Leaflet Dependency & Styles | Install `leaflet` and `@types/leaflet`; configure Leaflet CSS and z-index rules in `globals.css`. | M3 | Survey |
| F7 | Driver Discovery Map | Create `DriverDiscoveryMap.tsx` with Carto Voyager tiles, `L.divIcon` price pins (`₹/hr`), listing selection sync, and smooth pan/zoom. | M3 | Survey |
| F8 | Host Location Picker | Create `HostLocationPicker.tsx` with interactive draggable pin, click-to-pin, coordinate HUD, and Pune neighborhood presets embedded in `ListingForm.tsx`. | M3 | Survey |
| F9 | Host -> Driver Demo Flow | Support end-to-end flow: Host creates Pune space -> switch to Driver in 1 click -> space immediately visible on map & searchable -> Driver reserves spot -> switch to Host -> reservation visible. | M4 | Survey |
| F10 | Vitest Test Suite Expansion | Update existing 14 tests in `tests/marketplace.test.ts` to Pune IDs/coordinates, add Pune boundary validation assertions, and verify Host->Driver lifecycle. | M4 | Survey |
| F11 | Production Build Verification | Ensure `npm run build` succeeds cleanly with zero SSR window errors, TypeScript errors, or Next.js build warnings. | M4 | Survey |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Pune Localization & Data Layer | Update types (`UserRole`), replace non-Pune data in `seed.ts`, `data/parkorbit-db.json`, and `db.ts` with authentic Pune hubs, users, and listings. | None | DONE |
| M2 | Role-Specific Views & 1-Click Persona Switcher | Implement 1-click persona switcher in `Navbar.tsx`, enforce strict role gating on navigation links and pages, de-clutter `page.tsx` for Driver discovery. | M1 | DONE |
| M3 | Interactive Leaflet Map Integration | Install Leaflet dependencies, create `DriverDiscoveryMap.tsx` and `HostLocationPicker.tsx` using Carto Voyager tiles & `L.divIcon`, embed in `page.tsx` and `ListingForm.tsx`. | M1 | DONE |
| M4 | End-to-End Demo Flow & Test/Build Verification | Update and expand `tests/marketplace.test.ts` for Pune assertions & Host->Driver lifecycle, verify `npm test` and `npm run build`. | M1, M2, M3 | IN_PROGRESS |

---

## Interface Contracts

### 1. Data Layer Contract (`src/lib/types.ts` & `src/lib/db.ts`)
- `UserRole`: `"driver" | "host" | "admin" | "user"`.
- `DemoUser`:
  - `user-driver-1`: Aarav Mehta, role: `driver`, plate: `MH-12-RN-4821`, city: `Pune`
  - `user-host-1`: Neha Kulkarni, role: `host`, plate: `MH-12-KP-9012`, city: `Pune`
  - `user-host-2`: Vikram Joshi, role: `host`, plate: `MH-14-BJ-3310`, city: `Pune`
  - `user-admin-1`: Nandini Sharma, role: `admin`, plate: `MH-12-AD-0001`, city: `Pune`
- `Pune Coordinates Boundary`: `18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`. Default center: `[18.5204, 73.8567]`.

### 2. Map Components Contract (`src/components/map/`)
- Dynamic import pattern:
  ```typescript
  import dynamic from "next/dynamic";
  const DriverDiscoveryMap = dynamic(() => import("@/components/map/DriverDiscoveryMap"), { ssr: false });
  const HostLocationPicker = dynamic(() => import("@/components/map/HostLocationPicker"), { ssr: false });
  ```
- Props:
  - `DriverDiscoveryMap`: `{ listings: EnrichedListing[], selectedId: string | null, onSelect: (id: string) => void, searchCenter?: { lat: number; lng: number; label: string } | null, className?: string }`
  - `HostLocationPicker`: `{ latitude: number, longitude: number, locality?: string, onLocationChange: (coords: { lat: number; lng: number; locality?: string; landmark?: string }) => void, className?: string }`

### 3. Role & Switcher Contract (`src/context/AuthContext.tsx` & `Navbar.tsx`)
- `switchUser(userId: string)` switches active session immediately.
- Segmented pills in Navbar display active persona badge and trigger 1-click switch.
- Nav links strictly filtered by active user role.

---

## Code Layout
- `data/parkorbit-db.json`: Canonical seeded database.
- `src/lib/types.ts`: TypeScript interfaces and types.
- `src/lib/seed.ts`: Seed data generator for Pune city.
- `src/lib/db.ts`: Data access methods and seed bootstrap.
- `src/components/layout/Navbar.tsx`: Header navigation with 1-click switcher and role filtering.
- `src/components/layout/Footer.tsx`: Footer with intact logo.
- `src/components/map/DriverDiscoveryMap.tsx`: Interactive Leaflet map for Driver discovery.
- `src/components/map/HostLocationPicker.tsx`: Interactive Leaflet map picker for Host space creation.
- `src/components/host/ListingForm.tsx`: Host listing creation multi-step form with map picker.
- `src/app/page.tsx`: Driver discovery landing page.
- `src/app/dashboard/driver/page.tsx`: Driver reservations and passes.
- `src/app/dashboard/host/page.tsx`: Host listings, reservations, and earnings.
- `src/app/admin/page.tsx`: Admin trust and moderation console.
- `tests/marketplace.test.ts`: Vitest test suite.
