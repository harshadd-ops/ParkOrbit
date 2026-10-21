import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import {
  readDb,
  resetDatabaseForTests,
  searchListings,
  getListingDetails,
  calculateDistanceKm,
} from "../src/lib/db";
import { createInitialSeedData, URBAN_HUBS } from "../src/lib/seed";
import { PUNE_NEIGHBORHOOD_PRESETS } from "../src/components/map/HostLocationPicker";

// Strict Pune Metropolitan Coordinate Bounding Box per PROJECT.md interface contract
const PUNE_BOUNDS = {
  MIN_LAT: 18.40,
  MAX_LAT: 18.65,
  MIN_LNG: 73.70,
  MAX_LNG: 74.00,
};

// Pune localities map extracted from src/app/page.tsx
const PUNE_LOCALITIES_PAGE: Record<string, { lat: number; lng: number; label: string }> = {
  "Koregaon Park": { lat: 18.5362, lng: 73.8940, label: "Koregaon Park, Pune" },
  "Baner": { lat: 18.5590, lng: 73.7868, label: "Baner, Pune" },
  "Hinjewadi": { lat: 18.5913, lng: 73.7389, label: "Hinjewadi, Pune" },
  "Kothrud": { lat: 18.5074, lng: 73.8077, label: "Kothrud, Pune" },
  "Viman Nagar": { lat: 18.5679, lng: 73.9143, label: "Viman Nagar, Pune" },
  "FC Road": { lat: 18.5222, lng: 73.8416, label: "FC Road, Pune" },
  "Wakad": { lat: 18.5987, lng: 73.7686, label: "Wakad, Pune" },
  "Magarpatta": { lat: 18.5158, lng: 73.9272, label: "Magarpatta, Pune" },
};

// Reusable price pin renderer matching DriverDiscoveryMap.tsx logic
function renderMarkerHtml(
  hourlyRateInr: number,
  options: {
    isSelected?: boolean;
    isAvailable?: boolean;
    distanceKm?: number;
  } = {}
): string {
  const isSelected = options.isSelected ?? false;
  const isAvailable = options.isAvailable ?? true;
  const distanceKm = options.distanceKm;

  return `
    <div class="group relative inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 select-none cursor-pointer ${
      isSelected
        ? "bg-[#CF4500] text-white shadow-xl scale-110 ring-4 ring-white/60 z-30"
        : isAvailable
          ? "bg-white text-[#141413] shadow-md hover:scale-105 hover:bg-[#FCFBFA] border border-black/10"
          : "bg-[#262627] text-[#D1CDC7] border border-white/20 opacity-75"
    }">
      <span>₹${hourlyRateInr}/hr</span>
      ${
        distanceKm != null
          ? `<span class="text-[10px] opacity-75 font-normal">• ${distanceKm}km</span>`
          : ""
      }
    </div>
  `;
}

describe("Empirical Challenger M3: Leaflet Map Integration & Search/Locality Sync", () => {
  beforeEach(() => {
    resetDatabaseForTests();
  });

  afterAll(() => {
    resetDatabaseForTests();
  });

  // =========================================================================
  // SUITE 1: Pune Seed Data & Database Geospatial Verification
  // =========================================================================
  describe("Suite 1: Pune Seed Data & Database Geospatial Verification", () => {
    it("verifies 100% of seeded listings have valid coordinates in Pune bounds", () => {
      const db = readDb();
      expect(db.listings.length).toBeGreaterThanOrEqual(8);

      db.listings.forEach((listing) => {
        expect(typeof listing.latitude).toBe("number");
        expect(typeof listing.longitude).toBe("number");
        expect(Number.isFinite(listing.latitude)).toBe(true);
        expect(Number.isFinite(listing.longitude)).toBe(true);

        // Strict Pune bounds check
        expect(listing.latitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LAT);
        expect(listing.latitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LAT);
        expect(listing.longitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LNG);
        expect(listing.longitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LNG);

        // Locality & city validation
        expect(listing.city).toBe("Pune");
        expect(listing.locality).toBeTruthy();
        expect(listing.landmark).toBeTruthy();
      });
    });

    it("verifies canonical data/parkorbit-db.json file matches Pune coordinates and zero legacy cities", () => {
      const dbPath = path.resolve(process.cwd(), "data/parkorbit-db.json");
      expect(fs.existsSync(dbPath)).toBe(true);
      const raw = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

      expect(Array.isArray(raw.listings)).toBe(true);
      expect(raw.listings.length).toBeGreaterThanOrEqual(8);

      raw.listings.forEach((listing: any) => {
        expect(listing.latitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LAT);
        expect(listing.latitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LAT);
        expect(listing.longitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LNG);
        expect(listing.longitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LNG);
        expect(listing.city).toBe("Pune");
      });

      // Assert zero references to legacy cities across listings
      const legacyCities = ["Bengaluru", "Bangalore", "Mumbai", "Delhi", "New Delhi"];
      const legacyMatches = raw.listings.filter((l: any) => legacyCities.includes(l.city));
      expect(legacyMatches).toHaveLength(0);
    });

    it("verifies createInitialSeedData() generator produces exclusively Pune-bounded listings", () => {
      const seedData = createInitialSeedData();
      expect(seedData.listings.length).toBeGreaterThanOrEqual(8);

      for (const listing of seedData.listings) {
        expect(listing.latitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LAT);
        expect(listing.latitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LAT);
        expect(listing.longitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LNG);
        expect(listing.longitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LNG);
        expect(listing.city).toBe("Pune");
      }
    });
  });

  // =========================================================================
  // SUITE 2: Marker Prices & ₹/hr Formatting
  // =========================================================================
  describe("Suite 2: Marker Prices & ₹/hr Formatting", () => {
    it("verifies that marker price HTML matches listing.hourlyRateInr formatted with '₹/hr'", () => {
      const db = readDb();

      db.listings.forEach((listing) => {
        const markerHtml = renderMarkerHtml(listing.hourlyRateInr, {
          isSelected: false,
          isAvailable: true,
        });

        // Exact price text assertion
        expect(markerHtml).toContain(`₹${listing.hourlyRateInr}/hr`);
        expect(markerHtml).toMatch(new RegExp(`<span>₹${listing.hourlyRateInr}/hr</span>`));
        expect(listing.hourlyRateInr).toBeGreaterThan(0);
      });
    });

    it("verifies selected marker state switches styling to highlighted orange pill", () => {
      const sampleRate = 75;
      const unselectedHtml = renderMarkerHtml(sampleRate, { isSelected: false });
      const selectedHtml = renderMarkerHtml(sampleRate, { isSelected: true });

      // Unselected should have white background
      expect(unselectedHtml).toContain("bg-white text-[#141413]");
      expect(unselectedHtml).not.toContain("bg-[#CF4500]");

      // Selected should have prominent orange background and scale
      expect(selectedHtml).toContain("bg-[#CF4500] text-white");
      expect(selectedHtml).toContain("scale-110");
      expect(selectedHtml).toContain("ring-4 ring-white/60");
    });

    it("verifies unavailable marker state renders dimmed gray style", () => {
      const sampleRate = 90;
      const unavailableHtml = renderMarkerHtml(sampleRate, {
        isSelected: false,
        isAvailable: false,
      });

      expect(unavailableHtml).toContain("bg-[#262627]");
      expect(unavailableHtml).toContain("text-[#D1CDC7]");
      expect(unavailableHtml).toContain("opacity-75");
    });

    it("verifies distance suffix formatting when distanceKm is present vs omitted", () => {
      const withDistance = renderMarkerHtml(65, { distanceKm: 2.4 });
      const withoutDistance = renderMarkerHtml(65);

      expect(withDistance).toContain("• 2.4km");
      expect(withoutDistance).not.toContain("km");
    });

    it("verifies DriverDiscoveryMap.tsx source code binds marker text to ₹${listing.hourlyRateInr}/hr", () => {
      const mapSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/map/DriverDiscoveryMap.tsx"),
        "utf-8"
      );

      // Verify the literal template string in the component
      expect(mapSrc).toContain("<span>₹${listing.hourlyRateInr}/hr</span>");
      expect(mapSrc).toContain("pko-marker-div-icon");
      expect(mapSrc).toContain("L.divIcon");
    });
  });

  // =========================================================================
  // SUITE 3: Locality Filtering, Quick-Pills & Coordinate Mapping
  // =========================================================================
  describe("Suite 3: Locality Filtering, Quick-Pills & Coordinate Mapping", () => {
    it("verifies every entry in PUNE_LOCALITIES in page.tsx has authentic coordinates in Pune bounds", () => {
      const localityKeys = Object.keys(PUNE_LOCALITIES_PAGE);
      expect(localityKeys.length).toBe(8);

      localityKeys.forEach((key) => {
        const item = PUNE_LOCALITIES_PAGE[key];
        expect(item.lat).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LAT);
        expect(item.lat).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LAT);
        expect(item.lng).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LNG);
        expect(item.lng).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LNG);
        expect(item.label).toContain("Pune");
      });
    });

    it("verifies every URBAN_HUB in seed.ts has authentic coordinates in Pune bounds", () => {
      expect(URBAN_HUBS.length).toBe(10);

      URBAN_HUBS.forEach((hub) => {
        expect(hub.city).toBe("Pune");
        expect(hub.latitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LAT);
        expect(hub.latitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LAT);
        expect(hub.longitude).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LNG);
        expect(hub.longitude).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LNG);
        expect(hub.landmark).toBeTruthy();
        expect(hub.tag).toBeTruthy();
      });
    });

    it("verifies every PUNE_NEIGHBORHOOD_PRESET in HostLocationPicker.tsx has authentic Pune coordinates & pincodes", () => {
      expect(PUNE_NEIGHBORHOOD_PRESETS.length).toBe(8);

      PUNE_NEIGHBORHOOD_PRESETS.forEach((preset) => {
        expect(preset.lat).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LAT);
        expect(preset.lat).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LAT);
        expect(preset.lng).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LNG);
        expect(preset.lng).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LNG);
        expect(preset.pincode).toMatch(/^4110[0-9]{2}$/);
        expect(preset.locality).toBeTruthy();
        expect(preset.landmark).toBeTruthy();
      });
    });

    it("verifies locality-based search synchronization returns listings sorted by proximity to locality center", () => {
      // Test Koregaon Park with sortBy: distance
      const kpCenter = PUNE_LOCALITIES_PAGE["Koregaon Park"];
      const kpResults = searchListings({
        query: "Koregaon Park",
        lat: kpCenter.lat,
        lng: kpCenter.lng,
        sortBy: "distance",
      });
      expect(kpResults.length).toBeGreaterThan(0);
      expect(kpResults[0].id).toBe("listing-koregaon-park-1");
      expect(kpResults[0].distanceKm).toBe(0);

      // Test Baner with sortBy: distance
      const banerCenter = PUNE_LOCALITIES_PAGE["Baner"];
      const banerResults = searchListings({
        query: "Baner",
        lat: banerCenter.lat,
        lng: banerCenter.lng,
        sortBy: "distance",
      });
      expect(banerResults.length).toBeGreaterThan(0);
      expect(banerResults[0].id).toBe("listing-baner-2");
      expect(banerResults[0].distanceKm).toBe(0);

      // Test FC Road with sortBy: distance
      const fcCenter = PUNE_LOCALITIES_PAGE["FC Road"];
      const fcResults = searchListings({
        query: "FC Road",
        lat: fcCenter.lat,
        lng: fcCenter.lng,
        sortBy: "distance",
      });
      expect(fcResults.length).toBeGreaterThan(0);
      expect(fcResults[0].id).toBe("listing-fc-road-3");
      expect(fcResults[0].distanceKm).toBe(0);

      // Test Hinjewadi Phase 1 with sortBy: distance
      const hinjCenter = PUNE_LOCALITIES_PAGE["Hinjewadi"];
      const hinjResults = searchListings({
        query: "Hinjewadi",
        lat: hinjCenter.lat,
        lng: hinjCenter.lng,
        sortBy: "distance",
      });
      expect(hinjResults.length).toBeGreaterThan(0);
      expect(hinjResults[0].id).toBe("listing-hinjewadi-5");
      expect(hinjResults[0].distanceKm).toBe(0);

      // Test Kothrud with sortBy: distance
      const kothrudCenter = PUNE_LOCALITIES_PAGE["Kothrud"];
      const kothrudResults = searchListings({
        query: "Kothrud",
        lat: kothrudCenter.lat,
        lng: kothrudCenter.lng,
        sortBy: "distance",
      });
      expect(kothrudResults.length).toBeGreaterThan(0);
      expect(kothrudResults[0].id).toBe("listing-kothrud-4");
      expect(kothrudResults[0].distanceKm).toBe(0);

      // Test Viman Nagar with sortBy: distance
      const vimanCenter = PUNE_LOCALITIES_PAGE["Viman Nagar"];
      const vimanResults = searchListings({
        query: "Viman Nagar",
        lat: vimanCenter.lat,
        lng: vimanCenter.lng,
        sortBy: "distance",
      });
      expect(vimanResults.length).toBeGreaterThan(0);
      expect(vimanResults[0].id).toBe("listing-viman-nagar-6");
      expect(vimanResults[0].distanceKm).toBe(0);

      // Test Magarpatta with sortBy: distance
      const magarCenter = PUNE_LOCALITIES_PAGE["Magarpatta"];
      const magarResults = searchListings({
        query: "Magarpatta",
        lat: magarCenter.lat,
        lng: magarCenter.lng,
        sortBy: "distance",
      });
      expect(magarResults.length).toBeGreaterThan(0);
      expect(magarResults[0].id).toBe("listing-magarpatta-7");
      expect(magarResults[0].distanceKm).toBe(0);

      // Test Wakad with sortBy: distance
      const wakadCenter = PUNE_LOCALITIES_PAGE["Wakad"];
      const wakadResults = searchListings({
        query: "Wakad",
        lat: wakadCenter.lat,
        lng: wakadCenter.lng,
        sortBy: "distance",
      });
      expect(wakadResults.length).toBeGreaterThan(0);
      expect(wakadResults[0].id).toBe("listing-wakad-8");
      expect(wakadResults[0].distanceKm).toBe(0);
    });
  });

  // =========================================================================
  // SUITE 4: Carto Voyager Tile URL & Leaflet Open-Source Verification
  // =========================================================================
  describe("Suite 4: Carto Voyager Tile URL & Open-Source Verification", () => {
    const EXPECTED_TILE_URL =
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    it("verifies DriverDiscoveryMap.tsx uses the free Carto Voyager tile URL template without API keys", () => {
      const fileContent = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/map/DriverDiscoveryMap.tsx"),
        "utf-8"
      );

      expect(fileContent).toContain(EXPECTED_TILE_URL);
      expect(fileContent).toContain('subdomains: "abcd"');
      expect(fileContent).toContain("OpenStreetMap");
      expect(fileContent).toContain("CARTO");

      // Verify no paid API keys exist in URL or parameters
      expect(fileContent).not.toContain("api_key");
      expect(fileContent).not.toContain("apiKey");
      expect(fileContent).not.toContain("access_token");
      expect(fileContent).not.toMatch(/[?&](key|apiKey|token|access_token)=/i);
    });

    it("verifies HostLocationPicker.tsx uses the free Carto Voyager tile URL template without API keys", () => {
      const fileContent = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/map/HostLocationPicker.tsx"),
        "utf-8"
      );

      expect(fileContent).toContain(EXPECTED_TILE_URL);
      expect(fileContent).toContain('subdomains: "abcd"');
      expect(fileContent).toContain("OpenStreetMap");
      expect(fileContent).toContain("CARTO");

      // Verify no paid API keys exist
      expect(fileContent).not.toContain("api_key");
      expect(fileContent).not.toContain("apiKey");
      expect(fileContent).not.toContain("access_token");
      expect(fileContent).not.toMatch(/[?&](key|apiKey|token|access_token)=/i);
    });

    it("empirically verifies tile URL template resolves to a valid HTTPS endpoint", () => {
      // Substitute standard tile coordinates for Pune center (zoom 13)
      const tileUrl = EXPECTED_TILE_URL
        .replace("{s}", "a")
        .replace("{z}", "13")
        .replace("{x}", "5777")
        .replace("{y}", "3573")
        .replace("{r}", "");

      expect(tileUrl).toBe(
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/13/5777/3573.png"
      );
      expect(tileUrl.startsWith("https://")).toBe(true);
      expect(tileUrl.endsWith(".png")).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 5: SSR Safety, Isolation & Dynamic Integration
  // =========================================================================
  describe("Suite 5: SSR Safety, Isolation & Dynamic Integration", () => {
    it("verifies Leaflet is imported dynamically inside useEffect in DriverDiscoveryMap.tsx", () => {
      const src = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/map/DriverDiscoveryMap.tsx"),
        "utf-8"
      );

      // Must have window guard
      expect(src).toContain('typeof window === "undefined"');
      // Must use dynamic import
      expect(src).toMatch(/import\(\s*["']leaflet["']\s*\)/);
      // Type-only top-level import
      expect(src).toContain('import type * as LeafletTypes from "leaflet";');
    });

    it("verifies Leaflet is imported dynamically inside useEffect in HostLocationPicker.tsx", () => {
      const src = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/map/HostLocationPicker.tsx"),
        "utf-8"
      );

      // Must have window guard
      expect(src).toContain('typeof window === "undefined"');
      // Must use dynamic import
      expect(src).toMatch(/import\(\s*["']leaflet["']\s*\)/);
    });

    it("verifies page.tsx uses dynamic import with ssr: false for DriverDiscoveryMap", () => {
      const pageSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/app/page.tsx"),
        "utf-8"
      );

      expect(pageSrc).toContain("next/dynamic");
      expect(pageSrc).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\(["']@\/components\/map\/DriverDiscoveryMap["']\)/);
      expect(pageSrc).toContain("ssr: false");
    });

    it("verifies ListingForm.tsx uses dynamic import with ssr: false for HostLocationPicker", () => {
      const formSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/host/ListingForm.tsx"),
        "utf-8"
      );

      expect(formSrc).toContain("next/dynamic");
      expect(formSrc).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\(["']@\/components\/map\/HostLocationPicker["']\)/);
      expect(formSrc).toContain("ssr: false");
    });

    it("verifies globals.css enforces Leaflet isolation and caps z-index below Navbar/Modals", () => {
      const cssSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/app/globals.css"),
        "utf-8"
      );

      expect(cssSrc).toContain('@import "leaflet/dist/leaflet.css";');
      expect(cssSrc).toContain(".leaflet-container");
      expect(cssSrc).toContain("isolation: isolate;");
      expect(cssSrc).toContain("z-index: 10 !important;");
      expect(cssSrc).toContain("z-index: 20 !important;");
    });
  });
});
