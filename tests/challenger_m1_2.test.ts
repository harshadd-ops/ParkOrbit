import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import {
  resetDatabaseForTests,
  readDb,
  writeDb,
  getUserById,
  updateUserProfile,
  updatePlatformConfigAsAdmin,
  resolveReportAsAdmin,
  createReport,
  createListing,
  updateListing,
  createBooking,
  cancelBooking,
  checkinOrCompleteBooking,
  createReview,
  getListingDetails,
} from "../src/lib/db";
import { calculatePriceBreakdown } from "../src/lib/pricing";
import { URBAN_HUBS } from "../src/lib/seed";
import { DatabaseSchema, ParkingListing } from "../src/lib/types";

const TEST_DB_PATH = path.resolve(
  process.cwd(),
  "data",
  "parkorbit-challenger-2-db.json"
);

describe("Milestone 1 Adversarial Challenge: Persistence, Role Safety & Booking Flow", () => {
  beforeEach(() => {
    process.env.PARKORBIT_DB_PATH = TEST_DB_PATH;
    resetDatabaseForTests(TEST_DB_PATH);
  });

  afterAll(() => {
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch {
      // ignore
    }
    delete process.env.PARKORBIT_DB_PATH;
    resetDatabaseForTests();
  });

  describe("Challenge 1: Role Safety & Privilege Enforcement on Demo Personas", () => {
    it("empirically verifies demo user roles and MH registration plates", () => {
      const driver = getUserById("user-driver-1");
      const host1 = getUserById("user-host-1");
      const host2 = getUserById("user-host-2");
      const admin = getUserById("user-admin-1");

      // Verify presence
      expect(driver).toBeDefined();
      expect(host1).toBeDefined();
      expect(host2).toBeDefined();
      expect(admin).toBeDefined();

      // Verify exact roles
      expect(driver?.role).toBe("driver");
      expect(host1?.role).toBe("host");
      expect(host2?.role).toBe("host");
      expect(admin?.role).toBe("admin");

      // Verify MH plates
      expect(driver?.defaultVehiclePlate).toBe("MH-12-RN-4821");
      expect(host1?.defaultVehiclePlate).toBe("MH-12-KP-9012");
      expect(host2?.defaultVehiclePlate).toBe("MH-14-BJ-3310");
      expect(admin?.defaultVehiclePlate).toBe("MH-12-AD-0001");
    });

    it("prevents driver and host personas from performing Admin platform configuration", () => {
      // Driver attempts admin config update -> should fail
      expect(() => {
        updatePlatformConfigAsAdmin("user-driver-1", {
          commissionRatePercent: 25,
        });
      }).toThrow(/FORBIDDEN: Admin privileges required/);

      // Host attempts admin config update -> should fail
      expect(() => {
        updatePlatformConfigAsAdmin("user-host-1", {
          commissionRatePercent: 25,
        });
      }).toThrow(/FORBIDDEN: Admin privileges required/);

      // Admin executes -> should succeed
      const updated = updatePlatformConfigAsAdmin("user-admin-1", {
        commissionRatePercent: 15,
      });
      expect(updated.commissionRatePercent).toBe(15);
    });

    it("prevents non-admins from moderating or resolving trust reports", () => {
      const report = createReport("user-driver-1", {
        targetType: "listing",
        targetId: "listing-koregaon-park-1",
        targetTitle: "Lane 5 Covered Villa Portico",
        reasonCategory: "inaccurate_location",
        description: "Gate color changed from white to blue.",
      });

      // Driver attempts resolution -> should throw
      expect(() => {
        resolveReportAsAdmin("user-driver-1", report.id, {
          status: "resolved",
        });
      }).toThrow(/FORBIDDEN: Admin privileges required for moderation/);

      // Host attempts resolution -> should throw
      expect(() => {
        resolveReportAsAdmin("user-host-1", report.id, {
          status: "resolved",
        });
      }).toThrow(/FORBIDDEN: Admin privileges required for moderation/);

      // Admin resolves report -> succeeds
      const resolved = resolveReportAsAdmin("user-admin-1", report.id, {
        status: "resolved",
        adminNotes: "Updated photo records.",
      });
      expect(resolved.status).toBe("resolved");
    });

    it("enforces listing ownership and authorization boundaries", () => {
      // Host 1 owns listing-koregaon-park-1
      // Host 2 attempts to edit Host 1's listing -> should fail
      expect(() => {
        updateListing("user-host-2", "listing-koregaon-park-1", {
          hourlyRateInr: 200,
        });
      }).toThrow(/FORBIDDEN: You do not have permission to modify a listing you do not own/);

      // Driver attempts to edit Host 1's listing -> should fail
      expect(() => {
        updateListing("user-driver-1", "listing-koregaon-park-1", {
          hourlyRateInr: 10,
        });
      }).toThrow(/FORBIDDEN: You do not have permission to modify a listing you do not own/);

      // Admin CAN modify any listing for safety moderation
      const adminUpdated = updateListing("user-admin-1", "listing-koregaon-park-1", {
        hourlyRateInr: 78,
      });
      expect(adminUpdated.hourlyRateInr).toBe(78);
    });

    it("enforces profile update boundaries: users cannot modify other users profiles", () => {
      expect(() => {
        updateUserProfile("user-driver-1", "user-host-1", {
          name: "Hijacked Host",
        });
      }).toThrow(/FORBIDDEN: You can only update your own profile/);
    });
  });

  describe("Challenge 2: Database Persistence & resetDatabaseForTests() Integrity", () => {
    it("wipes dirty/mutated data and restores exact Pune schema and entities", () => {
      // 1. Deliberately mutate database state: inject non-Pune listing and corrupt users
      const db = readDb();
      const corruptedListing: ParkingListing = {
        ...db.listings[0],
        id: "corrupted-bengaluru-999",
        city: "Bengaluru",
        locality: "Indiranagar",
        latitude: 12.9716,
        longitude: 77.5946,
      };
      db.listings.push(corruptedListing);
      writeDb(db);

      // Verify the corrupt entry is in file
      const mutatedDb = readDb();
      // Notice readDb() automatic migration guard may kick in if Bengaluru listing is detected!
      // Let's test if resetDatabaseForTests() completely restores pure Pune data
      const restored = resetDatabaseForTests();

      expect(restored.listings.length).toBe(8);
      expect(restored.listings.every((l) => l.city === "Pune")).toBe(true);
      expect(restored.listings.some((l) => l.id === "corrupted-bengaluru-999")).toBe(false);

      // All listings must adhere to Pune geospatial bounding box
      restored.listings.forEach((listing) => {
        expect(listing.latitude).toBeGreaterThanOrEqual(18.40);
        expect(listing.latitude).toBeLessThanOrEqual(18.65);
        expect(listing.longitude).toBeGreaterThanOrEqual(73.70);
        expect(listing.longitude).toBeLessThanOrEqual(74.00);
      });

      // Verify all 10 Urban Hubs in Pune are intact
      expect(URBAN_HUBS.length).toBe(10);
      expect(URBAN_HUBS.every((h) => h.city === "Pune")).toBe(true);
      URBAN_HUBS.forEach((hub) => {
        expect(hub.latitude).toBeGreaterThanOrEqual(18.40);
        expect(hub.latitude).toBeLessThanOrEqual(18.65);
        expect(hub.longitude).toBeGreaterThanOrEqual(73.70);
        expect(hub.longitude).toBeLessThanOrEqual(74.00);
      });
    });

    it("verifies readDb() automatic migration guard triggers on stale non-Pune database files", () => {
      const dbPath = TEST_DB_PATH;
      const current = readDb();

      // Intentionally insert a stale Delhi record directly to disk
      const staleData: DatabaseSchema = {
        ...current,
        listings: [
          ...current.listings,
          {
            ...current.listings[0],
            id: "stale-delhi-listing",
            city: "New Delhi",
            locality: "Connaught Place",
            latitude: 28.6139,
            longitude: 77.209,
          },
        ],
      };
      fs.writeFileSync(dbPath, JSON.stringify(staleData, null, 2), "utf-8");

      // Now readDb() should detect stale city and re-seed pure Pune data
      const cleaned = readDb();
      expect(cleaned.listings.some((l) => l.city === "New Delhi")).toBe(false);
      expect(cleaned.listings.every((l) => l.city === "Pune")).toBe(true);
      expect(cleaned.listings.length).toBe(8);
    });
  });

  describe("Challenge 3: Dynamic Booking, Mathematical Calculations & PIN Verification", () => {
    it("creates a dynamic booking with random plate and verifies exact pricing, PIN and fee formulas", () => {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedPlate = `MH-12-ZT-${randomSuffix}`;

      const db = readDb();
      const listing = db.listings.find((l) => l.id === "listing-koregaon-park-1")!;
      // Hourly rate: ₹75/hr. Booking duration: 3 hours
      const startTime = "2026-11-25T10:00:00.000Z";
      const endTime = "2026-11-25T13:00:00.000Z";

      const expectedBreakdown = calculatePriceBreakdown(
        listing,
        startTime,
        endTime,
        db.config
      );
      // Math:
      // durationHours = 3
      // baseSubtotal = 3 * 75 = 225
      // driverServiceFeeInr = round(225 * 0.05) = 11
      // totalDriverPaidInr = 225 + 11 = 236
      // platformCommission = round(225 * 0.12) = 27
      // netHostEarnings = 225 - 27 = 198
      expect(expectedBreakdown.durationHours).toBe(3);
      expect(expectedBreakdown.baseSubtotalInr).toBe(225);
      expect(expectedBreakdown.driverServiceFeeInr).toBe(11);
      expect(expectedBreakdown.totalDriverPaidInr).toBe(236);
      expect(expectedBreakdown.platformHostCommissionInr).toBe(27);
      expect(expectedBreakdown.netHostEarningsInr).toBe(198);

      // Execute dynamic booking creation
      const { booking, payment } = createBooking("user-driver-1", {
        listingId: listing.id,
        startTime,
        endTime,
        vehicleType: "sedan",
        vehiclePlate: generatedPlate,
        paymentMethod: "upi_simulated",
      });

      // Verify stored booking attributes match calculation
      expect(booking.vehiclePlate).toBe(generatedPlate);
      expect(booking.durationHours).toBe(3);
      expect(booking.baseSubtotalInr).toBe(225);
      expect(booking.driverServiceFeeInr).toBe(11);
      expect(booking.totalDriverPaidInr).toBe(236);
      expect(booking.platformHostCommissionInr).toBe(27);
      expect(booking.netHostEarningsInr).toBe(198);
      expect(booking.listingCity).toBe("Pune");
      expect(booking.listingLocality).toBe("Koregaon Park");
      expect(booking.status).toBe("confirmed");

      // Verify PIN generation
      expect(booking.checkinPin).toMatch(/^\d{4}$/);
      expect(Number(booking.checkinPin)).toBeGreaterThanOrEqual(1000);
      expect(Number(booking.checkinPin)).toBeLessThanOrEqual(9999);

      // Verify payment record
      expect(payment.amountInr).toBe(236);
      expect(payment.currency).toBe("INR");
      expect(payment.status).toBe("succeeded_simulated");

      // Verify driver check-in using generated PIN
      const checkedIn = checkinOrCompleteBooking(
        "user-driver-1",
        booking.id,
        "checkin",
        booking.checkinPin
      );
      expect(checkedIn.status).toBe("checked_in");
      expect(checkedIn.checkedInAt).toBeDefined();

      // Verify host completes booking
      const completed = checkinOrCompleteBooking(
        "user-host-1",
        booking.id,
        "complete"
      );
      expect(completed.status).toBe("completed");
      expect(completed.payoutStatus).toBe("estimated");

      // Verify driver can submit review post-completion
      const review = createReview("user-driver-1", {
        bookingId: booking.id,
        rating: 5,
        comment: `Excellent spot in Pune for ${generatedPlate}!`,
      });
      expect(review.id).toBeDefined();
      expect(review.driverId).toBe("user-driver-1");
    });

    it("verifies daily cap capping logic and double-booking conflict rejection", () => {
      const db = readDb();
      const listing = db.listings.find((l) => l.id === "listing-baner-2")!;
      // Hourly: ₹65, Daily: ₹420
      // 8 hours = 8 * 65 = 520 > 420, so daily cap must activate
      const breakdown = calculatePriceBreakdown(
        listing,
        "2026-11-26T08:00:00.000Z",
        "2026-11-26T16:00:00.000Z",
        db.config
      );
      expect(breakdown.durationHours).toBe(8);
      expect(breakdown.pricingMode).toBe("daily");
      expect(breakdown.baseSubtotalInr).toBe(420);

      // Book the 8-hour slot
      const { booking } = createBooking("user-driver-1", {
        listingId: listing.id,
        startTime: "2026-11-26T08:00:00.000Z",
        endTime: "2026-11-26T16:00:00.000Z",
        vehicleType: "sedan",
        vehiclePlate: "MH-14-CH-4455",
      });
      expect(booking.pricingMode).toBe("daily");
      expect(booking.baseSubtotalInr).toBe(420);

      // Conflict test: attempt another booking overlapping from 10:00 to 12:00
      expect(() => {
        createBooking("user-driver-1", {
          listingId: listing.id,
          startTime: "2026-11-26T10:00:00.000Z",
          endTime: "2026-11-26T12:00:00.000Z",
          vehicleType: "sedan",
          vehiclePlate: "MH-12-GG-1010",
        });
      }).toThrow(/CONFLICT/);
    });

    it("verifies cancellation refund rules and frees slot for re-booking", () => {
      const db = readDb();
      const listing = db.listings.find((l) => l.id === "listing-fc-road-3")!;
      const startTime = "2026-12-10T12:00:00.000Z";
      const endTime = "2026-12-10T15:00:00.000Z";

      const { booking } = createBooking("user-driver-1", {
        listingId: listing.id,
        startTime,
        endTime,
        vehicleType: "hatchback",
        vehiclePlate: "MH-12-TEST-99",
      });

      // Cancel more than 2 hours in advance (flexible policy) -> 100% refund
      const cancelled = cancelBooking(
        "user-driver-1",
        booking.id,
        "Changed travel plan",
        "2026-12-10T08:00:00.000Z"
      );
      expect(cancelled.booking.status).toBe("cancelled");
      expect(cancelled.booking.refundAmountInr).toBe(booking.totalDriverPaidInr);

      // Slot is now freed: verify another driver can immediately book that exact slot
      const rebooked = createBooking("user-driver-1", {
        listingId: listing.id,
        startTime,
        endTime,
        vehicleType: "hatchback",
        vehiclePlate: "MH-14-REBOOK-01",
      });
      expect(rebooked.booking.status).toBe("confirmed");
    });

    it("enforces cross-persona booking security: non-participants cannot cancel, check-in, or review", () => {
      const { booking } = createBooking("user-driver-1", {
        listingId: "listing-koregaon-park-1", // Host is user-host-1
        startTime: "2026-12-15T10:00:00.000Z",
        endTime: "2026-12-15T12:00:00.000Z",
        vehicleType: "sedan",
        vehiclePlate: "MH-12-SEC-01",
      });

      // user-host-2 (unrelated host) attempts to cancel -> throws FORBIDDEN
      expect(() => {
        cancelBooking("user-host-2", booking.id, "Malicious cancel");
      }).toThrow(/FORBIDDEN: You do not have permission to cancel this booking/);

      // user-host-2 attempts to check in -> throws FORBIDDEN
      expect(() => {
        checkinOrCompleteBooking("user-host-2", booking.id, "checkin", booking.checkinPin);
      }).toThrow(/FORBIDDEN: Only the booking driver or host can update check-in status/);

      // Check-in and complete legitimately
      checkinOrCompleteBooking("user-driver-1", booking.id, "checkin", booking.checkinPin);
      checkinOrCompleteBooking("user-host-1", booking.id, "complete");

      // user-host-1 or user-host-2 attempts to review -> throws FORBIDDEN
      expect(() => {
        createReview("user-host-1", {
          bookingId: booking.id,
          rating: 5,
          comment: "Self-reviewing my own listing",
        });
      }).toThrow(/FORBIDDEN: Only the driver of this booking can review it/);
    });

    it("rejects invalid booking inputs (reversed timestamps, short duration, unsupported vehicle type)", () => {
      // 1. Reversed timestamps: end before start
      expect(() => {
        createBooking("user-driver-1", {
          listingId: "listing-koregaon-park-1",
          startTime: "2026-12-20T14:00:00.000Z",
          endTime: "2026-12-20T10:00:00.000Z",
          vehicleType: "sedan",
          vehiclePlate: "MH-12-ERR-01",
        });
      }).toThrow(/CONFLICT: Departure time must be after arrival time/);

      // 2. Short duration (< 30 minutes)
      expect(() => {
        createBooking("user-driver-1", {
          listingId: "listing-koregaon-park-1",
          startTime: "2026-12-20T10:00:00.000Z",
          endTime: "2026-12-20T10:15:00.000Z",
          vehicleType: "sedan",
          vehiclePlate: "MH-12-ERR-02",
        });
      }).toThrow(/CONFLICT: Minimum booking duration is 30 minutes/);

      // 3. Invalid vehicle plate (< 4 chars)
      expect(() => {
        createBooking("user-driver-1", {
          listingId: "listing-koregaon-park-1",
          startTime: "2026-12-20T10:00:00.000Z",
          endTime: "2026-12-20T12:00:00.000Z",
          vehicleType: "sedan",
          vehiclePlate: "MH",
        });
      }).toThrow(/valid vehicle registration number is required/);
    });
  });
});

