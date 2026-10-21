# Milestone 1 — Explorer 2 Handoff Report: `src/lib/db.ts` & `data/parkorbit-db.json` Architecture

## 1. Observation

### 1.1 Non-Pune Fallback Locations in `src/lib/db.ts`
Inspection of `src/lib/db.ts` (lines 447–459) revealed hardcoded Bengaluru fallbacks inside the `createListing` function:
```typescript
// src/lib/db.ts:447-459 (BEFORE)
    subtitle:
      input.subtitle?.trim() ||
      `${input.spaceType || "covered"} space in ${input.locality || "Bengaluru"}`,
    description:
      input.description?.trim() ||
      "Private residential/commercial parking space managed via ParkOrbit.",
    address: input.address?.trim() || "Draft Address",
    locality: input.locality?.trim() || "Indiranagar",
    city: input.city?.trim() || "Bengaluru",
    landmark: input.landmark?.trim() || "Near Main Road",
    latitude: typeof input.latitude === "number" ? input.latitude : 12.9784,
    longitude: typeof input.longitude === "number" ? input.longitude : 77.6408,
```
- Line 449: Subtitle fallback string interpolated `"Bengaluru"`.
- Line 454: Locality fallback defaulted to `"Indiranagar"`.
- Line 455: City fallback defaulted to `"Bengaluru"`.
- Lines 457–458: Coordinates defaulted to `12.9784, 77.6408` (Indiranagar, Bengaluru).
- A full-text regex scan confirmed that lines 449, 454, 455, 457, and 458 are the **only** non-Pune hardcoded location fallbacks in `src/lib/db.ts`.

### 1.2 Function Naming & Startup Flow (`readDb` vs `getDb`)
- In `src/lib/db.ts` (lines 34–49), the core read function is named `readDb(): DatabaseSchema`.
- There is currently no exported function named `getDb` in `src/lib/db.ts`. Callers in `src/app/api/listings/route.ts`, `src/app/api/bookings/route.ts`, `src/app/api/auth/route.ts`, `src/app/api/reports/route.ts`, and `src/lib/auth-server.ts` all import `readDb`.
- Exporting `export const getDb = readDb;` ensures complete interoperability for any server component, test, or developer tooling expecting `getDb`.

### 1.3 `readDb()` File-Reading Behavior & Stale File Vulnerability
- Lines 34–49 of `src/lib/db.ts`:
```typescript
export function readDb(): DatabaseSchema {
  const filePath = getDbFilePath();
  if (!fs.existsSync(filePath)) {
    const initial = createInitialSeedData();
    writeDb(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as DatabaseSchema;
  } catch {
    const initial = createInitialSeedData();
    writeDb(initial);
    return initial;
  }
}
```
- **Crucial finding**: If `data/parkorbit-db.json` exists on disk and contains valid JSON, `readDb()` parses it as-is without re-generating from `createInitialSeedData()`.
- Currently, `data/parkorbit-db.json` on disk contains:
  - 8 listings located in Bengaluru, Mumbai, and New Delhi (`listing-indiranagar-1` through `listing-cp-8`).
  - 3 sample bookings referencing `listing-indiranagar-1` and `listing-koramangala-2` with `listingCity: "Bengaluru"` and `KA-01-MJ-4821` vehicle plates.
  - Test artifact users (`user-1792427116370-h9kf` / `user-1792428235116-qgxt`) left over from Vitest runs.
- If a developer starts `next dev` without running tests or without deleting/overwriting `data/parkorbit-db.json`, `readDb()` will serve the old Bengaluru data.

### 1.4 Test Runner Reset vs Seed Script Execution
- In `tests/marketplace.test.ts` (lines 26–28), `beforeEach` invokes `resetDatabaseForTests()`, which generates fresh data via `createInitialSeedData()` and writes it to `data/parkorbit-db.json`.
- However, test 7 (`registers a new user...`) creates `Rohan Deshmukh` via `registerUser()`. Because test 7 is the final test in the suite, `data/parkorbit-db.json` is left with this test artifact user.
- Testing CLI execution verified that `npx vite-node` is available in `node_modules/.bin` and can execute TypeScript files directly (exits code 0 with instant sub-second bundling).

---

## 2. Logic Chain

1. **Premise 1**: Requirement R1 dictates that 100% of seeded listings, default coordinates, and search fallbacks must be in Pune (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`), with zero references to Bengaluru/Mumbai/Delhi.
2. **Premise 2**: In `src/lib/db.ts:447-459`, `createListing` supplies fallback values for unprovided fields (such as when a host creates a draft listing). If these fallbacks retain Bengaluru values (`Indiranagar`, `Bengaluru`, `12.9784, 77.6408`), any draft listing or listing without explicit coordinates violates Pune localization and will drop a pin in Karnataka.
3. **Premise 3**: Updating these fallbacks in `src/lib/db.ts` to `locality: "Koregaon Park"`, `city: "Pune"`, `latitude: 18.5362`, and `longitude: 73.8940` ensures every listing created without coordinates safely defaults to the heart of Pune.
4. **Premise 4**: To guarantee `readDb()` / `getDb()` never loads stale Bengaluru/Mumbai/Delhi entries if an old `data/parkorbit-db.json` exists on disk, `readDb()` must incorporate an auto-refresh check: if any listing in the parsed JSON has `city === "Bengaluru"` or `city === "Mumbai"` or `city === "New Delhi"`, it immediately invokes `createInitialSeedData()`, writes it to disk, and returns the fresh Pune database.
5. **Premise 5**: To provide a clean, standalone workflow to regenerate `data/parkorbit-db.json` without running tests or starting Next.js, a dedicated seed script `scripts/seed.ts` executed via `npm run seed` (`vite-node scripts/seed.ts`) gives developers and CI an explicit, atomic command to reseed the database.
6. **Premise 6**: To prevent test artifacts (like user registrations during Vitest runs) from polluting the persistent `data/parkorbit-db.json`, `tests/marketplace.test.ts` should include an `afterAll(() => resetDatabaseForTests())` hook, and the Worker should run `npm run seed` as the final step after test execution.

---

## 3. Caveats

1. **Execution Ordering Dependency**: `src/lib/types.ts` and `src/lib/seed.ts` (designed by Explorer 1) must be implemented before `data/parkorbit-db.json` is regenerated, because `createInitialSeedData()` in `seed.ts` generates the data that populates `data/parkorbit-db.json`.
2. **Next.js Fast Refresh & JSON File Watcher**: In `next dev`, writing to `data/parkorbit-db.json` may trigger a server re-render if files in `data/` are watched. Synchronous writes via `fs.writeFileSync` (already used in `writeDb`) prevent race conditions during single-threaded request handlers.
3. **Custom Test DB Path (`PARKORBIT_DB_PATH`)**: The `getDbFilePath()` function respects `process.env.PARKORBIT_DB_PATH`. Any seed script and auto-refresh logic must continue to use `getDbFilePath()` so test database isolation remains intact when specified.

---

## 4. Conclusion & Concrete Implementation Specifications

### 4.1 Changes to `src/lib/db.ts`

#### Modification 1: Export `getDb` alias & add auto-refresh in `readDb()`
**Target**: `src/lib/db.ts:34-49`
```typescript
// BEFORE:
export function readDb(): DatabaseSchema {
  const filePath = getDbFilePath();
  if (!fs.existsSync(filePath)) {
    const initial = createInitialSeedData();
    writeDb(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as DatabaseSchema;
  } catch {
    const initial = createInitialSeedData();
    writeDb(initial);
    return initial;
  }
}

// AFTER:
export function readDb(): DatabaseSchema {
  const filePath = getDbFilePath();
  if (!fs.existsSync(filePath)) {
    const initial = createInitialSeedData();
    writeDb(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as DatabaseSchema;

    // Automatic migration guard: re-seed if stale non-Pune database detected
    const hasStaleNonPuneSeed = parsed.listings?.some(
      (l) => l.city === "Bengaluru" || l.city === "Mumbai" || l.city === "New Delhi"
    );
    if (hasStaleNonPuneSeed) {
      const freshPuneDb = createInitialSeedData();
      writeDb(freshPuneDb);
      return freshPuneDb;
    }

    return parsed;
  } catch {
    const initial = createInitialSeedData();
    writeDb(initial);
    return initial;
  }
}

/** Canonical alias for readDb() */
export const getDb = readDb;
```

#### Modification 2: Update Fallback Values in `createListing`
**Target**: `src/lib/db.ts:447-459`
```typescript
// BEFORE:
    subtitle:
      input.subtitle?.trim() ||
      `${input.spaceType || "covered"} space in ${input.locality || "Bengaluru"}`,
    description:
      input.description?.trim() ||
      "Private residential/commercial parking space managed via ParkOrbit.",
    address: input.address?.trim() || "Draft Address",
    locality: input.locality?.trim() || "Indiranagar",
    city: input.city?.trim() || "Bengaluru",
    landmark: input.landmark?.trim() || "Near Main Road",
    latitude: typeof input.latitude === "number" ? input.latitude : 12.9784,
    longitude: typeof input.longitude === "number" ? input.longitude : 77.6408,

// AFTER:
    subtitle:
      input.subtitle?.trim() ||
      `${input.spaceType || "covered"} space in ${input.locality || "Pune"}`,
    description:
      input.description?.trim() ||
      "Private residential/commercial parking space managed via ParkOrbit.",
    address: input.address?.trim() || "Draft Address",
    locality: input.locality?.trim() || "Koregaon Park",
    city: input.city?.trim() || "Pune",
    landmark: input.landmark?.trim() || "Near Main Road",
    latitude: typeof input.latitude === "number" ? input.latitude : 18.5362,
    longitude: typeof input.longitude === "number" ? input.longitude : 73.8940,
```

---

### 4.2 Standalone Seed Script (`scripts/seed.ts`) & `package.json`

Create `scripts/seed.ts`:
```typescript
import { writeDb } from "../src/lib/db";
import { createInitialSeedData } from "../src/lib/seed";

function runSeed() {
  const seedData = createInitialSeedData();
  writeDb(seedData);
  console.log(`[ParkOrbit] Database successfully seeded with 100% Pune data:`);
  console.log(` - ${seedData.users.length} Demo Users (${seedData.users.map((u) => u.name).join(", ")})`);
  console.log(` - ${seedData.listings.length} Pune Listings`);
  console.log(` - ${seedData.bookings.length} Sample Bookings`);
  console.log(` - Destination: data/parkorbit-db.json`);
}

runSeed();
```

In `package.json:5-14`, add `"seed"` to `"scripts"`:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "seed": "vite-node scripts/seed.ts"
  },
```

---

### 4.3 Clean Pune Seed Database Structure (`data/parkorbit-db.json`)

When regenerated by `scripts/seed.ts` (or `writeDb(createInitialSeedData())`), `data/parkorbit-db.json` will contain:

```json
{
  "config": {
    "commissionRatePercent": 12,
    "driverServiceFeePercent": 5,
    "featuredListingMonthlyInr": 999,
    "proHostSubscriptionInr": 1499,
    "paymentMode": "simulated_test",
    "payoutMode": "estimated_pending"
  },
  "users": [
    {
      "id": "user-driver-1",
      "name": "Aarav Mehta",
      "email": "driver@demo.parkorbit.in",
      "phone": "+91 98450 11223",
      "passwordHash": "demo123",
      "role": "driver",
      "isVerified": true,
      "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      "bio": "EV commuter traveling between Baner, Hinjewadi Phase 1, and Koregaon Park.",
      "upiId": "aarav.mehta@okicici",
      "defaultVehicleType": "ev",
      "defaultVehiclePlate": "MH-12-RN-4821",
      "isDemo": true,
      "createdAt": "2026-08-10T09:00:00.000Z"
    },
    {
      "id": "user-host-1",
      "name": "Neha Kulkarni",
      "email": "host@demo.parkorbit.in",
      "phone": "+91 98801 44556",
      "passwordHash": "demo123",
      "role": "host",
      "isVerified": true,
      "avatarUrl": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
      "bio": "Homeowner in Koregaon Park Lane 5 with a covered villa portico & solar 7.4kW EV charger.",
      "upiId": "neha.kulkarni@okhdfcbank",
      "defaultVehicleType": "sedan",
      "defaultVehiclePlate": "MH-12-KP-9012",
      "isDemo": true,
      "createdAt": "2026-07-15T10:30:00.000Z"
    },
    {
      "id": "user-host-2",
      "name": "Vikram Joshi",
      "email": "vikram@demo.parkorbit.in",
      "phone": "+91 99002 77889",
      "passwordHash": "demo123",
      "role": "host",
      "isVerified": true,
      "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      "bio": "Commercial property manager overseeing premium parking decks in Baner High Street and Hinjewadi IT Park.",
      "upiId": "vikram.spaces@okaxis",
      "defaultVehicleType": "suv",
      "defaultVehiclePlate": "MH-14-BJ-3310",
      "isDemo": true,
      "createdAt": "2026-06-20T08:15:00.000Z"
    },
    {
      "id": "user-admin-1",
      "name": "Nandini Sharma (Trust & Safety)",
      "email": "admin@demo.parkorbit.in",
      "phone": "+91 98110 33445",
      "passwordHash": "demo123",
      "role": "admin",
      "isVerified": true,
      "avatarUrl": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80",
      "bio": "Marketplace Trust, Moderation & Pune Operations Lead at ParkOrbit.",
      "upiId": "nandini.admin@okicici",
      "defaultVehicleType": "sedan",
      "defaultVehiclePlate": "MH-12-AD-0001",
      "isDemo": true,
      "createdAt": "2026-05-10T07:00:00.000Z"
    }
  ],
  "listings": [
    {
      "id": "listing-koregaon-park-1",
      "hostId": "user-host-1",
      "hostName": "Neha Kulkarni",
      "hostAvatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
      "hostVerified": true,
      "title": "Koregaon Park Lane 5 Portico Bay & 7.4kW EV Fast Charger",
      "subtitle": "Covered villa portico in Koregaon Park",
      "description": "Private shaded bungalow portico in upscale Koregaon Park Lane 5. Features automated remote-controlled RFID sliding gate, Type 2 7.4kW solar EV charger, wide driveway suitable for luxury sedans, and 24/7 CCTV surveillance.",
      "address": "Bungalow 42, Lane 5, Koregaon Park",
      "locality": "Koregaon Park",
      "city": "Pune",
      "landmark": "Near German Bakery & Osho Garden",
      "latitude": 18.5362,
      "longitude": 73.894,
      "spaceType": "covered",
      "status": "published",
      "vehicleTypes": ["two_wheeler", "hatchback", "sedan", "ev"],
      "dimensions": { "lengthFt": 19, "widthFt": 9.5, "heightClearanceFt": 9 },
      "hourlyRateInr": 75,
      "dailyRateInr": 480,
      "monthlyRateInr": 7500,
      "isFeatured": true,
      "amenities": ["EV Fast Charger", "CCTV 24/7", "Gated Security", "Covered Canopy", "Wide Access"],
      "photos": [
        {
          "id": "ph-kp-1",
          "url": "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1000&q=80",
          "caption": "Wide shaded portico entry bay with EV charger",
          "isPrimary": true
        }
      ],
      "accessInstructions": "Enter via Lane 5 south entrance. Keypad gate PIN will be visible upon active booking confirmation.",
      "parkingRules": ["Reverse park into marked bay", "No engine idling after 10 PM"],
      "restrictions": "No heavy commercial vehicles or oil-leaking engines.",
      "cancellationPolicy": "flexible",
      "minNoticeMinutes": 15,
      "openingHours": { "open": "06:00", "close": "23:30", "is24Hours": false },
      "availableDays": [0, 1, 2, 3, 4, 5, 6],
      "ratingAvg": 4.9,
      "reviewCount": 18,
      "isDemo": true,
      "createdAt": "2026-08-15T10:00:00.000Z",
      "updatedAt": "2026-10-18T10:00:00.000Z"
    },
    {
      "id": "listing-baner-2",
      "hostId": "user-host-2",
      "hostName": "Vikram Joshi",
      "hostAvatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      "hostVerified": true,
      "title": "Balewadi High Street Secure Dedicated Basement Slot",
      "subtitle": "Dedicated private bay in Baner",
      "description": "Numbered underground parking slot in modern commercial complex right on Balewadi High Street. Direct elevator access, automated boom barrier with license plate recognition, and round-the-clock security guard.",
      "address": "84, Balewadi High Street, Baner",
      "locality": "Baner",
      "city": "Pune",
      "landmark": "Opposite Cummins India Office",
      "latitude": 18.559,
      "longitude": 73.7868,
      "spaceType": "dedicated_private",
      "status": "published",
      "vehicleTypes": ["hatchback", "sedan", "suv"],
      "dimensions": { "lengthFt": 18, "widthFt": 8.5, "heightClearanceFt": 7.5 },
      "hourlyRateInr": 65,
      "dailyRateInr": 420,
      "monthlyRateInr": 6500,
      "isFeatured": true,
      "amenities": ["Automated Barrier", "CCTV Monitored", "Basement Shade", "Security Guard"],
      "photos": [
        {
          "id": "ph-baner-1",
          "url": "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=1000&q=80",
          "caption": "Illuminated basement parking bay B-14",
          "isPrimary": true
        }
      ],
      "accessInstructions": "Show ParkOrbit digital check-in pass at Level B1 security barrier.",
      "parkingRules": ["Park strictly within Bay B-14 lines"],
      "restrictions": "Height clearance strictly 7.5 feet.",
      "cancellationPolicy": "moderate",
      "minNoticeMinutes": 30,
      "openingHours": { "open": "00:00", "close": "23:59", "is24Hours": true },
      "availableDays": [0, 1, 2, 3, 4, 5, 6],
      "ratingAvg": 4.8,
      "reviewCount": 24,
      "isDemo": true,
      "createdAt": "2026-08-20T12:00:00.000Z",
      "updatedAt": "2026-10-18T10:00:00.000Z"
    },
    {
      "id": "listing-fc-road-3",
      "hostId": "user-host-2",
      "hostName": "Vikram Joshi",
      "hostAvatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      "hostVerified": true,
      "title": "FC Road Deccan Shoppers Covered Stilt Bay",
      "subtitle": "Commercial stilt space near Goodluck Chowk",
      "description": "Rare secure covered stilt space steps away from Goodluck Chowk and Fergusson College Road shopping precinct. Guarded entry with direct pedestrian gate onto FC Road.",
      "address": "19, Fergusson College Road, Deccan Gymkhana",
      "locality": "FC Road",
      "city": "Pune",
      "landmark": "Near Goodluck Chowk & FC Main Gate",
      "latitude": 18.5222,
      "longitude": 73.8416,
      "spaceType": "commercial_lot",
      "status": "published",
      "vehicleTypes": ["two_wheeler", "hatchback", "sedan"],
      "dimensions": { "lengthFt": 16.5, "widthFt": 8, "heightClearanceFt": 7.8 },
      "hourlyRateInr": 90,
      "dailyRateInr": 550,
      "isFeatured": false,
      "amenities": ["Valet Assistance", "Covered Stilt", "Surveillance Cameras", "Illuminated Bay"],
      "photos": [
        {
          "id": "ph-fcroad-1",
          "url": "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1000&q=80",
          "caption": "Covered ground floor stilt slot",
          "isPrimary": true
        }
      ],
      "accessInstructions": "Enter through Gate 2 beside Cafe Goodluck. Attendant will verify booking reference.",
      "parkingRules": ["Two-wheelers and compacts welcome"],
      "restrictions": "No overnight parking without prior 24h booking.",
      "cancellationPolicy": "strict",
      "minNoticeMinutes": 60,
      "openingHours": { "open": "08:00", "close": "23:00", "is24Hours": false },
      "availableDays": [0, 1, 2, 3, 4, 5, 6],
      "ratingAvg": 4.7,
      "reviewCount": 15,
      "isDemo": true,
      "createdAt": "2026-09-01T08:30:00.000Z",
      "updatedAt": "2026-10-18T10:00:00.000Z"
    },
    {
      "id": "listing-kothrud-4",
      "hostId": "user-host-1",
      "hostName": "Neha Kulkarni",
      "hostAvatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
      "hostVerified": true,
      "title": "Ideal Colony Metro Driveway Gated Bay",
      "subtitle": "Private gated driveway in Kothrud",
      "description": "Quiet residential driveway spot located 200 meters from Vanaz & Ideal Colony Metro Stations. Perfect for daily commuters riding Pune Metro into Shivajinagar or Swargate.",
      "address": "114, Ideal Colony, Paud Road, Kothrud",
      "locality": "Kothrud",
      "city": "Pune",
      "landmark": "Walking distance to Ideal Colony Metro",
      "latitude": 18.5074,
      "longitude": 73.8077,
      "spaceType": "driveway",
      "status": "published",
      "vehicleTypes": ["hatchback", "sedan"],
      "dimensions": { "lengthFt": 17, "widthFt": 8, "heightClearanceFt": 9 },
      "hourlyRateInr": 45,
      "dailyRateInr": 280,
      "monthlyRateInr": 4500,
      "isFeatured": false,
      "amenities": ["Gated Driveway", "Keyless Smart Lock", "Lighting"],
      "photos": [
        {
          "id": "ph-kothrud-1",
          "url": "https://images.unsplash.com/photo-1545179605-1296651e9d43?auto=format&fit=crop&w=1000&q=80",
          "caption": "Private residential driveway with lockable gate",
          "isPrimary": true
        }
      ],
      "accessInstructions": "Smart padlock code sent via SMS/in-app 15 minutes before booking.",
      "parkingRules": ["Close and latch gate when entering/leaving"],
      "restrictions": "Sedans and hatchbacks only.",
      "cancellationPolicy": "flexible",
      "minNoticeMinutes": 15,
      "openingHours": { "open": "00:00", "close": "23:59", "is24Hours": true },
      "availableDays": [0, 1, 2, 3, 4, 5, 6],
      "ratingAvg": 4.9,
      "reviewCount": 11,
      "isDemo": true,
      "createdAt": "2026-09-05T11:00:00.000Z",
      "updatedAt": "2026-10-18T10:00:00.000Z"
    },
    {
      "id": "listing-hinjewadi-5",
      "hostId": "user-host-2",
      "hostName": "Vikram Joshi",
      "hostAvatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      "hostVerified": true,
      "title": "Rajiv Gandhi Infotech Park TechZone Covered Commuter Bay",
      "subtitle": "Covered corporate bay in Hinjewadi Phase 1",
      "description": "Multi-level parking structure spot in Hinjewadi Phase 1, steps from major IT campuses and Shivaji Chowk. Monitored 24/7 with dedicated EV charging port.",
      "address": "Plot 28, Rajiv Gandhi Infotech Park, Phase 1, Hinjewadi",
      "locality": "Hinjewadi Phase 1",
      "city": "Pune",
      "landmark": "Near Shivaji Chowk & Wipro Circle",
      "latitude": 18.5913,
      "longitude": 73.7389,
      "spaceType": "covered",
      "status": "published",
      "vehicleTypes": ["hatchback", "sedan", "suv", "ev"],
      "dimensions": { "lengthFt": 18, "widthFt": 9, "heightClearanceFt": 8.2 },
      "hourlyRateInr": 55,
      "dailyRateInr": 350,
      "monthlyRateInr": 5200,
      "isFeatured": true,
      "amenities": ["24/7 RFID Boom Barrier", "CCTV Coverage", "EV Charging Point"],
      "photos": [
        {
          "id": "ph-hinj-1",
          "url": "https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=1000&q=80",
          "caption": "Multi-tier tech park covered deck",
          "isPrimary": true
        }
      ],
      "accessInstructions": "Scan QR on booking pass at Gate 3 automated scanner.",
      "parkingRules": ["Adhere to 15 km/h campus speed limit"],
      "restrictions": "Standard passenger vehicles and EVs.",
      "cancellationPolicy": "flexible",
      "minNoticeMinutes": 15,
      "openingHours": { "open": "00:00", "close": "23:59", "is24Hours": true },
      "availableDays": [0, 1, 2, 3, 4, 5, 6],
      "ratingAvg": 4.6,
      "reviewCount": 31,
      "isDemo": true,
      "createdAt": "2026-09-10T14:00:00.000Z",
      "updatedAt": "2026-10-18T10:00:00.000Z"
    },
    {
      "id": "listing-viman-nagar-6",
      "hostId": "user-host-1",
      "hostName": "Neha Kulkarni",
      "hostAvatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
      "hostVerified": true,
      "title": "Phoenix Marketcity Airport Corridor Open Pad",
      "subtitle": "Paved open space in Viman Nagar",
      "description": "Secure paved parking pad located directly behind Phoenix Marketcity in Viman Nagar. Ideal for airport park-and-fly transfers (Pune Airport is only 3 km away).",
      "address": "32, Viman Nagar Central Avenue, near Clover Park",
      "locality": "Viman Nagar",
      "city": "Pune",
      "landmark": "Adjacent to Phoenix Marketcity",
      "latitude": 18.5679,
      "longitude": 73.9143,
      "spaceType": "uncovered",
      "status": "published",
      "vehicleTypes": ["two_wheeler", "hatchback", "sedan", "suv"],
      "dimensions": { "lengthFt": 20, "widthFt": 10, "heightClearanceFt": 12 },
      "hourlyRateInr": 50,
      "dailyRateInr": 320,
      "monthlyRateInr": 4800,
      "isFeatured": false,
      "amenities": ["Wide Turning Bay", "Night Illumination", "Guard On Duty"],
      "photos": [
        {
          "id": "ph-vn-1",
          "url": "https://images.unsplash.com/photo-1470224114660-3f6686c562eb?auto=format&fit=crop&w=1000&q=80",
          "caption": "Paved surface parking lot with high perimeter wall",
          "isPrimary": true
        }
      ],
      "accessInstructions": "Security guard will check registration plate against manifest.",
      "parkingRules": ["Lock vehicle and take personal valuables"],
      "restrictions": "No hazardous cargo.",
      "cancellationPolicy": "flexible",
      "minNoticeMinutes": 30,
      "openingHours": { "open": "05:00", "close": "23:59", "is24Hours": false },
      "availableDays": [0, 1, 2, 3, 4, 5, 6],
      "ratingAvg": 4.8,
      "reviewCount": 19,
      "isDemo": true,
      "createdAt": "2026-09-12T09:15:00.000Z",
      "updatedAt": "2026-10-18T10:00:00.000Z"
    },
    {
      "id": "listing-magarpatta-7",
      "hostId": "user-host-2",
      "hostName": "Vikram Joshi",
      "hostAvatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      "hostVerified": true,
      "title": "Cybercity Tower 7 Premium Executive Portico",
      "subtitle": "Executive covered portico in Magarpatta City",
      "description": "Executive parking space situated inside Magarpatta Cybercity, close to Tower 7 and Destination Centre. Full security clearance with covered concrete deck.",
      "address": "Tower 7 Annex, Cybercity, Magarpatta City, Hadapsar",
      "locality": "Magarpatta City",
      "city": "Pune",
      "landmark": "Destination Centre & Cybercity Gate 1",
      "latitude": 18.5158,
      "longitude": 73.9272,
      "spaceType": "covered",
      "status": "published",
      "vehicleTypes": ["sedan", "suv", "ev"],
      "dimensions": { "lengthFt": 19, "widthFt": 9, "heightClearanceFt": 8.5 },
      "hourlyRateInr": 110,
      "dailyRateInr": 690,
      "isFeatured": true,
      "amenities": ["Executive Valet", "Underground Covered Deck", "CCTV 24/7"],
      "photos": [
        {
          "id": "ph-magar-1",
          "url": "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1000&q=80",
          "caption": "Executive portico with high overhead clearance",
          "isPrimary": true
        }
      ],
      "accessInstructions": "Enter through Cybercity Gate 1; security will cross-check driver phone number.",
      "parkingRules": ["Display ParkOrbit parking permit on dashboard"],
      "restrictions": "No unauthorized overnight vehicle storage.",
      "cancellationPolicy": "moderate",
      "minNoticeMinutes": 45,
      "openingHours": { "open": "07:00", "close": "22:00", "is24Hours": false },
      "availableDays": [1, 2, 3, 4, 5, 6],
      "ratingAvg": 4.9,
      "reviewCount": 14,
      "isDemo": true,
      "createdAt": "2026-09-18T16:00:00.000Z",
      "updatedAt": "2026-10-18T10:00:00.000Z"
    },
    {
      "id": "listing-wakad-8",
      "hostId": "user-host-2",
      "hostName": "Vikram Joshi",
      "hostAvatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      "hostVerified": true,
      "title": "Datta Mandir Road Hinjewadi Transit Dedicated Slot",
      "subtitle": "Gated residential stilt in Wakad",
      "description": "Convenient stilt bay in Wakad right next to Datta Mandir Road, perfect for IT commuters carpooling into Hinjewadi. 5 minutes from Mumbai-Pune Expressway bypass.",
      "address": "12, Datta Mandir Road, Shankar Kalat Nagar, Wakad",
      "locality": "Wakad",
      "city": "Pune",
      "landmark": "Close to Hinjewadi Flyover & Mumbai-Pune Bypass",
      "latitude": 18.5987,
      "longitude": 73.7686,
      "spaceType": "dedicated_private",
      "status": "published",
      "vehicleTypes": ["two_wheeler", "hatchback", "sedan"],
      "dimensions": { "lengthFt": 17, "widthFt": 8.5, "heightClearanceFt": 8 },
      "hourlyRateInr": 70,
      "dailyRateInr": 450,
      "isFeatured": false,
      "amenities": ["Gated Colony", "24/7 Guard", "Wide Access"],
      "photos": [
        {
          "id": "ph-wakad-1",
          "url": "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=1000&q=80",
          "caption": "Stilt level numbered bay W-03",
          "isPrimary": true
        }
      ],
      "accessInstructions": "Security guard will open automated gate upon showing PIN pass.",
      "parkingRules": ["Park strictly head-in"],
      "restrictions": "Passenger cars and motorbikes only.",
      "cancellationPolicy": "flexible",
      "minNoticeMinutes": 15,
      "openingHours": { "open": "00:00", "close": "23:59", "is24Hours": true },
      "availableDays": [0, 1, 2, 3, 4, 5, 6],
      "ratingAvg": 4.7,
      "reviewCount": 16,
      "isDemo": true,
      "createdAt": "2026-09-22T13:40:00.000Z",
      "updatedAt": "2026-10-18T10:00:00.000Z"
    }
  ],
  "blockedPeriods": [
    {
      "id": "block-demo-1",
      "listingId": "listing-koregaon-park-1",
      "startTime": "2026-10-25T08:00:00.000Z",
      "endTime": "2026-10-25T14:00:00.000Z",
      "reason": "Host family visiting for Sunday brunch (Demo Block)",
      "createdAt": "2026-10-15T10:00:00.000Z"
    }
  ],
  "bookings": [
    {
      "id": "booking-demo-upcoming",
      "referenceCode": "PKO-904112",
      "checkinPin": "4829",
      "listingId": "listing-koregaon-park-1",
      "listingTitle": "Koregaon Park Lane 5 Portico Bay & 7.4kW EV Fast Charger",
      "listingAddress": "Bungalow 42, Lane 5, Koregaon Park",
      "listingLocality": "Koregaon Park",
      "listingCity": "Pune",
      "listingPhotoUrl": "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1000&q=80",
      "listingSpaceType": "covered",
      "cancellationPolicy": "flexible",
      "accessInstructions": "Keypad code is 4829. Plug into EV wall box upon parking.",
      "driverId": "user-driver-1",
      "driverName": "Aarav Mehta",
      "driverEmail": "driver@demo.parkorbit.in",
      "driverPhone": "+91 98450 11223",
      "hostId": "user-host-1",
      "hostName": "Neha Kulkarni",
      "vehicleType": "ev",
      "vehiclePlate": "MH-12-RN-4821",
      "startTime": "2026-10-28T10:00:00.000Z",
      "endTime": "2026-10-28T14:00:00.000Z",
      "durationHours": 4,
      "pricingMode": "hourly",
      "baseSubtotalInr": 300,
      "platformCommissionPercent": 12,
      "driverServiceFeePercent": 5,
      "driverServiceFeeInr": 15,
      "platformHostCommissionInr": 36,
      "totalDriverPaidInr": 315,
      "netHostEarningsInr": 264,
      "status": "confirmed",
      "refundAmountInr": 0,
      "refundStatus": "none",
      "payoutStatus": "estimated",
      "paymentMethod": "upi_simulated",
      "paymentReference": "SIM-UPI-904112",
      "hasReview": false,
      "isDemo": true,
      "createdAt": "2026-10-18T09:00:00.000Z"
    },
    {
      "id": "booking-demo-completed-1",
      "referenceCode": "PKO-773210",
      "checkinPin": "3104",
      "listingId": "listing-koregaon-park-1",
      "listingTitle": "Koregaon Park Lane 5 Portico Bay & 7.4kW EV Fast Charger",
      "listingAddress": "Bungalow 42, Lane 5, Koregaon Park",
      "listingLocality": "Koregaon Park",
      "listingCity": "Pune",
      "listingPhotoUrl": "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1000&q=80",
      "listingSpaceType": "covered",
      "cancellationPolicy": "flexible",
      "accessInstructions": "Keypad code is 3104.",
      "driverId": "user-driver-1",
      "driverName": "Aarav Mehta",
      "driverEmail": "driver@demo.parkorbit.in",
      "driverPhone": "+91 98450 11223",
      "hostId": "user-host-1",
      "hostName": "Neha Kulkarni",
      "vehicleType": "ev",
      "vehiclePlate": "MH-12-RN-4821",
      "startTime": "2026-10-12T11:00:00.000Z",
      "endTime": "2026-10-12T19:00:00.000Z",
      "durationHours": 8,
      "pricingMode": "daily",
      "baseSubtotalInr": 480,
      "platformCommissionPercent": 12,
      "driverServiceFeePercent": 5,
      "driverServiceFeeInr": 24,
      "platformHostCommissionInr": 57.6,
      "totalDriverPaidInr": 504,
      "netHostEarningsInr": 422.4,
      "status": "completed",
      "checkedInAt": "2026-10-12T11:05:00.000Z",
      "refundAmountInr": 0,
      "refundStatus": "none",
      "payoutStatus": "estimated",
      "paymentMethod": "upi_simulated",
      "paymentReference": "SIM-UPI-773210",
      "hasReview": true,
      "isDemo": true,
      "createdAt": "2026-10-11T15:00:00.000Z"
    },
    {
      "id": "booking-demo-completed-2",
      "referenceCode": "PKO-651098",
      "checkinPin": "8821",
      "listingId": "listing-baner-2",
      "listingTitle": "Balewadi High Street Secure Dedicated Basement Slot",
      "listingAddress": "84, Balewadi High Street, Baner",
      "listingLocality": "Baner",
      "listingCity": "Pune",
      "listingPhotoUrl": "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=1000&q=80",
      "listingSpaceType": "dedicated_private",
      "cancellationPolicy": "moderate",
      "accessInstructions": "Show ParkOrbit app pass at B1 barrier.",
      "driverId": "user-driver-1",
      "driverName": "Aarav Mehta",
      "driverEmail": "driver@demo.parkorbit.in",
      "driverPhone": "+91 98450 11223",
      "hostId": "user-host-2",
      "hostName": "Vikram Joshi",
      "vehicleType": "ev",
      "vehiclePlate": "MH-12-RN-4821",
      "startTime": "2026-10-14T09:00:00.000Z",
      "endTime": "2026-10-14T13:00:00.000Z",
      "durationHours": 4,
      "pricingMode": "hourly",
      "baseSubtotalInr": 260,
      "platformCommissionPercent": 12,
      "driverServiceFeePercent": 5,
      "driverServiceFeeInr": 13,
      "platformHostCommissionInr": 31.2,
      "totalDriverPaidInr": 273,
      "netHostEarningsInr": 228.8,
      "status": "completed",
      "checkedInAt": "2026-10-14T09:02:00.000Z",
      "refundAmountInr": 0,
      "refundStatus": "none",
      "payoutStatus": "estimated",
      "paymentMethod": "upi_simulated",
      "paymentReference": "SIM-UPI-651098",
      "hasReview": false,
      "isDemo": true,
      "createdAt": "2026-10-13T18:00:00.000Z"
    }
  ],
  "payments": [
    {
      "id": "pay-demo-1",
      "bookingId": "booking-demo-upcoming",
      "bookingReference": "PKO-904112",
      "payerId": "user-driver-1",
      "hostId": "user-host-1",
      "provider": "upi_simulated",
      "paymentMethodDetail": "aarav.mehta@okicici (Simulated UPI)",
      "amountInr": 315,
      "refundedAmountInr": 0,
      "currency": "INR",
      "status": "succeeded_simulated",
      "transactionRef": "SIM-UPI-904112",
      "isSimulated": true,
      "createdAt": "2026-10-18T09:00:00.000Z"
    },
    {
      "id": "pay-demo-2",
      "bookingId": "booking-demo-completed-1",
      "bookingReference": "PKO-773210",
      "payerId": "user-driver-1",
      "hostId": "user-host-1",
      "provider": "upi_simulated",
      "paymentMethodDetail": "aarav.mehta@okicici (Simulated UPI)",
      "amountInr": 504,
      "refundedAmountInr": 0,
      "currency": "INR",
      "status": "succeeded_simulated",
      "transactionRef": "SIM-UPI-773210",
      "isSimulated": true,
      "createdAt": "2026-10-11T15:00:00.000Z"
    },
    {
      "id": "pay-demo-3",
      "bookingId": "booking-demo-completed-2",
      "bookingReference": "PKO-651098",
      "payerId": "user-driver-1",
      "hostId": "user-host-2",
      "provider": "upi_simulated",
      "paymentMethodDetail": "aarav.mehta@okicici (Simulated UPI)",
      "amountInr": 273,
      "refundedAmountInr": 0,
      "currency": "INR",
      "status": "succeeded_simulated",
      "transactionRef": "SIM-UPI-651098",
      "isSimulated": true,
      "createdAt": "2026-10-13T18:00:00.000Z"
    }
  ],
  "reviews": [
    {
      "id": "rev-demo-1",
      "bookingId": "booking-demo-completed-1",
      "listingId": "listing-koregaon-park-1",
      "driverId": "user-driver-1",
      "driverName": "Aarav Mehta",
      "driverAvatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      "rating": 5,
      "comment": "Spotless covered portico in Koregaon Park Lane 5. The keypad gate opened immediately and the 7.4kW wall charger topped up my EV while I was dining at Sante Spa Cuisine. (Demo Review)",
      "isDemo": true,
      "createdAt": "2026-10-12T19:30:00.000Z"
    }
  ],
  "reports": [
    {
      "id": "report-demo-1",
      "reporterId": "user-driver-1",
      "reporterName": "Aarav Mehta",
      "targetType": "listing",
      "targetId": "listing-hinjewadi-5",
      "targetTitle": "Rajiv Gandhi Infotech Park TechZone Covered Commuter Bay",
      "reasonCategory": "access_issue",
      "description": "Demo moderation sample: Phase 1 signage was partially obscured by road repairs near Shivaji Chowk.",
      "status": "open",
      "createdAt": "2026-10-17T11:20:00.000Z"
    }
  ]
}
```

---

## 5. Verification Method

Once implemented by the Worker, execute the following commands to independently verify the solution:

### 5.1 Verification Step 1: Reseed Database
```bash
npm run seed
```
**Pass Condition**: Exits with code 0 and outputs:
```
[ParkOrbit] Database successfully seeded with 100% Pune data:
 - 4 Demo Users (Aarav Mehta, Neha Kulkarni, Vikram Joshi, Nandini Sharma (Trust & Safety))
 - 8 Pune Listings
 - 3 Sample Bookings
 - Destination: data/parkorbit-db.json
```

### 5.2 Verification Step 2: Zero Non-Pune Reference Audit on Data Layer
Run the following PowerShell scan to ensure zero lingering non-Pune references exist in `data/parkorbit-db.json` and `src/lib/db.ts`:
```powershell
Get-ChildItem -Path "data/parkorbit-db.json", "src/lib/db.ts" | Select-String -Pattern "Bengaluru|Bangalore|Mumbai|Delhi|Indiranagar|Koramangala|Whitefield|Jayanagar|Bandra|Connaught|12\.9784|77\.6408|KA-\d\d|DL-\d\d"
```
**Pass Condition**: Zero matches returned.

### 5.3 Verification Step 3: Run Vitest Test Suite
```bash
npm test
```
**Pass Condition**: All tests pass with 0 failures.

### 5.4 Verification Step 4: Validate Direct `getDb()` / `readDb()` Pune Boundaries
Execute a direct node assertion script:
```powershell
node -e "const db = JSON.parse(require('fs').readFileSync('data/parkorbit-db.json', 'utf8')); const allPune = db.listings.every(l => l.city === 'Pune' && l.latitude >= 18.40 && l.latitude <= 18.65 && l.longitude >= 73.70 && l.longitude <= 74.00); if (!allPune) { console.error('FAILED: Non-Pune listings found'); process.exit(1); } console.log('PASSED: All', db.listings.length, 'listings strictly within Pune boundaries.');"
```
**Pass Condition**: Exits with code 0 and logs:
`PASSED: All 8 listings strictly within Pune boundaries.`
