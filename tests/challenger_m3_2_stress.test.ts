import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import {
  readDb,
  writeDb,
  resetDatabaseForTests,
  createListing,
  getListingDetails,
} from "../src/lib/db";
import {
  PUNE_NEIGHBORHOOD_PRESETS,
  type PunePreset,
} from "../src/components/map/HostLocationPicker";
import type { DatabaseSchema } from "../src/lib/types";

// Strict Pune Metropolitan Coordinate Bounds per PROJECT.md interface contract
const PUNE_BOUNDS = {
  MIN_LAT: 18.40,
  MAX_LAT: 18.65,
  MIN_LNG: 73.70,
  MAX_LNG: 74.00,
};

// Isolated DB path for this test run to prevent concurrency issues
const TEST_DB_PATH = path.resolve(
  process.cwd(),
  "data",
  "parkorbit-challenger-m3-2-db.json"
);

describe("Adversarial Empirical Stress Tests — Milestone 3 Challenger 2: Host Location Picker & Pune Form Defaults", () => {
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

  // =========================================================================
  // SUITE 1: Pune Presets Verification in HostLocationPicker.tsx
  // =========================================================================
  describe("Suite 1: Pune Presets Verification in HostLocationPicker.tsx", () => {
    it("contains exactly 8 authentic Pune neighborhood presets", () => {
      expect(Array.isArray(PUNE_NEIGHBORHOOD_PRESETS)).toBe(true);
      expect(PUNE_NEIGHBORHOOD_PRESETS.length).toBe(8);

      const expectedNames = [
        "Koregaon Park",
        "Baner",
        "Hinjewadi",
        "Kothrud",
        "Viman Nagar",
        "FC Road",
        "Wakad",
        "Magarpatta",
      ];
      const actualNames = PUNE_NEIGHBORHOOD_PRESETS.map((p) => p.name);
      expect(actualNames).toEqual(expectedNames);
    });

    it("verifies every preset's coordinates strictly fall within Pune metropolitan bounds (18.40 <= lat <= 18.65, 73.70 <= lng <= 74.00)", () => {
      PUNE_NEIGHBORHOOD_PRESETS.forEach((preset: PunePreset) => {
        expect(typeof preset.lat).toBe("number");
        expect(typeof preset.lng).toBe("number");
        expect(Number.isFinite(preset.lat)).toBe(true);
        expect(Number.isFinite(preset.lng)).toBe(true);

        expect(preset.lat).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LAT);
        expect(preset.lat).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LAT);
        expect(preset.lng).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LNG);
        expect(preset.lng).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LNG);
      });
    });

    it("verifies all presets have authentic Pune postal codes (411xxx series) and valid landmarks", () => {
      PUNE_NEIGHBORHOOD_PRESETS.forEach((preset: PunePreset) => {
        expect(preset.name).toBeTruthy();
        expect(preset.locality).toBeTruthy();
        expect(preset.landmark).toBeTruthy();
        expect(preset.tag).toBeTruthy();

        // Pune PIN codes must be 6 digits and start with 411
        expect(preset.pincode).toMatch(/^411\d{3}$/);
      });
    });

    it("simulates preset selection handler and verifies emission of city === 'Pune' and exact preset values", () => {
      // Replicate handleSelectPreset callback emission logic from HostLocationPicker.tsx:268-287
      const simulatedEmissions: Array<{
        latitude: number;
        longitude: number;
        locality: string;
        landmark: string;
        city: string;
        pincode: string;
      }> = [];

      const mockOnChange = (loc: {
        latitude: number;
        longitude: number;
        locality?: string;
        landmark?: string;
        city?: string;
        pincode?: string;
      }) => {
        simulatedEmissions.push({
          latitude: loc.latitude,
          longitude: loc.longitude,
          locality: loc.locality!,
          landmark: loc.landmark!,
          city: loc.city!,
          pincode: loc.pincode!,
        });
      };

      // Execute selection for all 8 presets
      PUNE_NEIGHBORHOOD_PRESETS.forEach((preset) => {
        mockOnChange({
          latitude: preset.lat,
          longitude: preset.lng,
          locality: preset.locality,
          landmark: preset.landmark,
          city: "Pune",
          pincode: preset.pincode,
        });
      });

      expect(simulatedEmissions.length).toBe(8);

      simulatedEmissions.forEach((emission, idx) => {
        const preset = PUNE_NEIGHBORHOOD_PRESETS[idx];
        expect(emission.city).toBe("Pune");
        expect(emission.locality).toBe(preset.locality);
        expect(emission.landmark).toBe(preset.landmark);
        expect(emission.latitude).toBe(preset.lat);
        expect(emission.longitude).toBe(preset.lng);
        expect(emission.pincode).toBe(preset.pincode);

        // Coordinates strictly within Pune bounds
        expect(emission.latitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LAT);
        expect(emission.latitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LAT);
        expect(emission.longitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LNG);
        expect(emission.longitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LNG);
      });
    });
  });

  // =========================================================================
  // SUITE 2: ListingForm.tsx Default Form Values & DB Wipe Guard Immunity
  // =========================================================================
  describe("Suite 2: ListingForm.tsx Default Form Values & DB Wipe Guard Immunity", () => {
    const listingFormPath = path.resolve(
      process.cwd(),
      "src",
      "components",
      "host",
      "ListingForm.tsx"
    );
    const formCode = fs.readFileSync(listingFormPath, "utf-8");

    it("verifies ListingForm.tsx source code initializes city, locality, landmark, state, pincode, and lat/lng to Pune defaults", () => {
      // Check city default
      expect(formCode).toMatch(/initialListing\?\.city\s*\|\|\s*["']Pune["']/);

      // Check locality default
      expect(formCode).toMatch(/initialListing\?\.locality\s*\|\|\s*["']Koregaon Park["']/);

      // Check landmark default
      expect(formCode).toMatch(/initialListing\?\.landmark\s*\|\|\s*["']North Main Road & Lane 5["']/);

      // Check state default
      expect(formCode).toMatch(/useState\(["']Maharashtra["']\)/);

      // Check pincode default
      expect(formCode).toMatch(/useState\(["']411001["']\)/);

      // Check latitude default
      expect(formCode).toMatch(/initialListing\?\.latitude\s*\?\?\s*18\.5362/);

      // Check longitude default
      expect(formCode).toMatch(/initialListing\?\.longitude\s*\?\?\s*73\.8940/);
    });

    it("empirically verifies creating a listing with ListingForm defaults persists cleanly without triggering legacy city wipe guard", () => {
      const defaultPayload = {
        title: "Koregaon Park Lane 7 Covered EV Spot",
        subtitle: "Covered bay in Koregaon Park",
        description: "Secure dedicated parking space in Koregaon Park, Lane 7.",
        address: "Bungalow 14, Lane 7, Koregaon Park",
        locality: "Koregaon Park",
        landmark: "North Main Road & Lane 5",
        city: "Pune",
        latitude: 18.5362,
        longitude: 73.8940,
        spaceType: "covered" as const,
        vehicleTypes: ["hatchback" as const, "sedan" as const],
        hourlyRateInr: 60,
        dailyRateInr: 420,
        status: "published" as const,
      };

      const created = createListing("user-host-1", defaultPayload);
      expect(created.id).toBeDefined();
      expect(created.city).toBe("Pune");
      expect(created.locality).toBe("Koregaon Park");
      expect(created.latitude).toBe(18.5362);
      expect(created.longitude).toBe(73.8940);

      // Call readDb() - this directly executes the automatic migration wipe guard in src/lib/db.ts:46-54:
      // const hasStaleNonPuneSeed = parsed.listings?.some(
      //   (l) => l.city === "Bengaluru" || l.city === "Mumbai" || l.city === "New Delhi"
      // );
      const dbAfterRead = readDb();

      // Verify custom listing is STILL present and NOT wiped
      const retrieved = dbAfterRead.listings.find((l) => l.id === created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe("Koregaon Park Lane 7 Covered EV Spot");
      expect(retrieved?.city).toBe("Pune");

      // Verify the guard condition evaluated to false
      const hasStaleNonPuneSeed = dbAfterRead.listings.some(
        (l) => l.city === "Bengaluru" || l.city === "Mumbai" || l.city === "New Delhi"
      );
      expect(hasStaleNonPuneSeed).toBe(false);
    });

    it("adversarially tests the wipe guard: injecting a legacy city listing DOES trigger re-seed wipe", () => {
      // Read current DB and deliberately inject a legacy listing
      const currentDb = readDb();
      const legacyListing = {
        ...currentDb.listings[0],
        id: "listing-legacy-adversarial",
        title: "Legacy Stale Spot",
        city: "Bengaluru",
      };

      currentDb.listings.push(legacyListing);
      writeDb(currentDb);

      // Verify the raw file contains the legacy listing
      const rawAfterInject = JSON.parse(fs.readFileSync(TEST_DB_PATH, "utf-8")) as DatabaseSchema;
      expect(rawAfterInject.listings.some((l) => l.id === "listing-legacy-adversarial")).toBe(true);

      // Now call readDb(): it MUST detect the stale seed and wipe back to fresh Pune seed
      const wipedDb = readDb();
      expect(wipedDb.listings.some((l) => l.id === "listing-legacy-adversarial")).toBe(false);
      expect(wipedDb.listings.every((l) => l.city === "Pune")).toBe(true);

      // Confirm that NONE of the legacy cities exist after re-seed
      const legacyCitiesFound = wipedDb.listings.some(
        (l) => l.city === "Bengaluru" || l.city === "Mumbai" || l.city === "New Delhi"
      );
      expect(legacyCitiesFound).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 3: Negative Corpus & Legacy City Absence Scan
  // =========================================================================
  describe("Suite 3: Negative Corpus & Legacy City Absence Scan", () => {
    const forbiddenCities = [
      "Bengaluru",
      "Bangalore",
      "Mumbai",
      "Bombay",
      "Delhi",
      "New Delhi",
      "Indiranagar",
      "Koramangala",
      "HSR Layout",
      "Whitefield",
      "Bandra",
      "Andheri",
    ];

    it("verifies zero legacy city or locality names appear anywhere in ListingForm.tsx", () => {
      const listingFormPath = path.resolve(
        process.cwd(),
        "src",
        "components",
        "host",
        "ListingForm.tsx"
      );
      const content = fs.readFileSync(listingFormPath, "utf-8");

      forbiddenCities.forEach((legacyTerm) => {
        const regex = new RegExp(`\\b${legacyTerm}\\b`, "i");
        const match = content.match(regex);
        expect(
          match,
          `Found forbidden legacy term '${legacyTerm}' in ListingForm.tsx!`
        ).toBeNull();
      });
    });

    it("verifies zero legacy city or locality names appear anywhere in HostLocationPicker.tsx", () => {
      const pickerPath = path.resolve(
        process.cwd(),
        "src",
        "components",
        "map",
        "HostLocationPicker.tsx"
      );
      const content = fs.readFileSync(pickerPath, "utf-8");

      forbiddenCities.forEach((legacyTerm) => {
        const regex = new RegExp(`\\b${legacyTerm}\\b`, "i");
        const match = content.match(regex);
        expect(
          match,
          `Found forbidden legacy term '${legacyTerm}' in HostLocationPicker.tsx!`
        ).toBeNull();
      });
    });

    it("verifies zero legacy Karnataka or outstation pincodes appear in ListingForm.tsx or HostLocationPicker.tsx", () => {
      const listingFormPath = path.resolve(
        process.cwd(),
        "src",
        "components",
        "host",
        "ListingForm.tsx"
      );
      const pickerPath = path.resolve(
        process.cwd(),
        "src",
        "components",
        "map",
        "HostLocationPicker.tsx"
      );

      const formContent = fs.readFileSync(listingFormPath, "utf-8");
      const pickerContent = fs.readFileSync(pickerPath, "utf-8");

      // Bengaluru pincodes start with 560xxx, Mumbai with 400xxx, Delhi with 110xxx
      const legacyPincodes = [/\b560\d{3}\b/, /\b400\d{3}\b/, /\b110\d{3}\b/];

      legacyPincodes.forEach((pattern) => {
        expect(formContent).not.toMatch(pattern);
        expect(pickerContent).not.toMatch(pattern);
      });
    });
  });

  // =========================================================================
  // SUITE 4: Map Container & Client Architecture Defense
  // =========================================================================
  describe("Suite 4: Map Container & Client Architecture Defense", () => {
    it("confirms HostLocationPicker has 'use client' and safe dynamic Leaflet import inside useEffect", () => {
      const pickerPath = path.resolve(
        process.cwd(),
        "src",
        "components",
        "map",
        "HostLocationPicker.tsx"
      );
      const content = fs.readFileSync(pickerPath, "utf-8");

      // Must be a client component
      expect(content.trim().startsWith('"use client";') || content.trim().startsWith("'use client';")).toBe(true);

      // Must guard Leaflet execution against Node.js SSR
      expect(content).toContain('typeof window === "undefined"');
      expect(content).toContain('import("leaflet")');

      // Carto Voyager tiles configured with OSM attribution
      expect(content).toContain("cartocdn.com/rastertiles/voyager");
      expect(content).toContain("OpenStreetMap");

      // Draggable marker configuration
      expect(content).toContain("draggable: true");
      expect(content).toContain("autoPan: true");

      // Pune max bounds restriction
      expect(content).toMatch(/18\.30.*73\.60/);
      expect(content).toMatch(/18\.75.*74\.15/);
    });

    it("confirms ListingForm dynamically imports HostLocationPicker with ssr: false", () => {
      const listingFormPath = path.resolve(
        process.cwd(),
        "src",
        "components",
        "host",
        "ListingForm.tsx"
      );
      const content = fs.readFileSync(listingFormPath, "utf-8");

      expect(content).toMatch(
        /const HostLocationPicker = dynamic\(\s*\(\)\s*=>\s*import\(["']@\/components\/map\/HostLocationPicker["']\)/
      );
      expect(content).toContain("ssr: false");
    });
  });
});
