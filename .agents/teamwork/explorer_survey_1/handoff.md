# Survey Explorer 1 Handoff Report: Data & Testing Layer Analysis

## 1. Observation

### 1.1 Project & Test Suite Baseline
- **Package Scripts & Dependencies** (`package.json:5-14, 15-45`):
  - `npm test` runs `vitest run` using Vitest v3.2.7.
  - `npm run build` runs `next build` with Next.js 15.1.7 and TypeScript 5.7.3.
  - Test run command output:
    ```
    ✓ tests/marketplace.test.ts (14 tests) 36ms
    Test Files  1 passed (1)
         Tests  14 passed (14)
    ```
  - Production build command output (`npm run build`):
    ```
    ✓ Compiled successfully
    ✓ Generating static pages (14/14)
    Finalizing page optimization ...
    ```
  - Leaflet is **not** currently present in `package.json` dependencies (needs `leaflet` and `@types/leaflet`).

### 1.2 Non-Pune References Across the Codebase
A comprehensive scan identified **217 occurrences** of non-Pune cities (Bengaluru, Mumbai, Delhi), non-Pune localities (Indiranagar, Koramangala, MG Road, HSR Layout, Whitefield, Jayanagar, Bandra, Connaught Place), Karnataka vehicle plates (`KA-01-MJ-4821`, `KA-03-HN-9012`, `KA-05-NB-3310`, `KA-05-AB-9999`, `KA-03-XY-1234`, `KA-01-EV-2026`, `KA-01-ZZ-1111`), and Bengaluru/Mumbai/Delhi coordinates (`~12.97, 77.64`, `~19.06, 72.83`, `~28.63, 77.22`):
- `data/parkorbit-db.json`: 60 non-Pune locality/city lines + 15 non-Pune coordinate pairs.
- `src/lib/seed.ts`:
  - `URBAN_HUBS` (lines 3–76): 8 hubs in Bengaluru (Indiranagar, Koramangala, MG Road, HSR, Whitefield, Jayanagar), Mumbai (Bandra West), and New Delhi (Connaught Place).
  - Seeded Users (lines 115–182): `user-driver-1` (bio: "commuting between Indiranagar and MG Road", plate: `KA-01-MJ-4821`), `user-host-1` (bio: "homeowner in Indiranagar", plate: `KA-03-HN-9012`), `user-host-2` (bio: "property manager in Koramangala, MG Road & Bandra", plate: `KA-05-NB-3310`).
  - Seeded Listings (lines 183–700): 8 listings all in Bengaluru, Mumbai, and New Delhi (`listing-indiranagar-1`, `listing-koramangala-2`, `listing-mgroad-3`, `listing-hsr-4`, `listing-whitefield-5`, `listing-jayanagar-6`, `listing-bandra-7`, `listing-cp-8`).
  - Seeded Bookings (lines 711–846): 3 bookings tied to `listing-indiranagar-1` and `listing-koramangala-2` with `listingCity: "Bengaluru"` and `vehiclePlate: "KA-01-MJ-4821"`.
  - Blocked Periods, Reviews & Reports (lines 701–710, 897–927): Tied to `listing-indiranagar-1`, `listing-koramangala-2`, and `listing-whitefield-5`.
- `src/lib/db.ts`:
  - Lines 354, 449, 452–456: Default fallback strings in `createListing`: `subtitle: ... || "covered space in Indiranagar"`, `locality: "Indiranagar"`, `city: "Bengaluru"`, `latitude: 12.9784`, `longitude: 77.6408`.
- `tests/marketplace.test.ts`:
  - 28 references: `listing-indiranagar-1` used in tests 1, 2, 3, 4, 5, 6, 7, 8, 9, 10; `searchListings({ query: "Indiranagar" })` in line 156; `searchListings({ lat: 12.9784, lng: 77.6408, sortBy: "distance" })` in line 177; `listing-koramangala-2` in booking tests; `listing-mgroad-3` in report tests; `KA-*` plates in tests 8, 9, 10, 14.
- `src/app/page.tsx`:
  - Lines 63–65, 126–128: Search center default and fallback: `lat: 12.9784, lng: 77.6408, label: "Indiranagar, Bengaluru"`.
  - Line 468: Search input placeholder: `"Indiranagar, BKC, Koramangala, Connaught Place..."`.
  - Lines 525–528: City select dropdown: `<option value="Bengaluru">Bengaluru</option><option value="Mumbai">Mumbai</option><option value="New Delhi">New Delhi</option>`.
- `src/components/host/ListingForm.tsx`:
  - Lines 72–82: Default form state: `locality: "Indiranagar"`, `city: "Bengaluru"`, `state: "Karnataka"`, `pincode: "560038"`, `latitude: 12.9784`, `longitude: 77.6408`.
- `src/components/map/OrbitMap.tsx`:
  - Lines 63–66: Hardcoded Bengaluru bounding coordinates: `minLat: 12.9, maxLat: 13.0, minLng: 77.55, maxLng: 77.75`.
- `src/app/listings/[id]/page.tsx`:
  - Lines 87, 439: Default vehicle plate `"KA-01-MJ-4821"`.

### 1.3 Exact Schema & Model Structures (`src/lib/types.ts`)
1. **User**:
   ```typescript
   export type UserRole = "user" | "admin"; // Currently lacks explicit "driver" | "host"
   export interface User {
     id: string;
     name: string;
     email: string;
     phone: string;
     passwordHash: string;
     role: UserRole;
     isVerified: boolean;
     avatarUrl: string;
     bio: string;
     upiId: string;
     defaultVehicleType?: VehicleType;
     defaultVehiclePlate?: string;
     isDemo: boolean;
     createdAt: string;
   }
   ```
2. **ParkingListing**:
   Contains `id`, `hostId`, `hostName`, `hostAvatar`, `hostVerified`, `title`, `subtitle`, `description`, `address`, `locality`, `city`, `landmark`, `latitude`, `longitude`, `spaceType` (`covered` | `uncovered` | `driveway` | `dedicated_private` | `commercial_lot`), `status` (`published` | `draft` | `paused` | `flagged`), `vehicleTypes` (`two_wheeler` | `hatchback` | `sedan` | `suv` | `ev`), `dimensions`, `hourlyRateInr`, `dailyRateInr`, `monthlyRateInr`, `isFeatured`, `amenities`, `photos`, `accessInstructions`, `parkingRules`, `restrictions`, `cancellationPolicy`, `minNoticeMinutes`, `openingHours`, `availableDays`, `ratingAvg`, `reviewCount`, `isDemo`, `createdAt`, `updatedAt`.
3. **Booking**:
   Contains `id`, `referenceCode` (format `PKO-XXXXXX`), `checkinPin` (4-digit string), `listingId`, `listingTitle`, `listingAddress`, `listingLocality`, `listingCity`, `listingPhotoUrl`, `listingSpaceType`, `cancellationPolicy`, `accessInstructions`, `driverId`, `driverName`, `driverEmail`, `driverPhone`, `hostId`, `hostName`, `vehicleType`, `vehiclePlate`, `startTime`, `endTime`, `durationHours`, `pricingMode`, `baseSubtotalInr`, `platformCommissionPercent`, `driverServiceFeePercent`, `driverServiceFeeInr`, `platformHostCommissionInr`, `totalDriverPaidInr`, `netHostEarningsInr`, `status` (`confirmed` | `checked_in` | `completed` | `cancelled`), `checkedInAt`, `cancellationReason`, `cancelledAt`, `refundAmountInr`, `refundStatus`, `payoutStatus`, `paymentMethod`, `paymentReference`, `hasReview`, `isDemo`, `createdAt`.
4. **Review**:
   Contains `id`, `bookingId`, `listingId`, `driverId`, `driverName`, `driverAvatar`, `rating`, `comment`, `isDemo`, `createdAt`.
5. **UrbanHub**:
   Contains `id`, `name`, `city`, `landmark`, `latitude`, `longitude`, `tag`.

### 1.4 Database Persistence Mechanism (`src/lib/db.ts`)
- File path resolved via `process.env.PARKORBIT_DB_PATH` or `path.join(process.cwd(), "data", "parkorbit-db.json")` (`db.ts:27-32`).
- On read, if file does not exist or JSON parsing fails, `createInitialSeedData()` is invoked and written to disk (`db.ts:36-48`).
- `resetDatabaseForTests()` overwrites the file with `createInitialSeedData()` (`db.ts:60-67`).

---

## 2. Logic Chain

1. **Premise 1**: The user requirement R1 specifies complete localization to Pune city (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`), zero references to Bengaluru/Mumbai/Delhi, and updating `data/parkorbit-db.json` and `src/lib/seed.ts`.
2. **Premise 2**: The current data layer (`src/lib/seed.ts` and `data/parkorbit-db.json`) is 100% focused on Bengaluru with minor Mumbai and Delhi entries.
3. **Premise 3**: In `src/lib/types.ts:1`, `UserRole` is defined only as `"user" | "admin"`. Requirement R2 demands explicit roles (`driver`, `host`, `admin`) and role-tied views. Expanding `UserRole = "driver" | "host" | "admin" | "user"` allows backward-compatible explicit typing and satisfies R2.
4. **Premise 4**: The test suite in `tests/marketplace.test.ts` hardcodes Bengaluru listing IDs (`listing-indiranagar-1`, `listing-koramangala-2`, `listing-mgroad-3`), Bengaluru query strings, and Bengaluru coordinates. Changing `src/lib/seed.ts` without synchronizing `tests/marketplace.test.ts` will break the 14 passing tests.
5. **Premise 5**: Requirement R4 demands a seamless live demo workflow where a Host creates a Pune listing, switches to a Driver who finds and reserves that listing, and the Host sees the new reservation. Adding automated tests for this exact end-to-end lifecycle guarantees R4 is verified in CI.
6. **Conclusion**:
   - `src/lib/types.ts` must update `UserRole` to support `"driver" | "host" | "admin"`.
   - `src/lib/seed.ts` must replace all 8 urban hubs, 4 seeded demo users, 8 seeded listings, 3 sample bookings, blocked periods, reviews, and reports with authentic Pune counterparts.
   - `data/parkorbit-db.json` must be regenerated with the Pune seed data.
   - `src/lib/db.ts` fallback values must be updated to Pune.
   - `tests/marketplace.test.ts` must be updated for Pune IDs and expanded with Pune coordinate validation tests and the Host->Driver end-to-end booking flow test.

---

## 3. Caveats

1. **Leaflet Package Dependency**: Leaflet is not yet installed in `package.json`. The implementation agent will need to install `leaflet` and `@types/leaflet`.
2. **JSON DB Concurrency in Next.js Dev Mode**: In development mode with hot reload, file writes to `data/parkorbit-db.json` are synchronous via `fs.writeFileSync`. Tests should isolate the database using `process.env.PARKORBIT_DB_PATH` or execute sequentially (default Vitest behavior).
3. **Logo Asset Continuity**: `/logo.png` and `src/app/icon.png` exist and are already used in `Navbar.tsx` (`src="/logo.png"`). These must be kept intact during any UI reorganization.

---

## 4. Conclusion & Proposed Specification

### 4.1 Exact Pune Seed Accounts Specification
| User ID | Role | Name | Email | Bio | Vehicle Plate | Vehicle Type |
|---|---|---|---|---|---|---|
| `user-driver-1` | `driver` | Aarav Mehta (Pune Driver) | `driver@demo.parkorbit.in` | "EV commuter traveling between Baner, Hinjewadi Phase 1, and Koregaon Park." | `MH-12-RN-4821` | `ev` |
| `user-host-1` | `host` | Neha Kulkarni (Pune Host) | `host@demo.parkorbit.in` | "Homeowner in Koregaon Park Lane 5 with a covered villa portico & solar 7.4kW EV charger." | `MH-12-KP-9012` | `sedan` |
| `user-host-2` | `host` | Vikram Joshi (Pune Commercial Host) | `vikram@demo.parkorbit.in` | "Property manager managing premium parking decks in Baner High Street and Hinjewadi IT Park." | `MH-14-BJ-3310` | `suv` |
| `user-admin-1` | `admin` | Nandini Sharma (Trust & Safety) | `admin@demo.parkorbit.in` | "Marketplace Trust, Moderation & Pune Operations Lead at ParkOrbit." | `MH-12-AD-0001` | `sedan` |

### 4.2 Exact Pune Urban Hubs Specification (`URBAN_HUBS`)
1. `hub-koregaon-park`: "Koregaon Park", Lat: `18.5362`, Lng: `73.8940`, Landmark: "North Main Road & Lane 5", Tag: "Boutique Cafes & Nightlife"
2. `hub-baner`: "Baner High Street", Lat: `18.5590`, Lng: `73.7868`, Landmark: "Balewadi High Street Junction", Tag: "Commercial & Tech Strip"
3. `hub-hinjewadi-p1`: "Hinjewadi Phase 1", Lat: `18.5913`, Lng: `73.7389`, Landmark: "Rajiv Gandhi Infotech Park & Shivaji Chowk", Tag: "IT Mega Campus"
4. `hub-hinjewadi-p2`: "Hinjewadi Phase 2", Lat: `18.5975`, Lng: `73.7190`, Landmark: "Wipro Circle & Embassy TechZone", Tag: "Software SEZ"
5. `hub-kothrud`: "Kothrud", Lat: `18.5074`, Lng: `73.8077`, Landmark: "Paud Road & Vanaz Metro Station", Tag: "Cultural & Residential Hub"
6. `hub-viman-nagar`: "Viman Nagar", Lat: `18.5679`, Lng: `73.9143`, Landmark: "Phoenix Marketcity & Airport Road", Tag: "Airport Corridor & Retail"
7. `hub-fc-road`: "FC Road (Deccan)", Lat: `18.5222`, Lng: `73.8416`, Landmark: "Fergusson College Rd & Goodluck Chowk", Tag: "Heritage & Student Hub"
8. `hub-wakad`: "Wakad", Lat: `18.5987`, Lng: `73.7686`, Landmark: "Datta Mandir Road & Hinjewadi Flyover", Tag: "Transit & Residential Hub"
9. `hub-magarpatta`: "Magarpatta City", Lat: `18.5158`, Lng: `73.9272`, Landmark: "Cybercity Tower & Destination Centre", Tag: "IT Township & Cybercity"
10. `hub-shivajinagar`: "Shivajinagar", Lat: `18.5314`, Lng: `73.8446`, Landmark: "Civil Court Metro Interchange & Station", Tag: "Transit Interchange & CBD"

### 4.3 Exact Pune Listings Specification
1. `listing-koregaon-park-1` (replaces `listing-indiranagar-1`):
   - Host: `user-host-1`, Locality: "Koregaon Park", City: "Pune", Address: "Bungalow 42, Lane 5, Koregaon Park", Lat: `18.5362`, Lng: `73.8940`, SpaceType: "covered", Rates: ₹75/hr, ₹480/day, Cancellation: "flexible", EV Charger: true.
2. `listing-baner-2` (replaces `listing-koramangala-2`):
   - Host: `user-host-2`, Locality: "Baner", City: "Pune", Address: "84, Balewadi High Street, Baner", Lat: `18.5590`, Lng: `73.7868`, SpaceType: "dedicated_private", Rates: ₹65/hr, ₹420/day, Cancellation: "moderate".
3. `listing-fc-road-3` (replaces `listing-mgroad-3`):
   - Host: `user-host-2`, Locality: "FC Road", City: "Pune", Address: "19, Fergusson College Road, Deccan Gymkhana", Lat: `18.5222`, Lng: `73.8416`, SpaceType: "commercial_lot", Rates: ₹90/hr, ₹550/day.
4. `listing-kothrud-4` (replaces `listing-hsr-4`):
   - Host: `user-host-1`, Locality: "Kothrud", City: "Pune", Address: "114, Ideal Colony, Paud Road, Kothrud", Lat: `18.5074`, Lng: `73.8077`, SpaceType: "driveway", Rates: ₹45/hr, ₹280/day.
5. `listing-hinjewadi-5` (replaces `listing-whitefield-5`):
   - Host: `user-host-2`, Locality: "Hinjewadi Phase 1", City: "Pune", Address: "Plot 28, Rajiv Gandhi Infotech Park, Phase 1, Hinjewadi", Lat: `18.5913`, Lng: `73.7389`, SpaceType: "covered", Rates: ₹55/hr, ₹350/day.
6. `listing-viman-nagar-6` (replaces `listing-jayanagar-6`):
   - Host: `user-host-1`, Locality: "Viman Nagar", City: "Pune", Address: "32, Viman Nagar Central Avenue, near Clover Park", Lat: `18.5679`, Lng: `73.9143`, SpaceType: "uncovered", Rates: ₹50/hr, ₹320/day.
7. `listing-magarpatta-7` (replaces `listing-bandra-7`):
   - Host: `user-host-2`, Locality: "Magarpatta City", City: "Pune", Address: "Tower 7 Annex, Cybercity, Magarpatta City, Hadapsar", Lat: `18.5158`, Lng: `73.9272`, SpaceType: "covered", Rates: ₹110/hr, ₹690/day.
8. `listing-wakad-8` (replaces `listing-cp-8`):
   - Host: `user-host-2`, Locality: "Wakad", City: "Pune", Address: "12, Datta Mandir Road, Shankar Kalat Nagar, Wakad", Lat: `18.5987`, Lng: `73.7686`, SpaceType: "dedicated_private", Rates: ₹70/hr, ₹450/day.

### 4.4 File Inventory for Updates
| File Path | Nature of Modification | Rationale |
|---|---|---|
| `src/lib/types.ts` | Type Definition Update | Update `UserRole` to `"driver" \| "host" \| "admin" \| "user"` for explicit role-based access. |
| `src/lib/seed.ts` | Seed Data Replacement | Replace all hubs, users, listings, bookings, reviews, and reports with authentic Pune entities. |
| `data/parkorbit-db.json` | Database Content Regeneration | Synchronize JSON database with the new Pune seed data. |
| `src/lib/db.ts` | Default Fallback Updates | Change default fallback strings and coordinates in `createListing` to Pune values (`Koregaon Park`, `Pune`, `18.5362, 73.8940`). |
| `tests/marketplace.test.ts` | Test Migration & Expansion | Update 14 existing tests to Pune IDs/coordinates + add Pune localization assertions and end-to-end Host->Driver lifecycle test. |
| `package.json` | Dependency Addition | Install `leaflet` and `@types/leaflet` for the interactive map implementation. |

---

## 5. Verification Method

To independently verify the data and testing layer changes once implemented:

1. **Automated Unit & Integration Tests**:
   ```bash
   npm test
   ```
   **Pass Condition**: All tests pass with 0 failures.
   **New Required Assertions in `tests/marketplace.test.ts`**:
   - `expect(db.listings.every(l => l.city === "Pune")).toBe(true)`
   - `expect(db.listings.every(l => l.latitude >= 18.40 && l.latitude <= 18.65 && l.longitude >= 73.70 && l.longitude <= 74.00)).toBe(true)`
   - `expect(URBAN_HUBS.every(h => h.city === "Pune")).toBe(true)`
   - Host creates a Pune listing -> Driver discovers it via `searchListings` -> Driver books it -> Booking appears in Host's reservations.

2. **Zero Non-Pune Reference Check**:
   ```powershell
   Get-ChildItem -Recurse -File -Exclude "*.tsbuildinfo", "*.png", "*.ico", "*.jpg" | Where-Object { $_.FullName -notmatch '\\(\.next|\.git|node_modules|\.agents)\\' } | Select-String -Pattern "Bengaluru|Bangalore|Mumbai|Delhi|Indiranagar|Koramangala|Whitefield|Jayanagar|Bandra|Connaught|KA-\d\d|DL-\d\d"
   ```
   **Pass Condition**: Zero matches returned.

3. **TypeScript & Production Build Verification**:
   ```bash
   npm run build
   ```
   **Pass Condition**: Exits with code 0 and zero TypeScript or Next.js build errors.
