# Milestone 1 Explorer 3 Handoff: Test Adaptation Specification for `tests/marketplace.test.ts`

## 1. Observation

### 1.1 Existing Test Suite Structure (`tests/marketplace.test.ts`)
The test file `tests/marketplace.test.ts` spans 386 lines containing 7 `describe` blocks and exactly 14 tests executed via Vitest (`npm test`):

1. **Pricing & Commission Engine** (`tests/marketplace.test.ts:30-91`):
   - Test 1 (lines 31–51): Uses `listing-indiranagar-1` to verify 4h @ ₹75/hr calculation.
   - Test 2 (lines 53–67): Uses `listing-indiranagar-1` to verify daily cap at ₹480.
   - Test 3 (lines 69–90): Uses `listing-indiranagar-1` and `user-admin-1` to test dynamic commission updates.
2. **Availability & Conflict Prevention Engine** (`tests/marketplace.test.ts:93-152`):
   - Test 4 (lines 94–117): Uses `listing-indiranagar-1` and seeded upcoming booking on `2026-10-22`.
   - Test 5 (lines 119–151): Uses `listing-indiranagar-1` and `user-host-1` with blackout block.
3. **Search, Filtering & Geospatial Discovery** (`tests/marketplace.test.ts:154-188`):
   - Test 6 (lines 155–173): Queries `searchListings({ query: "Indiranagar" })` and checks `locality === "Indiranagar"`.
   - Test 7 (lines 175–188): Passes Indiranagar Metro coordinates `lat: 12.9784, lng: 77.6408` with `sortBy: "distance"`, expecting `results[0].id === "listing-indiranagar-1"`.
4. **Booking Lifecycle, Double-Booking Guard, Check-in PIN & Cancellation** (`tests/marketplace.test.ts:190-290`):
   - Test 8 (lines 191–220): Uses `listing-koramangala-2`, vehicle plate `"KA-05-AB-9999"`, and conflict plate `"KA-03-XY-1234"`.
   - Test 9 (lines 222–256): Uses `listing-indiranagar-1` and vehicle plate `"KA-01-EV-2026"`.
   - Test 10 (lines 257–290): Uses `listing-indiranagar-1` with flexible cancellation, vehicle plate `"KA-01-MJ-4821"`.
5. **Host Listing Management & Draft Support** (`tests/marketplace.test.ts:292-327`):
   - Test 11 (lines 293–326): Creates draft with title `"Indiranagar 80ft Road Private Carport Draft"`, `locality: "Indiranagar"`, `city: "Bengaluru"`, address `"14, 80ft Road, Indiranagar"`.
6. **Reviews & Trust Moderation** (`tests/marketplace.test.ts:329-363`):
   - Test 12 (lines 330–341): Reviews `booking-demo-completed-2`, mentions `"Koramangala"`, queries `getListingDetails("listing-koramangala-2")`.
   - Test 13 (lines 343–362): Files report on `listing-mgroad-3` with title `"Trinity Circle Heritage Courtyard Deck"`, resolved by `user-admin-1`.
7. **User Registration, Authentication & Profile Management** (`tests/marketplace.test.ts:365-384`):
   - Test 14 (lines 366–383): Registers `Rohan Deshmukh`, updates `defaultVehiclePlate: "KA-01-ZZ-1111"`.

### 1.2 Non-Pune References in `tests/marketplace.test.ts`
All 28 non-Pune string references identified in `tests/marketplace.test.ts`:
- Line 33: `"listing-indiranagar-1"`
- Line 55: `"listing-indiranagar-1"`
- Line 76: `"listing-indiranagar-1"`
- Line 96: `"listing-indiranagar-1"`
- Line 121: `"listing-indiranagar-1"`
- Line 156: `query: "Indiranagar"`
- Line 158: `expect(indiranagarListings[0].locality).toBe("Indiranagar")`
- Line 176: `// Coordinates near Indiranagar Metro (12.9784, 77.6408)`
- Line 178: `lat: 12.9784`
- Line 179: `lng: 77.6408`
- Line 184: `expect(results[0].id).toBe("listing-indiranagar-1")`
- Line 193: `listingId: "listing-koramangala-2"`
- Line 197: `vehiclePlate: "KA-05-AB-9999"`
- Line 212: `listingId: "listing-koramangala-2"`
- Line 216: `vehiclePlate: "KA-03-XY-1234"`
- Line 224: `listingId: "listing-indiranagar-1"`
- Line 228: `vehiclePlate: "KA-01-EV-2026"`
- Line 259: `listingId: "listing-indiranagar-1"`
- Line 263: `vehiclePlate: "KA-01-MJ-4821"`
- Line 281: `listingId: "listing-indiranagar-1"`
- Line 285: `vehiclePlate: "KA-01-MJ-4821"`
- Line 295: `title: "Indiranagar 80ft Road Private Carport Draft"`
- Line 296: `locality: "Indiranagar"`
- Line 297: `city: "Bengaluru"`
- Line 316: `address: "14, 80ft Road, Indiranagar"`
- Line 335: `comment: "... wide basement bay in Koramangala."`
- Line 339: `getListingDetails("listing-koramangala-2")`
- Line 346: `targetId: "listing-mgroad-3"`
- Line 347: `targetTitle: "Trinity Circle Heritage Courtyard Deck"`
- Line 360: `getListingDetails("listing-mgroad-3")`
- Line 379: `defaultVehiclePlate: "KA-01-ZZ-1111"`
- Line 382: `expect(updated.defaultVehiclePlate).toBe("KA-01-ZZ-1111")`

---

## 2. Logic Chain

1. **Premise 1 (Seed Migration Alignment)**: Explorer 1 & Explorer 2 are migrating `src/lib/seed.ts` and `data/parkorbit-db.json` from Bengaluru/Mumbai/Delhi to authentic Pune entities:
   - `listing-indiranagar-1` (₹75/hr, ₹480/day, flexible, covered, portico) -> `listing-koregaon-park-1` (₹75/hr, ₹480/day, flexible, covered, Koregaon Park Lane 5, lat: 18.5362, lng: 73.8940).
   - `listing-koramangala-2` (₹65/hr, ₹420/day, moderate, dedicated_private) -> `listing-baner-2` (₹65/hr, ₹420/day, moderate, dedicated_private, Balewadi High Street, lat: 18.5590, lng: 73.7868).
   - `listing-mgroad-3` (₹90/hr, commercial_lot) -> `listing-fc-road-3` (₹90/hr, commercial_lot, Fergusson College Road, lat: 18.5222, lng: 73.8416).
2. **Premise 2 (Preservation of Test Semantics)**:
   - Tests 1–3 verify hourly rates, daily caps, and dynamic commission math. Because `listing-koregaon-park-1` retains ₹75/hr and ₹480/day rates, replacing the listing ID preserves the exact numerical expectations (₹300, ₹15, ₹315, ₹36, ₹264).
   - Tests 4–5 verify availability overlaps and blackout blocks. `booking-demo-upcoming` and host blocks are attached to `listing-koregaon-park-1`, maintaining the identical date/time mechanics.
   - Test 6 verifies locality filtering. Querying `"Koregaon Park"` directly validates Pune locality search.
   - Test 7 tests geospatial Haversine proximity. Coordinates `lat: 18.5362, lng: 73.8940` place the query right at `listing-koregaon-park-1` (distance 0.0 km < 1 km), while the next nearest Pune listing (`listing-fc-road-3` or `listing-viman-nagar-6`) is >4 km away, ensuring `results[0].id === "listing-koregaon-park-1"`.
   - Tests 8–10 test booking creation, double-booking guard, PIN check-in, and flexible cancellation. Changing listing IDs to `listing-baner-2` and `listing-koregaon-park-1` and plates to Maharashtra `MH-12-*` / `MH-14-*` preserves the flow while removing all Karnataka `KA-*` plates.
   - Test 11 verifies draft creation and publishing with Koregaon Park / Pune address.
   - Tests 12–13 verify review submissions and admin trust reports using `listing-baner-2` and `listing-fc-road-3`.
   - Test 14 verifies user registration and profile update with `MH-12-ZZ-1111`.
3. **Premise 3 (Acceptance Criteria R1 & R2 Verification)**:
   - Requirement R1 demands that 100% of seeded listings, hubs, and bookings have valid Pune coordinates (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`) and `city === "Pune"`.
   - Requirement R2 demands explicit roles (`driver`, `host`, `admin`) for seeded accounts without legacy generic `"user"`.
   - Requirement R4 demands a seamless Host->Driver demo flow (Host publishes space -> Driver discovers and reserves -> Host views reservation).
4. **Conclusion**:
   - Updating the 14 tests to Pune IDs and `MH-*` plates guarantees zero regression on existing functionality.
   - Appending a dedicated 8th section with 5 new tests (`describe("8. Pune Localization, Demographic & Geospatial Integrity")`) programmatically enforces the Pune boundaries, zero non-Pune cities, role assignments, and the live demo workflow.

---

## 3. Caveats

1. **Sequential Execution & DB Reset**: `resetDatabaseForTests()` runs in `beforeEach()`. Because `data/parkorbit-db.json` is modified in-place, the tests rely on the new `src/lib/seed.ts` having been written and compiled so that `resetDatabaseForTests()` restores Pune seed data.
2. **Coordinates Boundary**: The bounding box in `PROJECT.md` is `18.40 <= lat <= 18.65` and `73.70 <= lng <= 74.00`. All 8 Pune listings and 10 Urban Hubs must fall strictly within these numeric bounds (e.g. Hinjewadi P2 at 73.7190, Viman Nagar at 73.9143, etc. all satisfy `[73.70, 74.00]`).
3. **No Uncommitted Dependency**: The new test imports `URBAN_HUBS` from `../src/lib/seed`, which is already exported in `seed.ts`.

---

## 4. Conclusion & Test Specification

### 4.1 Detailed Mapping Table for Existing 14 Tests

| Test # | Description | Old Bengaluru Reference | New Pune Reference | Notes |
|---|---|---|---|---|
| **Test 1** | Hourly pricing & fee calculation | `listing-indiranagar-1` (₹75/hr) | `listing-koregaon-park-1` (₹75/hr) | Exact math unchanged (₹300 base, ₹15 fee, ₹36 comm) |
| **Test 2** | Daily rate cap switch | `listing-indiranagar-1` (₹480/day) | `listing-koregaon-park-1` (₹480/day) | 10h @ ₹75 = ₹750 caps at ₹480 |
| **Test 3** | Admin commission config dynamic update | `listing-indiranagar-1`, `user-admin-1` | `listing-koregaon-park-1`, `user-admin-1` | 18% commission = ₹54, net host = ₹246 |
| **Test 4** | Overlapping booking conflict prevention | `listing-indiranagar-1`, seeded booking | `listing-koregaon-park-1`, seeded booking | `2026-10-22T12:00:00Z` conflict rejected |
| **Test 5** | Blackout periods blocking availability | `listing-indiranagar-1`, `user-host-1` | `listing-koregaon-park-1`, `user-host-1` | Driveway resurfacing block |
| **Test 6** | Search by locality, vehicle, price | `query: "Indiranagar"` | `query: "Koregaon Park"` | Checks locality `"Koregaon Park"`, budget <= ₹60 |
| **Test 7** | Haversine distance calculation & sort | `lat: 12.9784, lng: 77.6408` (Indiranagar Metro) | `lat: 18.5362, lng: 73.8940` (Koregaon Park Lane 5) | `results[0].id === "listing-koregaon-park-1"`, `distanceKm < 1` |
| **Test 8** | Confirmed booking creation & CONFLICT guard | `listing-koramangala-2`, `KA-05-AB-9999`, `KA-03-XY-1234` | `listing-baner-2`, `MH-12-AB-9999`, `MH-14-XY-1234` | Checks `PKO-\d{6}` reference code & 4-digit PIN |
| **Test 9** | 4-digit PIN check-in & completion | `listing-indiranagar-1`, `KA-01-EV-2026`, `user-host-1` | `listing-koregaon-park-1`, `MH-12-EV-2026`, `user-host-1` | PIN validation, transitions to `checked_in` & `completed` |
| **Test 10** | Flexible cancellation & slot freeing | `listing-indiranagar-1`, `KA-01-MJ-4821` | `listing-koregaon-park-1`, `MH-12-RN-4821` | 100% refund on flexible tier; slot re-bookable |
| **Test 11** | Host draft listing creation & publishing | Title `"Indiranagar 80ft Road..."`, Locality `"Indiranagar"`, City `"Bengaluru"` | Title `"Koregaon Park North Main Road..."`, Locality `"Koregaon Park"`, City `"Pune"` | Draft hidden from public search, visible to host, public after publish |
| **Test 12** | Driver review on completed booking | `booking-demo-completed-2`, `listing-koramangala-2`, `"Koramangala"` | `booking-demo-completed-2`, `listing-baner-2`, `"Baner"` | Rating 5 appended to listing reviews |
| **Test 13** | Trust report & admin listing flagging | `listing-mgroad-3`, `"Trinity Circle Heritage..."` | `listing-fc-road-3`, `"Fergusson College Road Courtyard Deck"` | Listing flagged by `user-admin-1` |
| **Test 14** | User register & vehicle plate update | `defaultVehiclePlate: "KA-01-ZZ-1111"` | `defaultVehiclePlate: "MH-12-ZZ-1111"` | Pune/MH registration verification |

---

### 4.2 New Tests Specification (Section 8: Pune Localization & Integrity)

The following 5 new tests must be added in `tests/marketplace.test.ts`:

1. **Test 15: `asserts 100% of seeded listings are in Pune with valid Pune coordinates`**
   - Assert `db.listings.length >= 8`
   - Assert `db.listings.every((l) => l.city === "Pune") === true`
   - Assert every listing satisfies `18.40 <= latitude <= 18.65` and `73.70 <= longitude <= 74.00`
   - Assert `db.listings.filter((l) => ["Bengaluru", "Bangalore", "Mumbai", "Delhi", "New Delhi"].includes(l.city)).length === 0`

2. **Test 16: `verifies all 10 Urban Hubs are situated in Pune within coordinate bounds`**
   - Assert `URBAN_HUBS.length === 10`
   - Assert `URBAN_HUBS.every((h) => h.city === "Pune") === true`
   - Assert every hub satisfies `18.40 <= latitude <= 18.65` and `73.70 <= longitude <= 74.00`

3. **Test 17: `verifies seeded demo users have explicit roles ('driver', 'host', 'admin') and authentic Pune MH plates`**
   - Assert `user-driver-1` exists, `role === "driver"`, `defaultVehiclePlate` matches `/^MH-(12|14)-/`
   - Assert `user-host-1` exists, `role === "host"`, `defaultVehiclePlate` matches `/^MH-(12|14)-/`
   - Assert `user-host-2` exists, `role === "host"`, `defaultVehiclePlate` matches `/^MH-(12|14)-/`
   - Assert `user-admin-1` exists, `role === "admin"`, `defaultVehiclePlate` matches `/^MH-(12|14)-/`
   - Assert `db.users.filter((u) => u.isDemo).every((u) => ["driver", "host", "admin"].includes(u.role)) === true`

4. **Test 18: `verifies seeded bookings and reviews reference Pune listings and MH vehicle plates`**
   - Assert `db.bookings.length >= 3`
   - Assert `db.bookings.every((b) => b.listingCity === "Pune") === true`
   - Assert `db.bookings.every((b) => b.vehiclePlate.startsWith("MH-")) === true`
   - Assert `db.reviews.length >= 1`

5. **Test 19: `executes the complete Host -> Driver demo lifecycle in Pune`**
   - Host `user-host-1` creates a published Pune listing at `18.5375, 73.8960`
   - Driver `user-driver-1` finds it via `searchListings({ query: "German Bakery", city: "Pune" })`
   - Driver creates a confirmed booking with plate `MH-12-RN-4821`
   - Host inspects `getListingDetails` and confirms the reservation is present in `reservedSlots`

---

### 4.3 Complete Proposed Code for `tests/marketplace.test.ts`

The Worker can directly replace `tests/marketplace.test.ts` with this complete, drop-in code:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  resetDatabaseForTests,
  readDb,
  registerUser,
  authenticateUser,
  updateUserProfile,
  searchListings,
  getListingDetails,
  createListing,
  updateListing,
  addBlockedPeriod,
  removeBlockedPeriod,
  createBooking,
  cancelBooking,
  checkinOrCompleteBooking,
  createReview,
  createReport,
  resolveReportAsAdmin,
  updatePlatformConfigAsAdmin,
} from "../src/lib/db";
import { calculatePriceBreakdown, calculateCancellationRefund } from "../src/lib/pricing";
import { checkListingAvailability } from "../src/lib/availability";
import { URBAN_HUBS } from "../src/lib/seed";

describe("ParkOrbit Marketplace Engine — Unit & Integration Suite", () => {
  beforeEach(() => {
    resetDatabaseForTests();
  });

  describe("1. Pricing & Commission Engine", () => {
    it("calculates hourly pricing, driver service fee, and host commission accurately", () => {
      const db = readDb();
      const listing = db.listings.find((l) => l.id === "listing-koregaon-park-1")!;
      // 4 hours @ ₹75/hr = ₹300 base
      const breakdown = calculatePriceBreakdown(
        listing,
        "2026-10-28T10:00:00.000Z",
        "2026-10-28T14:00:00.000Z",
        db.config
      );

      expect(breakdown.durationHours).toBe(4);
      expect(breakdown.pricingMode).toBe("hourly");
      expect(breakdown.baseSubtotalInr).toBe(300);
      expect(breakdown.driverServiceFeePercent).toBe(5);
      expect(breakdown.driverServiceFeeInr).toBe(15);
      expect(breakdown.totalDriverPaidInr).toBe(315);
      expect(breakdown.platformCommissionPercent).toBe(12);
      expect(breakdown.platformHostCommissionInr).toBe(36);
      expect(breakdown.netHostEarningsInr).toBe(264);
    });

    it("automatically switches to daily cap when hourly cost exceeds daily rate", () => {
      const db = readDb();
      const listing = db.listings.find((l) => l.id === "listing-koregaon-park-1")!;
      // 10 hours @ ₹75/hr = ₹750, but dailyRateInr is ₹480
      const breakdown = calculatePriceBreakdown(
        listing,
        "2026-10-28T08:00:00.000Z",
        "2026-10-28T18:00:00.000Z",
        db.config
      );

      expect(breakdown.durationHours).toBe(10);
      expect(breakdown.pricingMode).toBe("daily");
      expect(breakdown.baseSubtotalInr).toBe(480);
    });

    it("dynamically reflects Admin commission rate changes across new price calculations", () => {
      const updatedConfig = updatePlatformConfigAsAdmin("user-admin-1", {
        commissionRatePercent: 18,
        driverServiceFeePercent: 6,
      });

      const db = readDb();
      const listing = db.listings.find((l) => l.id === "listing-koregaon-park-1")!;
      const breakdown = calculatePriceBreakdown(
        listing,
        "2026-10-28T10:00:00.000Z",
        "2026-10-28T14:00:00.000Z",
        updatedConfig
      );

      expect(breakdown.platformCommissionPercent).toBe(18);
      expect(breakdown.platformHostCommissionInr).toBe(54); // 18% of 300
      expect(breakdown.netHostEarningsInr).toBe(246);
      expect(breakdown.driverServiceFeePercent).toBe(6);
      expect(breakdown.driverServiceFeeInr).toBe(18);
      expect(breakdown.totalDriverPaidInr).toBe(318);
    });
  });

  describe("2. Availability & Conflict Prevention Engine", () => {
    it("detects overlapping confirmed reservations and blocks conflicting slots", () => {
      const db = readDb();
      const listing = db.listings.find((l) => l.id === "listing-koregaon-park-1")!;
      // Seeded booking-demo-upcoming is on 2026-10-22T10:00:00.000Z to 2026-10-22T14:00:00.000Z
      const conflictResult = checkListingAvailability(
        listing,
        "2026-10-22T12:00:00.000Z",
        "2026-10-22T15:00:00.000Z",
        db.bookings,
        db.blockedPeriods
      );
      expect(conflictResult.available).toBe(false);
      expect(conflictResult.reason).toContain("already reserved");

      // Non-overlapping window on the same day should be available
      const freeResult = checkListingAvailability(
        listing,
        "2026-10-22T15:00:00.000Z",
        "2026-10-22T18:00:00.000Z",
        db.bookings,
        db.blockedPeriods
      );
      expect(freeResult.available).toBe(true);
    });

    it("prevents booking during host-blocked blackout periods", () => {
      const db = readDb();
      const listing = db.listings.find((l) => l.id === "listing-koregaon-park-1")!;

      const block = addBlockedPeriod("user-host-1", listing.id, {
        startTime: "2026-11-05T09:00:00.000Z",
        endTime: "2026-11-05T17:00:00.000Z",
        reason: "Driveway resurfacing",
      });

      const updatedDb = readDb();
      const check = checkListingAvailability(
        listing,
        "2026-11-05T11:00:00.000Z",
        "2026-11-05T13:00:00.000Z",
        updatedDb.bookings,
        updatedDb.blockedPeriods
      );
      expect(check.available).toBe(false);
      expect(check.reason).toContain("Driveway resurfacing");

      // Removing the block restores availability
      removeBlockedPeriod("user-host-1", listing.id, block.id);
      const afterRemoveDb = readDb();
      const checkAfter = checkListingAvailability(
        listing,
        "2026-11-05T11:00:00.000Z",
        "2026-11-05T13:00:00.000Z",
        afterRemoveDb.bookings,
        afterRemoveDb.blockedPeriods
      );
      expect(checkAfter.available).toBe(true);
    });
  });

  describe("3. Search, Filtering & Geospatial Discovery", () => {
    it("filters listings by locality, vehicle compatibility, space type, and max hourly price", () => {
      const koregaonParkListings = searchListings({ query: "Koregaon Park" });
      expect(koregaonParkListings.length).toBeGreaterThanOrEqual(1);
      expect(koregaonParkListings[0].locality).toBe("Koregaon Park");

      const budgetListings = searchListings({ maxHourlyPrice: 60 });
      expect(budgetListings.every((l) => l.hourlyRateInr <= 60)).toBe(true);

      const coveredEvListings = searchListings({
        spaceType: "covered",
        vehicleType: "ev",
      });
      expect(coveredEvListings.length).toBeGreaterThanOrEqual(1);
      expect(
        coveredEvListings.every(
          (l) => l.spaceType === "covered" && l.vehicleTypes.includes("ev")
        )
      ).toBe(true);
    });

    it("computes Haversine distance when coordinates are supplied and sorts by distance", () => {
      // Coordinates near Koregaon Park Lane 5 (18.5362, 73.8940)
      const results = searchListings({
        lat: 18.5362,
        lng: 73.8940,
        sortBy: "distance",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("listing-koregaon-park-1");
      expect(results[0].distanceKm).toBeDefined();
      expect(results[0].distanceKm!).toBeLessThan(1);
    });
  });

  describe("4. Booking Lifecycle, Double-Booking Guard, Check-in PIN & Cancellation", () => {
    it("creates a confirmed booking with reference code, 4-digit PIN, and simulated payment record, and blocks overlapping bookings", () => {
      const { booking, payment } = createBooking("user-driver-1", {
        listingId: "listing-baner-2",
        startTime: "2026-11-10T09:00:00.000Z",
        endTime: "2026-11-10T13:00:00.000Z",
        vehicleType: "sedan",
        vehiclePlate: "MH-12-AB-9999",
        paymentMethod: "upi_simulated",
        paymentMethodDetail: "aarav@okicici",
      });

      expect(booking.status).toBe("confirmed");
      expect(booking.referenceCode).toMatch(/^PKO-\d{6}$/);
      expect(booking.checkinPin).toMatch(/^\d{4}$/);
      expect(booking.payoutStatus).toBe("pending_settlement");
      expect(payment.isSimulated).toBe(true);
      expect(payment.status).toBe("succeeded_simulated");

      // Attempt overlapping booking for same space
      expect(() =>
        createBooking("user-driver-1", {
          listingId: "listing-baner-2",
          startTime: "2026-11-10T11:00:00.000Z",
          endTime: "2026-11-10T14:00:00.000Z",
          vehicleType: "sedan",
          vehiclePlate: "MH-14-XY-1234",
          paymentMethod: "upi_simulated",
        })
      ).toThrow(/CONFLICT/);
    });

    it("verifies 4-digit check-in PIN and transitions booking to checked_in and completed", () => {
      const { booking } = createBooking("user-driver-1", {
        listingId: "listing-koregaon-park-1",
        startTime: "2026-11-12T10:00:00.000Z",
        endTime: "2026-11-12T12:00:00.000Z",
        vehicleType: "ev",
        vehiclePlate: "MH-12-EV-2026",
        paymentMethod: "upi_simulated",
      });

      // Invalid PIN throws error
      expect(() =>
        checkinOrCompleteBooking("user-driver-1", booking.id, "checkin", "0000")
      ).toThrow(/Invalid 4-digit Check-in/);

      // Valid PIN checks in
      const checkedIn = checkinOrCompleteBooking(
        "user-driver-1",
        booking.id,
        "checkin",
        booking.checkinPin
      );
      expect(checkedIn.status).toBe("checked_in");
      expect(checkedIn.checkedInAt).toBeDefined();

      // Complete booking
      const completed = checkinOrCompleteBooking(
        "user-host-1",
        booking.id,
        "complete"
      );
      expect(completed.status).toBe("completed");
      expect(completed.payoutStatus).toBe("estimated");
    });

    it("applies cancellation policy tiers and frees the slot for future bookings", () => {
      const { booking } = createBooking("user-driver-1", {
        listingId: "listing-koregaon-park-1", // flexible policy
        startTime: "2026-12-01T10:00:00.000Z",
        endTime: "2026-12-01T14:00:00.000Z",
        vehicleType: "ev",
        vehiclePlate: "MH-12-RN-4821",
        paymentMethod: "upi_simulated",
      });

      // Cancel 24 hours before start -> 100% refund under flexible policy
      const cancelled = cancelBooking(
        "user-driver-1",
        booking.id,
        "Meeting rescheduled",
        "2026-11-30T10:00:00.000Z"
      );

      expect(cancelled.booking.status).toBe("cancelled");
      expect(cancelled.booking.refundStatus).toBe("processed_simulated");
      expect(cancelled.booking.refundAmountInr).toBe(booking.totalDriverPaidInr);

      // Verify the slot is now free to book again
      const rebooked = createBooking("user-driver-1", {
        listingId: "listing-koregaon-park-1",
        startTime: "2026-12-01T10:00:00.000Z",
        endTime: "2026-12-01T14:00:00.000Z",
        vehicleType: "ev",
        vehiclePlate: "MH-12-RN-4821",
        paymentMethod: "card_simulated",
      });
      expect(rebooked.booking.status).toBe("confirmed");
    });
  });

  describe("5. Host Listing Management & Draft Support", () => {
    it("allows a host to save an incomplete listing as a draft and publish it after completing fields", () => {
      const draft = createListing("user-host-1", {
        title: "Koregaon Park North Main Road Private Carport Draft",
        locality: "Koregaon Park",
        city: "Pune",
        status: "draft",
      });

      expect(draft.status).toBe("draft");

      // Public search should NOT include drafts by default
      const publicListings = searchListings({ query: "Carport Draft" });
      expect(publicListings.length).toBe(0);

      // Host search with includeNonPublishedForHostId includes the draft
      const hostListings = searchListings({
        query: "Carport Draft",
        includeNonPublishedForHostId: "user-host-1",
      });
      expect(hostListings.length).toBe(1);

      // Update and publish
      const published = updateListing("user-host-1", draft.id, {
        address: "14, North Main Road, Koregaon Park",
        hourlyRateInr: 80,
        dailyRateInr: 500,
        vehicleTypes: ["sedan", "suv"],
        status: "published",
      });
      expect(published.status).toBe("published");

      const publicAfter = searchListings({ query: "Carport Draft" });
      expect(publicAfter.length).toBe(1);
    });
  });

  describe("6. Reviews & Trust Moderation", () => {
    it("allows a driver to review a completed booking and updates the listing rating average", () => {
      // booking-demo-completed-2 is completed and hasReview: false
      const review = createReview("user-driver-1", {
        bookingId: "booking-demo-completed-2",
        rating: 5,
        comment: "Effortless boom barrier access and wide basement bay in Baner.",
      });

      expect(review.rating).toBe(5);
      const details = getListingDetails("listing-baner-2")!;
      expect(details.reviews.some((r) => r.id === review.id)).toBe(true);
    });

    it("supports filing a trust report and allows Admin to resolve and flag/unlisted a listing", () => {
      const report = createReport("user-driver-1", {
        targetType: "listing",
        targetId: "listing-fc-road-3",
        targetTitle: "Fergusson College Road Courtyard Deck",
        reasonCategory: "safety_concern",
        description: "Night lighting bulb was flickering near bay #07.",
      });
      expect(report.status).toBe("open");

      const resolved = resolveReportAsAdmin("user-admin-1", report.id, {
        status: "resolved",
        adminNotes: "Contacted host to replace floodlight; temporarily flagged.",
        flagListing: true,
      });

      expect(resolved.status).toBe("resolved");
      const details = getListingDetails("listing-fc-road-3")!;
      expect(details.listing.status).toBe("flagged");
    });
  });

  describe("7. User Registration, Authentication & Profile Management", () => {
    it("registers a new user, authenticates by email, and updates vehicle plate & UPI ID", () => {
      const created = registerUser({
        name: "Rohan Deshmukh",
        email: "rohan@example.com",
        phone: "+91 98201 55443",
      });

      expect(created.id).toContain("user-");
      const authed = authenticateUser("rohan@example.com");
      expect(authed.id).toBe(created.id);

      const updated = updateUserProfile(created.id, created.id, {
        upiId: "rohan@okhdfcbank",
        defaultVehiclePlate: "MH-12-ZZ-1111",
      });
      expect(updated.upiId).toBe("rohan@okhdfcbank");
      expect(updated.defaultVehiclePlate).toBe("MH-12-ZZ-1111");
    });
  });

  describe("8. Pune Localization, Demographic & Geospatial Integrity", () => {
    it("asserts 100% of seeded listings are in Pune with valid Pune coordinates", () => {
      const db = readDb();
      expect(db.listings.length).toBeGreaterThanOrEqual(8);

      // All listings must have city === "Pune"
      expect(db.listings.every((l) => l.city === "Pune")).toBe(true);

      // All listings must be strictly within Pune coordinate bounding box (18.40-18.65 N, 73.70-74.00 E)
      db.listings.forEach((listing) => {
        expect(listing.latitude).toBeGreaterThanOrEqual(18.40);
        expect(listing.latitude).toBeLessThanOrEqual(18.65);
        expect(listing.longitude).toBeGreaterThanOrEqual(73.70);
        expect(listing.longitude).toBeLessThanOrEqual(74.00);
      });

      // Zero legacy cities exist in seeded database
      const nonPune = db.listings.filter((l) =>
        ["Bengaluru", "Bangalore", "Mumbai", "Delhi", "New Delhi"].includes(l.city)
      );
      expect(nonPune).toHaveLength(0);
    });

    it("verifies all 10 Urban Hubs are situated in Pune within coordinate bounds", () => {
      expect(URBAN_HUBS.length).toBe(10);
      expect(URBAN_HUBS.every((h) => h.city === "Pune")).toBe(true);

      URBAN_HUBS.forEach((hub) => {
        expect(hub.latitude).toBeGreaterThanOrEqual(18.40);
        expect(hub.latitude).toBeLessThanOrEqual(18.65);
        expect(hub.longitude).toBeGreaterThanOrEqual(73.70);
        expect(hub.longitude).toBeLessThanOrEqual(74.00);
      });
    });

    it("verifies seeded demo users have explicit roles ('driver', 'host', 'admin') and authentic Pune MH plates", () => {
      const db = readDb();
      const driver = db.users.find((u) => u.id === "user-driver-1");
      const host1 = db.users.find((u) => u.id === "user-host-1");
      const host2 = db.users.find((u) => u.id === "user-host-2");
      const admin = db.users.find((u) => u.id === "user-admin-1");

      expect(driver).toBeDefined();
      expect(driver?.role).toBe("driver");
      expect(driver?.defaultVehiclePlate).toMatch(/^MH-(12|14)-/);

      expect(host1).toBeDefined();
      expect(host1?.role).toBe("host");
      expect(host1?.defaultVehiclePlate).toMatch(/^MH-(12|14)-/);

      expect(host2).toBeDefined();
      expect(host2?.role).toBe("host");
      expect(host2?.defaultVehiclePlate).toMatch(/^MH-(12|14)-/);

      expect(admin).toBeDefined();
      expect(admin?.role).toBe("admin");
      expect(admin?.defaultVehiclePlate).toMatch(/^MH-(12|14)-/);

      // Verify no demo user retains legacy generic "user" role
      const demoUsers = db.users.filter((u) => u.isDemo);
      expect(demoUsers.every((u) => ["driver", "host", "admin"].includes(u.role))).toBe(true);
    });

    it("verifies seeded bookings and reviews reference Pune listings and MH vehicle plates", () => {
      const db = readDb();
      expect(db.bookings.length).toBeGreaterThanOrEqual(3);
      expect(db.bookings.every((b) => b.listingCity === "Pune")).toBe(true);
      expect(db.bookings.every((b) => b.vehiclePlate.startsWith("MH-"))).toBe(true);
      expect(db.reviews.length).toBeGreaterThanOrEqual(1);
    });

    it("executes the complete Host -> Driver demo lifecycle in Pune", () => {
      // 1. Host creates a new Pune parking space
      const newSpace = createListing("user-host-1", {
        title: "Koregaon Park North Main Road Guest Portico",
        locality: "Koregaon Park",
        city: "Pune",
        address: "Bungalow 7, North Main Road, Koregaon Park",
        landmark: "Opposite German Bakery",
        latitude: 18.5375,
        longitude: 73.8960,
        spaceType: "covered",
        hourlyRateInr: 80,
        dailyRateInr: 500,
        vehicleTypes: ["ev", "sedan"],
        status: "published",
      });
      expect(newSpace.id).toBeDefined();
      expect(newSpace.status).toBe("published");
      expect(newSpace.city).toBe("Pune");

      // 2. Driver discovers the newly published space via query & locality search
      const searchResults = searchListings({
        query: "German Bakery",
        city: "Pune",
      });
      expect(searchResults.some((s) => s.id === newSpace.id)).toBe(true);

      // 3. Driver reserves the spot
      const { booking } = createBooking("user-driver-1", {
        listingId: newSpace.id,
        startTime: "2026-11-20T10:00:00.000Z",
        endTime: "2026-11-20T13:00:00.000Z",
        vehicleType: "ev",
        vehiclePlate: "MH-12-RN-4821",
        paymentMethod: "upi_simulated",
      });
      expect(booking.status).toBe("confirmed");
      expect(booking.listingCity).toBe("Pune");

      // 4. Host inspects space reservations and confirms driver's booking is present
      const details = getListingDetails(newSpace.id)!;
      expect(details.reservedSlots.some((slot) => slot.id === booking.id)).toBe(true);
    });
  });
});
```

---

## 5. Verification Method

Once the Milestone 1 Worker updates `src/lib/types.ts`, `src/lib/seed.ts`, `data/parkorbit-db.json`, `src/lib/db.ts`, and applies this test specification:

1. **Run Unit & Integration Tests**:
   ```powershell
   npm test
   ```
   **Expected Output**:
   ```
   ✓ tests/marketplace.test.ts (19 tests)
   Test Files  1 passed (1)
        Tests  19 passed (19)
   ```
   All 14 adapted legacy tests + 5 new Pune integrity & lifecycle tests must pass with 0 errors.

2. **Verify Zero Non-Pune References in Tests**:
   ```powershell
   Get-Content tests/marketplace.test.ts | Select-String -Pattern "Bengaluru|Bangalore|Mumbai|Delhi|Indiranagar|Koramangala|Whitefield|Jayanagar|Bandra|Connaught|KA-\d\d|DL-\d\d"
   ```
   **Expected Output**: 0 matching lines (except within negation assertions such as `.includes(l.city)`).

3. **Type Check**:
   ```powershell
   npx tsc --noEmit
   ```
   **Expected Output**: Clean exit with 0 TypeScript diagnostics.
