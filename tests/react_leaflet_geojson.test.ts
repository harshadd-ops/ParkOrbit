import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import type { Polygon } from "geojson";
import {
  PUNE_BOUNDARY_GEOJSON,
  PUNE_BOUNDARY_GEOJSON_URL,
} from "../src/lib/pune-geojson";
import { readDb } from "../src/lib/db";

describe("React-Leaflet v4 + OpenStreetMap + GeoJSON Boundary Verification", () => {
  it("1. Dependencies: verifies leaflet and react-leaflet (v4) are installed and leaflet.css is imported", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8")
    );
    expect(pkg.dependencies.leaflet).toBeDefined();
    expect(pkg.dependencies["react-leaflet"]).toBeDefined();
    expect(pkg.dependencies["react-leaflet"]).toMatch(/^\^?4\./);

    const basicMapSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/map/BasicMap.tsx"),
      "utf-8"
    );
    const driverMapSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/map/DriverDiscoveryMap.tsx"),
      "utf-8"
    );
    const hostPickerSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/map/HostLocationPicker.tsx"),
      "utf-8"
    );

    expect(basicMapSrc).toContain('import "leaflet/dist/leaflet.css"');
    expect(driverMapSrc).toContain('import "leaflet/dist/leaflet.css"');
    expect(hostPickerSrc).toContain('import "leaflet/dist/leaflet.css"');
  });

  it("2. Base Map: verifies <MapContainer> and OpenStreetMap TileLayer with explicit height", () => {
    const osmTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const osmAttribution =
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    for (const relPath of [
      "src/components/map/BasicMap.tsx",
      "src/components/map/DriverDiscoveryMap.tsx",
      "src/components/map/HostLocationPicker.tsx",
    ]) {
      const src = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
      expect(src).toContain("MapContainer");
      expect(src).toContain("TileLayer");
      expect(src).toContain(osmTileUrl);
      expect(src).toContain(osmAttribution);
      expect(src).toContain('height: "100%", width: "100%"');
    }
  });

  it("3. GeoJSON Boundary: verifies valid Pune administrative boundary GeoJSON file, <GeoJSON> styling, and FitBounds helper", () => {
    const geoJsonFilePath = path.resolve(
      process.cwd(),
      "public",
      PUNE_BOUNDARY_GEOJSON_URL.replace(/^\//, "")
    );
    expect(fs.existsSync(geoJsonFilePath)).toBe(true);

    const fileGeoJson = JSON.parse(fs.readFileSync(geoJsonFilePath, "utf-8"));
    expect(fileGeoJson.type).toBe("FeatureCollection");
    expect(fileGeoJson.features.length).toBeGreaterThan(0);
    expect(fileGeoJson.features[0].geometry.type).toBe("Polygon");

    // Compute bounding box from PUNE_BOUNDARY_GEOJSON polygon ring and verify it encloses all Pune listings
    const polygon = PUNE_BOUNDARY_GEOJSON.features[0].geometry as Polygon;
    const ring = polygon.coordinates[0];
    const lngs = ring.map((pt) => pt[0]);
    const lats = ring.map((pt) => pt[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const db = readDb();
    for (const listing of db.listings) {
      expect(listing.latitude).toBeGreaterThanOrEqual(minLat);
      expect(listing.latitude).toBeLessThanOrEqual(maxLat);
      expect(listing.longitude).toBeGreaterThanOrEqual(minLng);
      expect(listing.longitude).toBeLessThanOrEqual(maxLng);
    }

    // Verify <GeoJSON>, FitBounds, and useMap().fitBounds(bounds) in components
    const basicMapSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/map/BasicMap.tsx"),
      "utf-8"
    );
    expect(basicMapSrc).toContain("<GeoJSON");
    expect(basicMapSrc).toContain("map.fitBounds(bounds");
    expect(basicMapSrc).toContain("#0055A4");

    const driverMapSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/map/DriverDiscoveryMap.tsx"),
      "utf-8"
    );
    // Discovery map fits to the listings but deliberately draws no boundary outline
    expect(driverMapSrc).not.toContain("RL.GeoJSON");
    expect(driverMapSrc).toContain("map.fitBounds(bounds");
  });

  it("4. Markers / Pins: verifies clickable markers on every map", () => {
    const basicSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/map/BasicMap.tsx"),
      "utf-8"
    );
    expect(basicSrc).toContain("CircleMarker");
    expect(basicSrc).toContain("Popup");
    expect(basicSrc).toContain("Tooltip");

    // Discovery + picker use a single clean Marker per spot (no duplicate dots or popups)
    const driverSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/map/DriverDiscoveryMap.tsx"),
      "utf-8"
    );
    expect(driverSrc).toContain("RL.Marker");
    expect(driverSrc).toContain("click: () => onSelect(listing.id)");
    const pickerSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/map/HostLocationPicker.tsx"),
      "utf-8"
    );
    expect(pickerSrc).toContain("RL.Marker");
    expect(pickerSrc).toContain("dragend");
  });

  it("5. Invalidate Size: verifies map.invalidateSize() helper on mount and window resize", () => {
    for (const relPath of [
      "src/components/map/BasicMap.tsx",
      "src/components/map/DriverDiscoveryMap.tsx",
      "src/components/map/HostLocationPicker.tsx",
    ]) {
      const src = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
      expect(src).toContain("map.invalidateSize()");
      expect(src).toContain('window.addEventListener("resize"');
    }
  });
});
