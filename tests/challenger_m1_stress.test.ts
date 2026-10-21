import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import {
  readDb,
  writeDb,
  resetDatabaseForTests,
  searchListings,
  createListing,
  getListingDetails,
} from "../src/lib/db";
import { createInitialSeedData, URBAN_HUBS } from "../src/lib/seed";
import { calculateDistanceKm } from "../src/lib/pricing";
import { DatabaseSchema, ParkingListing } from "../src/lib/types";

const PUNE_BOUNDS = {
  MIN_LAT: 18.40,
  MAX_LAT: 18.65,
  MIN_LNG: 73.70,
  MAX_LNG: 74.00,
};

const STRESS_DB_PATH = "data/parkorbit-stress-db.json";

describe("Adversarial Empirical Stress Tests — Milestone 1 (Pune Localization & Data Layer)", () => {
  beforeEach(() => {
    process.env.PARKORBIT_DB_PATH = STRESS_DB_PATH;
    resetDatabaseForTests(STRESS_DB_PATH);
  });

  afterAll(() => {
    delete process.env.PARKORBIT_DB_PATH;
    const fullPath = path.join(process.cwd(), STRESS_DB_PATH);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {}
    }
  });

  describe("1. Coordinate Bounds Stress Test (18.40 <= lat <= 18.65, 73.70 <= lng <= 74.00)", () => {
    it("empirically verifies 100% of listings in data/parkorbit-db.json fall within Pune bounds", () => {
      const raw = fs.readFileSync(
        path.join(process.cwd(), "data", "parkorbit-db.json"),
        "utf-8"
      );
      const db = JSON.parse(raw) as DatabaseSchema;

      expect(db.listings.length).toBeGreaterThanOrEqual(8);

      const outOfBoundsListings: { id: string; lat: number; lng: number }[] = [];
      for (const listing of db.listings) {
        if (
          listing.latitude < PUNE_BOUNDS.MIN_LAT ||
          listing.latitude > PUNE_BOUNDS.MAX_LAT ||
          listing.longitude < PUNE_BOUNDS.MIN_LNG ||
          listing.longitude > PUNE_BOUNDS.MAX_LNG
        ) {
          outOfBoundsListings.push({
            id: listing.id,
            lat: listing.latitude,
            lng: listing.longitude,
          });
        }
      }

      expect(outOfBoundsListings).toEqual([]);
    });

    it("empirically verifies 100% of URBAN_HUBS in src/lib/seed.ts fall within Pune bounds", () => {
      expect(URBAN_HUBS.length).toBe(10);

      const outOfBoundsHubs: { id: string; lat: number; lng: number }[] = [];
      for (const hub of URBAN_HUBS) {
        if (
          hub.latitude < PUNE_BOUNDS.MIN_LAT ||
          hub.latitude > PUNE_BOUNDS.MAX_LAT ||
          hub.longitude < PUNE_BOUNDS.MIN_LNG ||
          hub.longitude > PUNE_BOUNDS.MAX_LNG
        ) {
          outOfBoundsHubs.push({
            id: hub.id,
            lat: hub.latitude,
            lng: hub.longitude,
          });
        }
      }

      expect(outOfBoundsHubs).toEqual([]);
    });

    it("empirically verifies createInitialSeedData() produces 100% in-bound Pune coordinates", () => {
      const seed = createInitialSeedData();
      expect(seed.listings.length).toBeGreaterThanOrEqual(8);

      for (const listing of seed.listings) {
        expect(listing.latitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LAT);
        expect(listing.latitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LAT);
        expect(listing.longitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LNG);
        expect(listing.longitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LNG);
      }
    });

    it("recursively scans ALL nested fields in data/parkorbit-db.json for any coordinate properties", () => {
      const raw = fs.readFileSync(
        path.join(process.cwd(), "data", "parkorbit-db.json"),
        "utf-8"
      );
      const db = JSON.parse(raw);

      const violations: string[] = [];

      function checkNode(node: any, pathStr: string) {
        if (!node || typeof node !== "object") return;

        if (typeof node.latitude === "number") {
          if (
            node.latitude < PUNE_BOUNDS.MIN_LAT ||
            node.latitude > PUNE_BOUNDS.MAX_LAT
          ) {
            violations.push(`${pathStr}.latitude = ${node.latitude}`);
          }
        }
        if (typeof node.longitude === "number") {
          if (
            node.longitude < PUNE_BOUNDS.MIN_LNG ||
            node.longitude > PUNE_BOUNDS.MAX_LNG
          ) {
            violations.push(`${pathStr}.longitude = ${node.longitude}`);
          }
        }

        for (const [key, val] of Object.entries(node)) {
          checkNode(val, `${pathStr}.${key}`);
        }
      }

      checkNode(db, "db");
      expect(violations).toEqual([]);
    });
  });

  describe("2. Negative Corpus & Zero Legacy City Scan", () => {
    const FORBIDDEN_CITIES = [
      "Bengaluru",
      "Bangalore",
      "Delhi",
      "Indiranagar",
      "Koramangala",
      "Whitefield",
      "Jayanagar",
      "Bandra",
      "Connaught",
    ];

    it("verifies zero occurrences of Bengaluru, Bangalore, Delhi, or outstation localities in data/parkorbit-db.json", () => {
      const raw = fs.readFileSync(
        path.join(process.cwd(), "data", "parkorbit-db.json"),
        "utf-8"
      );

      const matches: { term: string; count: number }[] = [];
      for (const term of FORBIDDEN_CITIES) {
        const regex = new RegExp(`\\b${term}\\b`, "gi");
        const count = (raw.match(regex) || []).length;
        if (count > 0) {
          matches.push({ term, count });
        }
      }

      expect(matches).toEqual([]);
    });

    it("verifies zero non-Maharashtra vehicle license plate prefixes in data/parkorbit-db.json", () => {
      const raw = fs.readFileSync(
        path.join(process.cwd(), "data", "parkorbit-db.json"),
        "utf-8"
      );

      // Check for KA-, DL-, HR-, UP- license plate formats
      const nonMhPlates = raw.match(/"defaultVehiclePlate":\s*"(KA|DL|HR|UP|TN|AP|TS)-\d\d-[A-Z]+-\d+"/gi);
      expect(nonMhPlates || []).toEqual([]);

      const nonMhBookingPlates = raw.match(/"vehiclePlate":\s*"(KA|DL|HR|UP|TN|AP|TS)-\d\d-[A-Z]+-\d+"/gi);
      expect(nonMhBookingPlates || []).toEqual([]);
    });

    it("verifies zero occurrences of Bengaluru, Bangalore, Delhi in src/lib/seed.ts", () => {
      const raw = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "seed.ts"),
        "utf-8"
      );

      const matches: { term: string; count: number }[] = [];
      for (const term of FORBIDDEN_CITIES) {
        const regex = new RegExp(`\\b${term}\\b`, "gi");
        const count = (raw.match(regex) || []).length;
        if (count > 0) {
          matches.push({ term, count });
        }
      }

      expect(matches).toEqual([]);
    });

    it("empirically confirms 0 occurrences of 'Mumbai' in seed data and database", () => {
      const rawDb = fs.readFileSync(path.join(process.cwd(), "data", "parkorbit-db.json"), "utf-8");
      const rawSeed = fs.readFileSync(path.join(process.cwd(), "src", "lib", "seed.ts"), "utf-8");

      const dbMatches = (rawDb.match(/\bMumbai\b/gi) || []).length;
      const seedMatches = (rawSeed.match(/\bMumbai\b/gi) || []).length;

      // Fully cleaned up: 0 occurrences of Mumbai in db.json and seed.ts
      expect(dbMatches).toBe(0);
      expect(seedMatches).toBe(0);
    });

    it("empirically demonstrates searchListings returns 0 matches for 'Mumbai' query just like other legacy cities", () => {
      const bglrResults = searchListings({ query: "Bengaluru" });
      const bangResults = searchListings({ query: "Bangalore" });
      const delhiResults = searchListings({ query: "Delhi" });
      const mumbaiResults = searchListings({ query: "Mumbai" });

      // Clean zero matches for Bengaluru, Delhi, and Mumbai
      expect(bglrResults).toHaveLength(0);
      expect(bangResults).toHaveLength(0);
      expect(delhiResults).toHaveLength(0);
      expect(mumbaiResults).toHaveLength(0);
    });
  });

  describe("3. Search & Coordinate Bounding Engine Stress Testing", () => {
    it("handles Pune center geospatial search with varying radius thresholds", () => {
      const puneCenter = { lat: 18.5204, lng: 73.8567 }; // Near Shaniwar Wada

      // 3km search should return nearby Deccan/FC Road, Shivajinagar
      const within3km = searchListings({
        lat: puneCenter.lat,
        lng: puneCenter.lng,
        maxDistanceKm: 3,
        sortBy: "distance",
      });

      expect(within3km.length).toBeGreaterThan(0);
      for (const listing of within3km) {
        expect(listing.distanceKm).toBeDefined();
        expect(listing.distanceKm!).toBeLessThanOrEqual(3);
      }

      // Check sorting order: distance must be non-decreasing
      for (let i = 1; i < within3km.length; i++) {
        expect(within3km[i].distanceKm!).toBeGreaterThanOrEqual(within3km[i - 1].distanceKm!);
      }

      // 50km search should return all published Pune listings
      const within50km = searchListings({
        lat: puneCenter.lat,
        lng: puneCenter.lng,
        maxDistanceKm: 50,
      });

      const db = readDb();
      const publishedCount = db.listings.filter((l) => l.status === "published").length;
      expect(within50km.length).toBe(publishedCount);
    });

    it("returns zero listings when searching from out-of-city coordinates with reasonable radius", () => {
      // Mumbai Nariman Point
      const mumbaiSearch = searchListings({
        lat: 18.922,
        lng: 72.8347,
        maxDistanceKm: 25,
      });
      expect(mumbaiSearch).toHaveLength(0);

      // Bengaluru MG Road
      const bengaluruSearch = searchListings({
        lat: 12.9716,
        lng: 77.5946,
        maxDistanceKm: 50,
      });
      expect(bengaluruSearch).toHaveLength(0);

      // Delhi Connaught Place
      const delhiSearch = searchListings({
        lat: 28.6315,
        lng: 77.2167,
        maxDistanceKm: 100,
      });
      expect(delhiSearch).toHaveLength(0);

      // Null Island
      const nullIsland = searchListings({
        lat: 0,
        lng: 0,
        maxDistanceKm: 500,
      });
      expect(nullIsland).toHaveLength(0);
    });

    it("tests extreme bounding corners of Pune bounding box", () => {
      const corners = [
        { name: "Northwest (Hinjewadi Ridge)", lat: PUNE_BOUNDS.MAX_LAT, lng: PUNE_BOUNDS.MIN_LNG },
        { name: "Northeast (Charholi/Alandi Border)", lat: PUNE_BOUNDS.MAX_LAT, lng: PUNE_BOUNDS.MAX_LNG },
        { name: "Southwest (Khadakwasla Border)", lat: PUNE_BOUNDS.MIN_LAT, lng: PUNE_BOUNDS.MIN_LNG },
        { name: "Southeast (Hadapsar Outer/Saswad Rd)", lat: PUNE_BOUNDS.MIN_LAT, lng: PUNE_BOUNDS.MAX_LNG },
      ];

      for (const corner of corners) {
        const results = searchListings({
          lat: corner.lat,
          lng: corner.lng,
          maxDistanceKm: 100,
        });
        expect(results.length).toBeGreaterThan(0);
        for (const l of results) {
          expect(l.distanceKm).toBeDefined();
          expect(typeof l.distanceKm).toBe("number");
        }
      }
    });

    it("stress-tests search query parser against adversarial strings and injection patterns", () => {
      const adversarialQueries = [
        "   ",
        "'; DROP TABLE listings; --",
        "<script>alert('xss')</script>",
        "🎉🚀",
        "!!!@@@###$$$%%%^^^&&&***",
        "\\",
        "/",
        "%",
        "_",
        "null",
        "undefined",
        "1234567890",
      ];

      for (const q of adversarialQueries) {
        expect(() => {
          searchListings({ query: q });
        }).not.toThrow();
      }
    });

    it("verifies case-insensitive and partial match behavior across all Pune localities", () => {
      const localities = [
        { query: "koregaon park", expectedLocality: "Koregaon Park" },
        { query: "KOREGAON PARK", expectedLocality: "Koregaon Park" },
        { query: "KoReGaOn PaRk", expectedLocality: "Koregaon Park" },
        { query: "baner", expectedLocality: "Baner" },
        { query: "hinjewadi", expectedLocality: "Hinjewadi" },
        { query: "kothrud", expectedLocality: "Kothrud" },
        { query: "viman nagar", expectedLocality: "Viman Nagar" },
        { query: "fc road", expectedLocality: "FC Road" },
        { query: "wakad", expectedLocality: "Wakad" },
        { query: "magarpatta", expectedLocality: "Magarpatta City" },
      ];

      for (const { query, expectedLocality } of localities) {
        const results = searchListings({ query });
        expect(results.length).toBeGreaterThanOrEqual(1);
        const matchesLocality = results.some((r) =>
          r.locality.toLowerCase().includes(query.toLowerCase()) ||
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.address.toLowerCase().includes(query.toLowerCase())
        );
        expect(matchesLocality).toBe(true);
      }
    });

    it("tests filter combinations: city, vehicleType, spaceType, maxHourlyPrice", () => {
      // 1. city: Pune
      const puneResults = searchListings({ city: "Pune" });
      expect(puneResults.every((l) => l.city === "Pune")).toBe(true);

      // 2. city: Mumbai (should return 0)
      const mumbaiResults = searchListings({ city: "Mumbai" });
      expect(mumbaiResults).toHaveLength(0);

      // 3. vehicleType: "ev"
      const evResults = searchListings({ vehicleType: "ev" });
      expect(evResults.length).toBeGreaterThan(0);
      expect(evResults.every((l) => l.vehicleTypes.includes("ev"))).toBe(true);

      // 4. spaceType: "covered"
      const coveredResults = searchListings({ spaceType: "covered" });
      expect(coveredResults.length).toBeGreaterThan(0);
      expect(coveredResults.every((l) => l.spaceType === "covered")).toBe(true);

      // 5. maxHourlyPrice: 50
      const cheapResults = searchListings({ maxHourlyPrice: 50 });
      expect(cheapResults.length).toBeGreaterThan(0);
      expect(cheapResults.every((l) => l.hourlyRateInr <= 50)).toBe(true);

      // 6. Multi-filter intersection
      const filtered = searchListings({
        city: "Pune",
        vehicleType: "ev",
        spaceType: "covered",
      });
      expect(filtered.length).toBeGreaterThan(0);
      for (const item of filtered) {
        expect(item.city).toBe("Pune");
        expect(item.vehicleTypes).toContain("ev");
        expect(item.spaceType).toBe("covered");
      }
    });

    it("tests readDb() automatic migration guard against simulated legacy database", () => {
      const testDbPath = path.join(process.cwd(), "data", "test-stale-migration.json");
      process.env.PARKORBIT_DB_PATH = "data/test-stale-migration.json";

      try {
        // Create an intentionally stale legacy database with a Bengaluru listing
        const staleDb: DatabaseSchema = {
          config: {
            commissionRatePercent: 12,
            driverServiceFeePercent: 5,
            featuredListingMonthlyInr: 999,
            proHostSubscriptionInr: 1499,
            paymentMode: "simulated_test",
            payoutMode: "estimated_pending",
          },
          users: [],
          listings: [
            {
              id: "listing-stale-1",
              hostId: "user-old",
              hostName: "Old User",
              hostAvatar: "",
              hostVerified: true,
              title: "Old Bengaluru Spot",
              subtitle: "Near Indiranagar 100ft Rd",
              description: "Stale spot",
              address: "100ft Road, Indiranagar",
              locality: "Indiranagar",
              city: "Bengaluru",
              landmark: "Near Metro",
              latitude: 12.9784,
              longitude: 77.6408,
              spaceType: "covered",
              status: "published",
              vehicleTypes: ["sedan"],
              dimensions: { lengthFt: 18, widthFt: 9, heightClearanceFt: 8 },
              hourlyRateInr: 60,
              dailyRateInr: 400,
              isFeatured: false,
              amenities: ["cctv"],
              photos: [],
              accessInstructions: "Gate code 1234",
              parkingRules: [],
              restrictions: "No trucks",
              cancellationPolicy: "flexible",
              minNoticeMinutes: 15,
              openingHours: { open: "06:00", close: "23:00", is24Hours: false },
              availableDays: [0, 1, 2, 3, 4, 5, 6],
              ratingAvg: 4.5,
              reviewCount: 2,
              isDemo: true,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
          bookings: [],
          blockedPeriods: [],
          payments: [],
          reviews: [],
          reports: [],
        };

        // Write stale DB to test file
        fs.writeFileSync(testDbPath, JSON.stringify(staleDb, null, 2), "utf-8");

        // readDb should detect stale non-Pune listing and automatically re-seed
        const migratedDb = readDb();

        // Stale listing should be replaced by Pune listings
        expect(migratedDb.listings.some((l) => l.city === "Bengaluru")).toBe(false);
        expect(migratedDb.listings.every((l) => l.city === "Pune")).toBe(true);
        expect(migratedDb.listings.length).toBeGreaterThanOrEqual(8);
      } finally {
        // Clean up test file and restore env
        delete process.env.PARKORBIT_DB_PATH;
        if (fs.existsSync(testDbPath)) {
          fs.unlinkSync(testDbPath);
        }
      }
    });
  });
});
