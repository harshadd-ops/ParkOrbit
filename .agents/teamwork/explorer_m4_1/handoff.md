# Handoff Report — Explorer M4_1 (Milestone 4: End-to-End Demo Flow & Verification)

## 1. Observation

### O1: Stale Persona Reference in Admin Console
- **File**: `src/app/admin/page.tsx`, Lines 58 and 93.
- **Verbatim Code**:
  - Line 58:
    ```tsx
    toast.error(
      "Please switch to the Meera Krishnan (Admin) persona to update platform commission."
    );
    ```
  - Line 93:
    ```tsx
    toast.error(
      "Please switch to the Meera Krishnan (Admin) persona to moderate reports."
    );
    ```
- **Context & Canonical Definition**:
  - `src/lib/seed.ts` (lines 35-43) defines the Pune Admin persona as `user-admin-1`: Nandini Sharma (`role: "admin"`, `city: "Pune"`, `vehiclePlate: "MH-12-AD-0001"`).
  - `src/context/AuthContext.tsx` (lines 53-62) configures `DEMO_PERSONAS`:
    ```tsx
    {
      id: "user-admin-1",
      role: "admin",
      icon: "🛡️",
      name: "Nandini",
      fullName: "Nandini Sharma",
      label: "Admin (Nandini)",
      shortLabel: "Admin",
      mobileLabel: "🛡️ Nandini",
      targetPath: "/admin",
    }
    ```
  - `tests/challenger_m2_stress.test.ts` lines 545-555 explicitly flagged this defect:
    ```tsx
    // Identify if legacy persona 'Meera Krishnan' is mistakenly referenced in Admin toasts
    const hasMeeraKrishnan = adminPageContent.includes("Meera Krishnan");
    if (hasMeeraKrishnan) {
      console.warn(
        "[DEFECT DETECTED] src/app/admin/page.tsx contains stale persona reference 'Meera Krishnan' instead of 'Nandini Sharma'."
      );
    }
    expect(hasMeeraKrishnan).toBe(true);
    ```

### O2: Stale Out-of-State License Plate in Listing Detail Booking Form
- **File**: `src/app/listings/[id]/page.tsx`, Lines 120 and 949.
- **Verbatim Code**:
  - Line 120:
    ```tsx
    const [vehiclePlate, setVehiclePlate] = useState("KA-01-MJ-4821");
    ```
  - Line 949:
    ```tsx
    placeholder="KA-01-MJ-4821"
    ```
- **Context**:
  - `KA-01` is a legacy Bengaluru plate prefix.
  - Pune Driver Aarav Mehta (`user-driver-1`) is registered with plate `MH-12-RN-4821` (`src/lib/seed.ts:16`).
  - Currently, when a driver reserves a spot, the plate field defaults to `KA-01-MJ-4821` instead of syncing to the active driver's `MH-12-RN-4821` plate.

### O3: ListingForm Photo Payload Mismatch with DB Schema
- **Files**: `src/components/host/ListingForm.tsx:228-251` vs `src/lib/db.ts:397, 447-452`.
- **Verbatim Code**:
  - `ListingForm.tsx:245-250`:
    ```tsx
    photos: photoUrls.map((url, idx) => ({
      id: `ph-custom-${idx + 1}`,
      url,
      caption: idx === 0 ? "Primary space view" : "Access lane view",
      isPrimary: idx === 0,
    })),
    ```
    Payload does not pass `photoUrls` array.
  - `src/lib/db.ts:447-452`:
    ```tsx
    const photoUrls =
      input.photoUrls && input.photoUrls.length > 0
        ? input.photoUrls
        : [
            "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1000&q=80",
          ];
    ```
- **Impact**: Photos selected by the host in the UI are ignored, falling back to the default unsplash photo.

### O4: Host -> Driver -> Host End-to-End User Journey Trace
- **Host Space Creation**: `src/app/host/new/page.tsx` + `ListingForm.tsx` collects Pune coordinates via `HostLocationPicker` (Carto Voyager Leaflet tiles) and sends `POST /api/listings`. `createListing` in `src/lib/db.ts` validates host ownership, required address/locality/city, positive rates, and prepends to `db.listings` in `data/parkorbit-db.json`.
- **1-Click Persona Switch (Host -> Driver)**: Top Navbar persona switcher (`Navbar.tsx:93-117`) calls `switchUser("user-driver-1")`, setting cookie `pko_session_user=user-driver-1`, switching role to `"driver"`, updating nav links to only "Find Parking" and "My Bookings", and pushing to `/`.
- **Driver Discovery**: `/` renders `DriverDiscoveryMap.tsx` and listing feed. The newly published listing is searchable by Pune keyword/locality and rendered as an interactive Leaflet price pin at its exact coordinates. Clicking the pin/card navigates to `/listings/[id]`.
- **Driver Reservation**: `/listings/[id]` performs real-time conflict checking against existing bookings and blackout periods. Driver submits reservation via `POST /api/bookings`. `createBooking` authoritatively checks availability, computes price breakdown (12% host platform fee, 5% driver fee), generates 6-digit reference `PKO-XXXXXX` and 4-digit PIN, and saves to `db.bookings` with status `"confirmed"`.
- **1-Click Persona Switch (Driver -> Host)**: Clicking `Host (Neha)` in Navbar calls `switchUser("user-host-1")` and routes to `/dashboard/host`.
- **Host Incoming Reservations**: `/dashboard/host` fetches `/api/bookings?role=host`. The Reservations tab immediately displays the newly booked trip with driver name (`Aarav Mehta`), vehicle plate (`MH-12-RN-4821`), start/end times, and net host earnings (88% of base). Host can verify check-in using the driver's PIN (`handleVerifyCheckIn`), which transitions status to `checked_in`, then mark it `completed`.

### O5: Build & Existing Test Verification
- `npm run build`: Exited 0 with zero errors. All pages (`/`, `/dashboard/driver`, `/dashboard/host`, `/admin`, `/host/new`, `/listings/[id]`) compiled cleanly with static & dynamic rendering.
- `npm test`: Exited 0 with 105 passed tests across 6 test files.

---

## 2. Logic Chain

1. **Stale Persona Impact (O1)**:
   - When an unauthenticated user or driver attempts an administrative action in `src/app/admin/page.tsx`, the toast instructs them to switch to "Meera Krishnan (Admin)".
   - However, the 1-click persona switcher in `Navbar.tsx` only lists "Nandini (Admin)", creating confusion.
   - Updating lines 58 & 93 to "Nandini Sharma" removes the inconsistency.
   - Because `tests/challenger_m2_stress.test.ts:554` currently tests `expect(hasMeeraKrishnan).toBe(true)`, fixing the toast text will cause that test to fail unless line 554 is updated to `expect(hasMeeraKrishnan).toBe(false);`.

2. **Stale License Plate Impact (O2)**:
   - Acceptance criteria require 100% Pune localization and zero Bengaluru references.
   - In `src/app/listings/[id]/page.tsx`, defaulting `vehiclePlate` to `"KA-01-MJ-4821"` violates this requirement and causes reservations created through the UI to have Karnataka plates instead of Aarav Mehta's `MH-12-RN-4821`.
   - Initializing `vehiclePlate` with `user?.vehiclePlate || "MH-12-RN-4821"` and updating the placeholder fixes this.

3. **Photo Payload Alignment (O3)**:
   - Passing `photoUrls` from `ListingForm.tsx` to `POST /api/listings` ensures host-selected photos persist directly to the database rather than falling back to the default image.

4. **Automated End-to-End Suite Expansion (O4, O5)**:
   - The current `tests/marketplace.test.ts` (lines 464-506) tests basic listing creation and booking in 40 lines.
   - Creating a comprehensive, dedicated test suite in `tests/e2e_demo_flow.test.ts` that thoroughly tests each stage (Host space creation, coordinate boundary assertion, driver discovery via query and locality, driver booking and fee calculation, host incoming queue inspection, PIN check-in state transition, and conflict rejection) provides automated guarantees for Milestone 4.

---

## 3. Caveats

- **Test Concurrency & File Locking**: The JSON database `data/parkorbit-db.json` is written to disk during `createBooking`, `createListing`, and `resetDatabaseForTests`. When Vitest runs multiple test suites in parallel, simultaneous writes and reads of `data/parkorbit-db.json` can occasionally collide if file parallelism is enabled. In `tests/e2e_demo_flow.test.ts`, using `beforeEach(() => resetDatabaseForTests())` ensures deterministic test state.
- **Client-Side Leaflet SSR**: Leaflet requires `window` and `document` which do not exist during SSR. `DriverDiscoveryMap` and `HostLocationPicker` are properly dynamically imported with `ssr: false` in both `src/app/page.tsx` and `src/components/host/ListingForm.tsx`, as verified by the clean production build.
- **No changes made to source code**: In accordance with the Explorer archetype rules, zero files in `src/` or `tests/` were modified. All proposed changes are documented below for Worker 4.

---

## 4. Conclusion & Proposed Remediation

### Proposed Changes for Worker 4

#### Change 1: `src/app/admin/page.tsx`
Replace stale persona `Meera Krishnan` with `Nandini Sharma`:
- **Line 58**:
  ```tsx
  // Before:
  "Please switch to the Meera Krishnan (Admin) persona to update platform commission."
  // After:
  "Please switch to the Nandini Sharma (Admin) persona to update platform commission."
  ```
- **Line 93**:
  ```tsx
  // Before:
  "Please switch to the Meera Krishnan (Admin) persona to moderate reports."
  // After:
  "Please switch to the Nandini Sharma (Admin) persona to moderate reports."
  ```

#### Change 2: `tests/challenger_m2_stress.test.ts`
Update line 554 from expecting `true` to expecting `false`:
```tsx
// Line 554:
// Before:
expect(hasMeeraKrishnan).toBe(true);
// After:
expect(hasMeeraKrishnan).toBe(false);
```

#### Change 3: `src/app/listings/[id]/page.tsx`
Replace Bengaluru `KA-01` plate with active user's Pune `MH-12-RN-4821` plate:
- **Line 120**:
  ```tsx
  // Before:
  const [vehiclePlate, setVehiclePlate] = useState("KA-01-MJ-4821");
  // After:
  const [vehiclePlate, setVehiclePlate] = useState(user?.vehiclePlate || "MH-12-RN-4821");
  ```
- **Sync with user on load** (add after line 166):
  ```tsx
  useEffect(() => {
    if (user?.vehiclePlate) {
      setVehiclePlate(user.vehiclePlate);
    }
  }, [user?.vehiclePlate]);
  ```
- **Line 949**:
  ```tsx
  // Before:
  placeholder="KA-01-MJ-4821"
  // After:
  placeholder="MH-12-RN-4821"
  ```

#### Change 4: `src/components/host/ListingForm.tsx` & `src/lib/db.ts`
Ensure photo URLs are transmitted and accepted:
- In `src/components/host/ListingForm.tsx` around line 245:
  Include `photoUrls,` in payload.
- In `src/lib/db.ts` around line 447:
  ```tsx
  const photoUrls =
    input.photoUrls && input.photoUrls.length > 0
      ? input.photoUrls
      : (input as any).photos && Array.isArray((input as any).photos) && (input as any).photos.length > 0
        ? (input as any).photos.map((p: any) => p.url).filter(Boolean)
        : [
            "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1000&q=80",
          ];
  ```

#### Change 5: Comprehensive Automated Test Suite `tests/e2e_demo_flow.test.ts`
Worker 4 should create `tests/e2e_demo_flow.test.ts` with the following complete test suite:

```typescript
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import {
  resetDatabaseForTests,
  readDb,
  searchListings,
  getListingDetails,
  createListing,
  createBooking,
  checkinOrCompleteBooking,
} from "../src/lib/db";
import { calculatePriceBreakdown } from "../src/lib/pricing";
import { checkListingAvailability } from "../src/lib/availability";

describe("Milestone 4: End-to-End Demo Flow (Host -> Driver -> Host)", () => {
  beforeEach(() => {
    resetDatabaseForTests();
  });

  afterAll(() => {
    resetDatabaseForTests();
  });

  /* ------------------------------------------------------------------------
   * STAGE A: HOST CREATES & PUBLISHES PUNE PARKING SPACE
   * ------------------------------------------------------------------------ */
  describe("Stage A: Host Space Creation & Pune Persistence", () => {
    it("allows Host (Neha Kulkarni) to publish a new parking space with valid Pune coordinates", () => {
      const initialDb = readDb();
      const initialListingCount = initialDb.listings.length;

      const newListing = createListing("user-host-1", {
        title: "Koregaon Park Lane 7 Covered EV Bay",
        subtitle: "Covered bay near South Main Road",
        description: "Secure automated gated parking spot with 15A EV charging point.",
        address: "Lane 7, Koregaon Park",
        locality: "Koregaon Park",
        landmark: "Near Osho Teerth Park",
        city: "Pune",
        latitude: 18.5385,
        longitude: 73.8992,
        spaceType: "covered",
        hourlyRateInr: 90,
        dailyRateInr: 550,
        monthlyRateInr: 6500,
        vehicleTypes: ["hatchback", "sedan", "ev"],
        dimensions: { lengthFt: 18, widthFt: 9, heightClearanceFt: 8.5 },
        amenities: ["24/7 CCTV Surveillance", "15A EV Charging Point", "Gated Compound"],
        status: "published",
        photoUrls: [
          "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=900&q=80",
        ],
      });

      expect(newListing.id).toBeDefined();
      expect(newListing.hostId).toBe("user-host-1");
      expect(newListing.hostName).toBe("Neha Kulkarni");
      expect(newListing.status).toBe("published");
      expect(newListing.city).toBe("Pune");
      expect(newListing.hourlyRateInr).toBe(90);

      // Verify coordinate bounds strictly within Pune limits (18.40-18.65 N, 73.70-74.00 E)
      expect(newListing.latitude).toBeGreaterThanOrEqual(18.40);
      expect(newListing.latitude).toBeLessThanOrEqual(18.65);
      expect(newListing.longitude).toBeGreaterThanOrEqual(73.70);
      expect(newListing.longitude).toBeLessThanOrEqual(74.00);

      // Verify database persistence in data/parkorbit-db.json
      const afterDb = readDb();
      expect(afterDb.listings.length).toBe(initialListingCount + 1);
      const persisted = afterDb.listings.find((l) => l.id === newListing.id);
      expect(persisted).toBeDefined();
      expect(persisted?.title).toBe("Koregaon Park Lane 7 Covered EV Bay");
    });

    it("rejects publishing without required Pune address, locality, or positive rates", () => {
      expect(() => {
        createListing("user-host-1", {
          title: "Invalid Space",
          status: "published",
        });
      }).toThrow("Address, locality, and city are required to publish a listing.");
    });
  });

  /* ------------------------------------------------------------------------
   * STAGE B & C: DRIVER DISCOVERY & MAP PIN VERIFICATION
   * ------------------------------------------------------------------------ */
  describe("Stage B & C: Driver Discovery & Map Rendering Sync", () => {
    it("allows Driver to discover the newly created Pune space via locality filter and search query", () => {
      // 1. Host creates space
      const created = createListing("user-host-1", {
        title: "Baner Balewadi High Street Executive Bay",
        address: "Survey 45, Balewadi High Street",
        locality: "Baner",
        landmark: "Near Cummins India Campus",
        city: "Pune",
        latitude: 18.5742,
        longitude: 73.7788,
        spaceType: "dedicated_private",
        hourlyRateInr: 70,
        dailyRateInr: 450,
        vehicleTypes: ["sedan", "suv"],
        status: "published",
      });

      // 2. Driver searches by landmark query
      const queryResults = searchListings({
        query: "Cummins India",
        city: "Pune",
      });
      expect(queryResults.some((l) => l.id === created.id)).toBe(true);

      // 3. Driver filters by locality
      const localityResults = searchListings({
        query: "Baner",
        city: "Pune",
      });
      const foundInLocality = localityResults.find((l) => l.id === created.id);
      expect(foundInLocality).toBeDefined();
      expect(foundInLocality?.locality).toBe("Baner");
      expect(foundInLocality?.city).toBe("Pune");

      // 4. Verify map rendering coordinates and hourly price marker
      expect(foundInLocality?.latitude).toBe(18.5742);
      expect(foundInLocality?.longitude).toBe(73.7788);
      expect(foundInLocality?.hourlyRateInr).toBe(70);
    });
  });

  /* ------------------------------------------------------------------------
   * STAGE D: DRIVER RESERVES THE SPOT (BOOKING & FINANCIAL CALCULATION)
   * ------------------------------------------------------------------------ */
  describe("Stage D: Driver Spot Reservation & Payment Simulation", () => {
    it("creates a confirmed booking with accurate financial breakdown and 4-digit check-in PIN", () => {
      const listing = createListing("user-host-1", {
        title: "Viman Nagar Symbiosis Bay",
        address: "Row House 3, Clover Park",
        locality: "Viman Nagar",
        landmark: "Behind Symbiosis Law College",
        city: "Pune",
        latitude: 18.5679,
        longitude: 73.9143,
        spaceType: "covered",
        hourlyRateInr: 60,
        dailyRateInr: 400,
        vehicleTypes: ["sedan", "hatchback"],
        status: "published",
      });

      // 3 hours @ ₹60/hr: Base subtotal = ₹180
      const startTime = "2026-11-25T10:00:00.000Z";
      const endTime = "2026-11-25T13:00:00.000Z";

      const { booking, payment } = createBooking("user-driver-1", {
        listingId: listing.id,
        startTime,
        endTime,
        vehicleType: "sedan",
        vehiclePlate: "MH-12-RN-4821",
        paymentMethod: "upi_simulated",
        paymentMethodDetail: "aarav@oksbi",
      });

      expect(booking.id).toBeDefined();
      expect(booking.referenceCode).toMatch(/^PKO-\d{6}$/);
      expect(booking.checkinPin).toMatch(/^\d{4}$/);
      expect(booking.driverId).toBe("user-driver-1");
      expect(booking.driverName).toBe("Aarav Mehta");
      expect(booking.vehiclePlate).toBe("MH-12-RN-4821");
      expect(booking.status).toBe("confirmed");
      expect(booking.listingCity).toBe("Pune");

      // Financial breakdown:
      // Base: 3 * 60 = 180
      // Driver service fee: 5% of 180 = 9 -> Total paid = 189
      // Host commission: 12% of 180 = 21.6 -> 22 -> Net host = 158
      expect(booking.baseSubtotalInr).toBe(180);
      expect(booking.driverServiceFeeInr).toBe(9);
      expect(booking.totalDriverPaidInr).toBe(189);
      expect(booking.platformHostCommissionInr).toBe(22);
      expect(booking.netHostEarningsInr).toBe(158);

      // Payment record verification
      expect(payment.amountInr).toBe(189);
      expect(payment.status).toBe("succeeded_simulated");
      expect(payment.payerId).toBe("user-driver-1");
      expect(payment.hostId).toBe("user-host-1");
    });
  });

  /* ------------------------------------------------------------------------
   * STAGE E & F: HOST RESERVATIONS QUEUE & CHECK-IN VERIFICATION
   * ------------------------------------------------------------------------ */
  describe("Stage E & F: Host Reservations Queue & Check-In Verification", () => {
    it("displays the driver reservation in Host workspace and allows PIN verification and completion", () => {
      const listing = createListing("user-host-1", {
        title: "Kothrud Paud Road Bay",
        address: "Plot 12, Paud Road",
        locality: "Kothrud",
        landmark: "Near MIT College",
        city: "Pune",
        latitude: 18.5074,
        longitude: 73.8077,
        spaceType: "covered",
        hourlyRateInr: 50,
        dailyRateInr: 350,
        vehicleTypes: ["sedan"],
        status: "published",
      });

      const { booking } = createBooking("user-driver-1", {
        listingId: listing.id,
        startTime: "2026-11-26T14:00:00.000Z",
        endTime: "2026-11-26T16:00:00.000Z",
        vehicleType: "sedan",
        vehiclePlate: "MH-12-RN-4821",
        paymentMethod: "upi_simulated",
      });

      // Host inspects listing details
      const details = getListingDetails(listing.id)!;
      expect(details).toBeDefined();
      expect(details.reservedSlots.length).toBeGreaterThanOrEqual(1);

      const reservedSlot = details.reservedSlots.find((s) => s.id === booking.id);
      expect(reservedSlot).toBeDefined();
      expect(reservedSlot?.status).toBe("confirmed");

      // Verify Host check-in with WRONG PIN fails
      expect(() => {
        checkinOrCompleteBooking(booking.id, "checkin", "9999");
      }).toThrow("Invalid check-in PIN code.");

      // Verify Host check-in with CORRECT PIN succeeds
      const checkedInBooking = checkinOrCompleteBooking(
        booking.id,
        "checkin",
        booking.checkinPin
      );
      expect(checkedInBooking.status).toBe("checked_in");
      expect(checkedInBooking.checkedInAt).toBeDefined();

      // Verify Host marks booking completed
      const completedBooking = checkinOrCompleteBooking(booking.id, "complete");
      expect(completedBooking.status).toBe("completed");
    });
  });

  /* ------------------------------------------------------------------------
   * STAGE G: CONFLICT PREVENTION & OVERLAP GUARDS
   * ------------------------------------------------------------------------ */
  describe("Stage G: Double-Booking Conflict Prevention", () => {
    it("strictly prevents overlapping reservations on newly created spaces", () => {
      const listing = createListing("user-host-1", {
        title: "FC Road Deccan Gymkhana Slot",
        address: "Lane 2, FC Road",
        locality: "FC Road",
        landmark: "Near Fergusson College Main Gate",
        city: "Pune",
        latitude: 18.5222,
        longitude: 73.8416,
        spaceType: "uncovered",
        hourlyRateInr: 60,
        dailyRateInr: 380,
        vehicleTypes: ["hatchback"],
        status: "published",
      });

      createBooking("user-driver-1", {
        listingId: listing.id,
        startTime: "2026-11-27T10:00:00.000Z",
        endTime: "2026-11-27T13:00:00.000Z",
        vehicleType: "hatchback",
        vehiclePlate: "MH-12-RN-4821",
      });

      // Attempting to book overlapping window should fail
      expect(() => {
        createBooking("user-admin-1", {
          listingId: listing.id,
          startTime: "2026-11-27T11:00:00.000Z",
          endTime: "2026-11-27T14:00:00.000Z",
          vehicleType: "hatchback",
          vehiclePlate: "MH-12-AD-0001",
        });
      }).toThrow(/CONFLICT: This parking space is already reserved/);
    });
  });

  /* ------------------------------------------------------------------------
   * STAGE H: STATIC CODE AUDIT (STALE PERSONA & OUT-OF-STATE REGISTRATIONS)
   * ------------------------------------------------------------------------ */
  describe("Stage H: Adversarial Cleanliness Audit", () => {
    it("verifies zero references to 'Meera Krishnan' in src/app/admin/page.tsx", () => {
      const adminPath = path.resolve(__dirname, "../src/app/admin/page.tsx");
      const adminContent = fs.readFileSync(adminPath, "utf-8");
      expect(adminContent).not.toContain("Meera Krishnan");
      expect(adminContent).toContain("Nandini Sharma");
    });

    it("verifies zero references to 'KA-01' in src/app/listings/[id]/page.tsx", () => {
      const listingPagePath = path.resolve(__dirname, "../src/app/listings/[id]/page.tsx");
      const listingPageContent = fs.readFileSync(listingPagePath, "utf-8");
      expect(listingPageContent).not.toContain("KA-01");
      expect(listingPageContent).toContain("MH-12-RN-4821");
    });
  });
});
```

---

## 5. Verification Method

To independently verify the investigation findings and test recommendations:

1. **Verify Stale Persona in Admin Console**:
   ```powershell
   Select-String -Path "d:\lms_project\src\app\admin\page.tsx" -Pattern "Meera"
   ```
   *Expected output*: Matches on lines 58 and 93.

2. **Verify Stale Plate in Listing Detail**:
   ```powershell
   Select-String -Path "d:\lms_project\src\app\listings\[id]\page.tsx" -Pattern "KA-01"
   ```
   *Expected output*: Matches on lines 120 and 949.

3. **Verify Challenger M2 Test Assertion**:
   ```powershell
   Select-String -Path "d:\lms_project\tests\challenger_m2_stress.test.ts" -Pattern "hasMeeraKrishnan"
   ```
   *Expected output*: Line 554 asserts `expect(hasMeeraKrishnan).toBe(true)`.

4. **Run Production Build Verification**:
   ```powershell
   npm run build
   ```
   *Expected output*: Zero Next.js or TypeScript compile errors, exit code 0.

5. **Run Existing Test Suite**:
   ```powershell
   npm test
   ```
   *Expected output*: 105 passed tests across 6 files, exit code 0.
