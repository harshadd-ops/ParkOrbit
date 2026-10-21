import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";
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

  afterAll(() => {
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
        longitude: 73.896,
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

  describe("11. Milestone 3: Interactive Leaflet Map Integration & Pune Localization", () => {
    it("verifies leaflet and react-leaflet dependencies are installed", () => {
      const pkgPath = path.resolve(__dirname, "../package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      expect(pkg.dependencies.leaflet).toBeDefined();
      expect(pkg.devDependencies["@types/leaflet"]).toBeDefined();
      expect(pkg.dependencies["react-leaflet"]).toBeDefined();
    });

    it("verifies globals.css includes leaflet CSS import and z-index isolation rules", () => {
      const cssPath = path.resolve(__dirname, "../src/app/globals.css");
      const css = fs.readFileSync(cssPath, "utf-8");
      expect(css).toContain('@import "leaflet/dist/leaflet.css";');
      expect(css).toContain(".leaflet-container");
      expect(css).toContain("isolation: isolate;");
      expect(css).toContain(".leaflet-pane");
      expect(css).toContain("z-index: 10 !important;");
      expect(css).toContain(".leaflet-top,");
      expect(css).toContain("z-index: 20 !important;");
    });

    it("verifies DriverDiscoveryMap component exists and contains Pune coordinates & Carto Voyager tiles", () => {
      const mapComponentPath = path.resolve(
        __dirname,
        "../src/components/map/DriverDiscoveryMap.tsx"
      );
      expect(fs.existsSync(mapComponentPath)).toBe(true);
      const content = fs.readFileSync(mapComponentPath, "utf-8");
      expect(content).toContain("18.5204");
      expect(content).toContain("73.8567");
      expect(content).toContain("cartocdn.com/rastertiles/voyager");
      expect(content).toContain("pko-marker-div-icon");
      expect(content).toContain("pko-radar-icon");
      expect(content).toContain("import(");
    });

    it("verifies HostLocationPicker component exists and contains Pune neighborhood presets and draggable pin", () => {
      const pickerComponentPath = path.resolve(
        __dirname,
        "../src/components/map/HostLocationPicker.tsx"
      );
      expect(fs.existsSync(pickerComponentPath)).toBe(true);
      const content = fs.readFileSync(pickerComponentPath, "utf-8");
      expect(content).toContain("PUNE_NEIGHBORHOOD_PRESETS");
      expect(content).toContain("Koregaon Park");
      expect(content).toContain("Baner");
      expect(content).toContain("Hinjewadi");
      expect(content).toContain("draggable: true");
      expect(content).toContain("Spot Pin:");
      expect(content).toContain("import(");
    });

    it("verifies page.tsx dynamically imports DriverDiscoveryMap with ssr: false", () => {
      const pagePath = path.resolve(__dirname, "../src/app/page.tsx");
      const content = fs.readFileSync(pagePath, "utf-8");
      expect(content).toContain("DriverDiscoveryMap");
      expect(content).toContain("dynamic(");
      expect(content).toContain("ssr: false");
      expect(content).toContain("<DriverDiscoveryMap");
    });

    it("verifies ListingForm.tsx dynamically imports HostLocationPicker with ssr: false and uses Pune defaults", () => {
      const formPath = path.resolve(
        __dirname,
        "../src/components/host/ListingForm.tsx"
      );
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toContain("HostLocationPicker");
      expect(content).toContain("dynamic(");
      expect(content).toContain("ssr: false");
      expect(content).toContain("<HostLocationPicker");
      // Check initial state Pune defaults
      expect(content).toContain('city || "Pune"');
      expect(content).toContain('"Maharashtra"');
      expect(content).toContain("18.5362");
      expect(content).toContain("73.8940");
      // Check placeholders are Pune localized
      expect(content).toContain("Koregaon Park");
      expect(content).not.toContain("Indiranagar");
      expect(content).not.toContain("HAL 2nd Stage");
    });
  });
});
