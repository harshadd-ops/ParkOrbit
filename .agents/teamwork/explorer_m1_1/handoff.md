# Milestone 1 Explorer Handoff: Pune Localization & Data Layer

## 1. Observation

### 1.1 Scope and Existing Files
1. **`src/lib/types.ts`**:
   - Line 1 currently defines:
     ```typescript
     export type UserRole = "user" | "admin";
     ```
   - Lines 34–49 define `User`:
     ```typescript
     export interface User {
       id: string;
       name: string;
       email: string;
       phone: string;
       passwordHash: string;
       role: UserRole;
       ...
     ```
   - In `src/context/AuthContext.tsx:11`, `DemoUserSummary` uses `role: string;`.
   - In `src/components/layout/Navbar.tsx:164, 285`, checks are `currentUser.role === "admin"`.
   - In `src/app/admin/page.tsx:55, 90, 143`, checks are `user?.role !== "admin"`.
   - In `src/lib/db.ts:106`, `registerUser` assigns `role: "user"`.
   - Broadening `UserRole` to `"driver" | "host" | "admin" | "user"` is 100% backward-compatible and introduces zero TypeScript compilation breaks.

2. **`src/lib/seed.ts`**:
   - `URBAN_HUBS` (lines 3–76): Contains 8 hubs located in Bengaluru, Mumbai, and New Delhi (e.g. Indiranagar, Koramangala, MG Road, HSR, Whitefield, Jayanagar, Bandra West, Connaught Place).
   - Demo Users (lines 115–182):
     - `user-driver-1`: Aarav Mehta, bio mentions "commuting between Indiranagar and MG Road", plate `"KA-01-MJ-4821"`, role `"user"`.
     - `user-host-1`: Priya Nair, bio mentions "Indiranagar", plate `"KA-03-HN-9012"`, role `"user"`.
     - `user-host-2`: Vikramaditya Rao, bio mentions "Koramangala, MG Road & Bandra", plate `"KA-05-NB-3310"`, role `"user"`.
     - `user-admin-1`: Nandini Sharma, role `"admin"`.
   - Seeded Listings (lines 183–700): 8 listings all in Bengaluru, Mumbai, or Delhi (`listing-indiranagar-1` through `listing-cp-8`).
   - Seeded Blocked Periods (lines 701–710): 1 block on `listing-indiranagar-1`.
   - Seeded Bookings (lines 711–846): 3 bookings on `listing-indiranagar-1` and `listing-koramangala-2` with `listingCity: "Bengaluru"`, driver plates `"KA-01-MJ-4821"`.
   - Seeded Payments (lines 847–896): 3 payments tied to demo bookings.
   - Seeded Reviews (lines 897–912): 1 review on `listing-indiranagar-1`.
   - Seeded Reports (lines 913–927): 1 report on `listing-whitefield-5`.

3. **`data/parkorbit-db.json`**:
   - Current database file has 909 lines directly populated from `createInitialSeedData()`.
   - Contains 60+ non-Pune references, non-Pune coordinates (`12.97, 77.64`, `19.06, 72.83`, `28.63, 77.22`), and Karnataka vehicle plates.

4. **`src/lib/db.ts`**:
   - Lines 449, 454–458 in `createListing`:
     ```typescript
     subtitle: input.subtitle?.trim() || `${input.spaceType || "covered"} space in ${input.locality || "Bengaluru"}`,
     locality: input.locality?.trim() || "Indiranagar",
     city: input.city?.trim() || "Bengaluru",
     latitude: typeof input.latitude === "number" ? input.latitude : 12.9784,
     longitude: typeof input.longitude === "number" ? input.longitude : 77.6408,
     ```

5. **`tests/marketplace.test.ts`**:
   - Contains 14 passing tests.
   - Tests 1, 2, 3, 4, 5, 8, 9, 10 directly reference `"listing-indiranagar-1"`.
   - Test 6 references `"Indiranagar"` query and distance sort at `12.9784, 77.6408`.
   - Test 7 references `"listing-koramangala-2"`.
   - Test 12 references `"listing-koramangala-2"`.
   - Test 13 references `"listing-mgroad-3"`.
   - Tests 7, 8, 9, 10, 14 use `KA-*` vehicle plate strings.

---

## 2. Logic Chain

1. **Step 1 (Role Modeling)**: The user specification requires explicit roles (`driver`, `host`, `admin`) to power the 1-click persona switcher and role-gated UI (R2). Expanding `export type UserRole = "driver" | "host" | "admin" | "user";` preserves compatibility with user self-registration (`role: "user"`) while enabling explicit `role: "driver"` and `role: "host"` for demo users in `seed.ts`.
2. **Step 2 (Pune Geo-fencing & Hubs)**: The city boundaries for Pune are strictly bounded by `18.40 <= lat <= 18.65` and `73.70 <= lng <= 74.00`. Replacing the 8 non-Pune hubs with 10 authentic Pune Urban Hubs (Koregaon Park, Baner, Hinjewadi Phase 1, Hinjewadi Phase 2, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta City, Shivajinagar) satisfies R1 and provides geographic anchors for both map discovery and quick-filter pills.
3. **Step 3 (Pune Demo Personas)**: Updating the 4 demo users to Pune identities (Aarav Mehta in Baner/Hinjewadi, Neha Kulkarni in Koregaon Park, Vikram Joshi managing Baner/Hinjewadi decks, Nandini Sharma in Operations) with Maharashtra RTO plates (`MH-12` Pune, `MH-14` Pimpri-Chinchwad) establishes realistic local demo accounts for 1-click testing.
4. **Step 4 (Listing & Transactional Continuity)**: Replacing the 8 listings with 8 authentic Pune spaces with identical financial mechanics (e.g. ₹75/hr and ₹480/day for `listing-koregaon-park-1`, ₹65/hr for `listing-baner-2`, etc.) ensures all downstream calculations (service fees, host commission, daily caps, refunds) remain mathematically congruent while moving 100% of data to Pune.
5. **Step 5 (Database & Test Synchronization)**: Because `resetDatabaseForTests()` reads from `createInitialSeedData()`, updating `seed.ts` will immediately supply the updated Pune listings. Updating `data/parkorbit-db.json` synchronizes the running dev server, and updating `tests/marketplace.test.ts` ensures `npm test` remains 100% green without test regressions.

---

## 3. Caveats

1. **Test Suite Co-dependency**: The Worker implementing Milestone 1 must update `tests/marketplace.test.ts` in tandem with `src/lib/seed.ts` because the Vitest suite checks listing IDs (`listing-indiranagar-1` vs `listing-koregaon-park-1`). If `seed.ts` is changed without updating `tests/marketplace.test.ts`, tests referencing old IDs will fail.
2. **Navbar Initial Login State**: `Navbar.tsx:57` has `const [loginEmail, setLoginEmail] = useState("aarav@demo.parkorbit.in");`. Retaining `aarav@demo.parkorbit.in` for `user-driver-1` prevents breaking the pre-filled modal form.
3. **Persisted Disk State**: If `data/parkorbit-db.json` is not overwritten during implementation, Next.js dev server would continue serving stale Bengaluru data from disk. The Worker must overwrite `data/parkorbit-db.json` with the new Pune seed data.

---

## 4. Conclusion & Implementation Specifications

### 4.1 Changes to `src/lib/types.ts`
At Line 1 of `src/lib/types.ts`, change:
```typescript
// BEFORE:
export type UserRole = "user" | "admin";

// AFTER:
export type UserRole = "driver" | "host" | "admin" | "user";
```

### 4.2 Changes to `src/lib/db.ts`
At Lines 449, 454–458 of `src/lib/db.ts`, update default fallbacks to Pune:
```typescript
// In createListing:
    subtitle:
      input.subtitle?.trim() ||
      `${input.spaceType || "covered"} space in ${input.locality || "Koregaon Park"}`,
    description:
      input.description?.trim() ||
      "Private residential/commercial parking space managed via ParkOrbit.",
    address: input.address?.trim() || "Draft Address",
    locality: input.locality?.trim() || "Koregaon Park",
    city: input.city?.trim() || "Pune",
    landmark: input.landmark?.trim() || "Near Main Road",
    latitude: typeof input.latitude === "number" ? input.latitude : 18.5362,
    longitude: typeof input.longitude === "number" ? input.longitude : 73.894,
```

### 4.3 Complete Replacement for `src/lib/seed.ts`
A complete reference file has been generated and validated at:
`d:\lms_project\.agents\teamwork\explorer_m1_1\proposed_seed.ts`

The specification details:
#### 1. 10 Pune Urban Hubs (`URBAN_HUBS`)
| ID | Name | City | Landmark | Latitude | Longitude | Tag |
|---|---|---|---|---|---|---|
| `hub-koregaon-park` | Koregaon Park | Pune | North Main Road & Lane 5 | `18.5362` | `73.8940` | Boutique Cafes & Nightlife |
| `hub-baner` | Baner High Street | Pune | Balewadi High Street Junction | `18.5590` | `73.7868` | Commercial & Tech Strip |
| `hub-hinjewadi-p1` | Hinjewadi Phase 1 | Pune | Rajiv Gandhi Infotech Park & Shivaji Chowk | `18.5913` | `73.7389` | IT Mega Campus |
| `hub-hinjewadi-p2` | Hinjewadi Phase 2 | Pune | Wipro Circle & Embassy TechZone | `18.5975` | `73.7190` | Software SEZ |
| `hub-kothrud` | Kothrud | Pune | Paud Road & Vanaz Metro Station | `18.5074` | `73.8077` | Cultural & Residential Hub |
| `hub-viman-nagar` | Viman Nagar | Pune | Phoenix Marketcity & Airport Road | `18.5679` | `73.9143` | Airport Corridor & Retail |
| `hub-fc-road` | FC Road (Deccan) | Pune | Fergusson College Rd & Goodluck Chowk | `18.5222` | `73.8416` | Heritage & Student Hub |
| `hub-wakad` | Wakad | Pune | Datta Mandir Road & Hinjewadi Flyover | `18.5987` | `73.7686` | Transit & Residential Hub |
| `hub-magarpatta` | Magarpatta City | Pune | Cybercity Tower & Destination Centre | `18.5158` | `73.9272` | IT Township & Cybercity |
| `hub-shivajinagar` | Shivajinagar | Pune | Civil Court Metro Interchange & Station | `18.5314` | `73.8446` | Transit Interchange & CBD |

#### 2. 4 Pune Demo Users
1. `user-driver-1`:
   - Name: "Aarav Mehta"
   - Email: `"aarav@demo.parkorbit.in"`
   - Role: `"driver"`
   - Bio: "EV commuter traveling between Baner, Hinjewadi Phase 1, and Koregaon Park."
   - Plate: `"MH-12-RN-4821"` (Type: `"ev"`)
   - UPI: `"aarav.mehta@okicici"`
2. `user-host-1`:
   - Name: "Neha Kulkarni"
   - Email: `"host@demo.parkorbit.in"`
   - Role: `"host"`
   - Bio: "Homeowner in Koregaon Park Lane 5 with a covered villa portico & solar 7.4kW EV charger."
   - Plate: `"MH-12-KP-9012"` (Type: `"sedan"`)
   - UPI: `"neha.kulkarni@okhdfcbank"`
3. `user-host-2`:
   - Name: "Vikram Joshi"
   - Email: `"vikram@demo.parkorbit.in"`
   - Role: `"host"`
   - Bio: "Commercial property manager overseeing premium parking decks in Baner High Street and Hinjewadi IT Park."
   - Plate: `"MH-14-BJ-3310"` (Type: `"suv"`)
   - UPI: `"vikram.spaces@okaxis"`
4. `user-admin-1`:
   - Name: "Nandini Sharma (Trust & Safety)"
   - Email: `"admin@demo.parkorbit.in"`
   - Role: `"admin"`
   - Bio: "Marketplace Trust, Moderation & Pune Operations Lead at ParkOrbit."
   - Plate: `"MH-12-AD-0001"` (Type: `"sedan"`)
   - UPI: `"ops@parkorbit"`

#### 3. 8 Authentic Pune Listings
| ID | Locality | Title | Lat, Lng | Space Type | Rates (Hr / Day) | Policy |
|---|---|---|---|---|---|---|
| `listing-koregaon-park-1` | Koregaon Park | Lane 5 Covered Villa Portico & EV Bay | `18.5362, 73.8940` | `covered` | ₹75 / ₹480 | flexible |
| `listing-baner-2` | Baner | Balewadi High Street Executive Basement Slot #B14 | `18.5590, 73.7868` | `dedicated_private` | ₹65 / ₹420 | moderate |
| `listing-fc-road-3` | FC Road | Goodluck Chowk Heritage Courtyard Deck | `18.5222, 73.8416` | `commercial_lot` | ₹90 / ₹550 | flexible |
| `listing-kothrud-4` | Kothrud | Paud Road Private Driveway & Two-Wheeler Pocket | `18.5074, 73.8077` | `driveway` | ₹45 / ₹280 | flexible |
| `listing-hinjewadi-5` | Hinjewadi Phase 1 | Rajiv Gandhi Infotech Park Covered Commuter Bay | `18.5913, 73.7389` | `covered` | ₹55 / ₹350 | moderate |
| `listing-viman-nagar-6` | Viman Nagar | Viman Nagar Central Avenue Shaded Bungalow Bay | `18.5679, 73.9143` | `uncovered` | ₹50 / ₹320 | flexible |
| `listing-magarpatta-7` | Magarpatta City | Magarpatta Cybercity Tower Reserved Stilt #S4 | `18.5158, 73.9272` | `covered` | ₹110 / ₹690 | strict |
| `listing-wakad-8` | Wakad | Wakad Datta Mandir Road Dedicated Arcade Bay | `18.5987, 73.7686` | `dedicated_private` | ₹70 / ₹450 | moderate |

#### 4. Sample Bookings, Blocks, Payments, Reviews, Reports
- `block-demo-1`: Tied to `listing-koregaon-park-1`.
- `booking-demo-upcoming`: Confirmed booking on `listing-koregaon-park-1`, driver `user-driver-1`, plate `"MH-12-RN-4821"`, city `"Pune"`.
- `booking-demo-completed-1`: Completed booking on `listing-koregaon-park-1`, driver `user-driver-1`, plate `"MH-12-RN-4821"`, city `"Pune"`.
- `booking-demo-completed-2`: Completed booking on `listing-baner-2`, driver `user-driver-1`, host `user-host-2`, plate `"MH-12-RN-4821"`, city `"Pune"`.
- `pay-demo-1`, `pay-demo-2`, `pay-demo-3`: Succeeded simulated payments for the demo bookings.
- `rev-demo-1`: 5-star review on `listing-koregaon-park-1` mentioning Lane 5, Koregaon Park.
- `report-demo-1`: Trust report on `listing-hinjewadi-5` mentioning Hinjewadi Phase 1 / Shivaji Chowk.

### 4.4 Regeneration of `data/parkorbit-db.json`
The Worker can write `JSON.stringify(createInitialSeedData(), null, 2)` directly to `data/parkorbit-db.json`.

### 4.5 Synchronizing `tests/marketplace.test.ts`
Update listing IDs and localities in `tests/marketplace.test.ts`:
- Replace all occurrences of `"listing-indiranagar-1"` with `"listing-koregaon-park-1"`.
- Replace all occurrences of `"listing-koramangala-2"` with `"listing-baner-2"`.
- Replace all occurrences of `"listing-mgroad-3"` with `"listing-fc-road-3"`.
- In distance test: use `lat: 18.5362, lng: 73.8940` (Koregaon Park coordinates), expect `results[0].id` to be `"listing-koregaon-park-1"`.
- In locality test: query `"Koregaon Park"`, expect `[0].locality` to be `"Koregaon Park"`.
- In plate assertions: use `"MH-12-AB-9999"`, `"MH-14-XY-1234"`, `"MH-12-EV-2026"`, `"MH-12-RN-4821"`, `"MH-12-ZZ-1111"`.
- Add test assertion verifying that 100% of listings and urban hubs are located in Pune within coordinates `18.40 <= lat <= 18.65` and `73.70 <= lng <= 74.00`.

---

## 5. Verification Method

Once the changes are applied by the Worker:

1. **Automated Unit & Integration Test Suite**:
   ```bash
   npm test
   ```
   **Pass Condition**: All tests in `tests/marketplace.test.ts` pass with 0 errors.

2. **Zero Non-Pune References in `src/lib/seed.ts`**:
   Execute ripgrep or PowerShell:
   ```powershell
   Select-String -Path "src/lib/seed.ts" -Pattern "Bengaluru|Bangalore|Mumbai|Delhi|Indiranagar|Koramangala|Whitefield|Jayanagar|Bandra|Connaught|KA-\d\d|DL-\d\d"
   ```
   **Pass Condition**: 0 matches.

3. **Pune Bounding Box Invariants**:
   Inspect `data/parkorbit-db.json`:
   - Every listing has `city === "Pune"`
   - Every listing has `18.40 <= latitude <= 18.65` and `73.70 <= longitude <= 74.00`
   - Every hub in `URBAN_HUBS` has `city === "Pune"` and valid Pune coordinates.

4. **TypeScript Build Verification**:
   ```bash
   npm run build
   ```
   **Pass Condition**: Build completes with exit code 0 and zero type errors.
