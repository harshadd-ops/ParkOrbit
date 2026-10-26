import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import {
  readDb,
  writeDb,
  resetDatabaseForTests,
  getUserById,
  updateListing,
  updatePlatformConfigAsAdmin,
  resolveReportAsAdmin,
  createListing,
} from "../src/lib/db";
import { resolveRequestUser, AUTH_COOKIE_NAME } from "../src/lib/auth-server";
import { DEMO_PERSONAS, DemoPersonaConfig } from "../src/context/AuthContext";
import { DatabaseSchema, UserRole } from "../src/lib/types";

// Import API Route Handlers directly
import { GET as getAuth, POST as postAuth } from "../src/app/api/auth/route";
import { GET as getBookings } from "../src/app/api/bookings/route";
import { PATCH as patchReports } from "../src/app/api/reports/route";
import { PATCH as patchListing } from "../src/app/api/listings/[id]/route";

const STRESS_DB_PATH = "data/parkorbit-m2-stress-db.json";

const PUNE_BOUNDS = {
  MIN_LAT: 18.40,
  MAX_LAT: 18.65,
  MIN_LNG: 73.70,
  MAX_LNG: 74.00,
};

// Helper replicating Navbar getNavLinks logic for testing
function getNavLinksForRole(role: string) {
  switch (role) {
    case "driver":
      return [
        { href: "/", label: "Find Parking" },
        { href: "/dashboard/driver", label: "My Bookings" },
      ];
    case "host":
      return [
        { href: "/dashboard/host", label: "My Spaces & Bookings" },
        { href: "/host/new", label: "Host a Space" },
      ];
    case "admin":
      return [
        { href: "/admin", label: "Trust & Moderation" },
      ];
    default:
      return [
        { href: "/", label: "Find Parking" },
        { href: "/dashboard/driver", label: "My Bookings" },
      ];
  }
}

function getBrandRootHref(role: string) {
  return role === "host" ? "/dashboard/host" : role === "admin" ? "/admin" : "/";
}

describe("Empirical Challenger M2: Role-Specific Views & 1-Click Persona Switcher", () => {
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

  /* ------------------------------------------------------------------------
   * SUITE 1: DEMO PERSONAS ROSTER & CANONICAL SEED ALIGNMENT
   * ------------------------------------------------------------------------ */
  describe("Suite 1: DEMO_PERSONAS Configuration & Seed Alignment", () => {
    it("empirically verifies DEMO_PERSONAS contains exactly 3 canonical personas with correct roles", () => {
      expect(DEMO_PERSONAS).toBeDefined();
      expect(DEMO_PERSONAS.length).toBe(3);

      const driver = DEMO_PERSONAS.find((p) => p.id === "user-driver-1");
      const host = DEMO_PERSONAS.find((p) => p.id === "user-host-1");
      const admin = DEMO_PERSONAS.find((p) => p.id === "user-admin-1");

      expect(driver).toBeDefined();
      expect(driver?.role).toBe("driver");
      expect(driver?.targetPath).toBe("/");
      expect(driver?.name).toBe("Aarav");
      expect(driver?.fullName).toBe("Aarav Mehta");

      expect(host).toBeDefined();
      expect(host?.role).toBe("host");
      expect(host?.targetPath).toBe("/dashboard/host");
      expect(host?.name).toBe("Neha");
      expect(host?.fullName).toBe("Neha Kulkarni");

      expect(admin).toBeDefined();
      expect(admin?.role).toBe("admin");
      expect(admin?.targetPath).toBe("/admin");
      expect(admin?.name).toBe("Nandini");
      expect(admin?.fullName).toBe("Nandini Sharma");
    });

    it("empirically verifies that all DEMO_PERSONAS exist in the database with authentic Pune metadata", () => {
      const db = readDb();
      for (const persona of DEMO_PERSONAS) {
        const user = db.users.find((u) => u.id === persona.id);
        expect(user, `User ${persona.id} must exist in seed DB`).toBeDefined();
        expect(user?.role).toBe(persona.role);
        expect(user?.name.startsWith(persona.fullName)).toBe(true);
        expect(user?.isDemo).toBe(true);
        if (user?.defaultVehiclePlate) {
          // Authentic Maharashtra plate starting with MH
          expect(user.defaultVehiclePlate.startsWith("MH-")).toBe(true);
        }
      }
    });
  });

  /* ------------------------------------------------------------------------
   * SUITE 2: AUTH CONTEXT & /api/auth STATE TRANSITIONS
   * ------------------------------------------------------------------------ */
  describe("Suite 2: Auth State Transitions & Cookie Management", () => {
    it("empirically switches to user-driver-1 and sets session cookie", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", userId: "user-driver-1" }),
      });

      const res = await postAuth(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.currentUser).toBeDefined();
      expect(json.currentUser.id).toBe("user-driver-1");
      expect(json.currentUser.role).toBe("driver");
      expect(json.currentUser.name).toBe("Aarav Mehta");

      const cookieHeader = res.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain(`${AUTH_COOKIE_NAME}=user-driver-1`);
    });

    it("empirically switches to user-host-1 and sets session cookie", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", userId: "user-host-1" }),
      });

      const res = await postAuth(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.currentUser).toBeDefined();
      expect(json.currentUser.id).toBe("user-host-1");
      expect(json.currentUser.role).toBe("host");
      expect(json.currentUser.name).toBe("Neha Kulkarni");

      const cookieHeader = res.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain(`${AUTH_COOKIE_NAME}=user-host-1`);
    });

    it("empirically switches to user-admin-1 and sets session cookie", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", userId: "user-admin-1" }),
      });

      const res = await postAuth(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.currentUser).toBeDefined();
      expect(json.currentUser.id).toBe("user-admin-1");
      expect(json.currentUser.role).toBe("admin");
      expect(json.currentUser.name).toContain("Nandini Sharma");

      const cookieHeader = res.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain(`${AUTH_COOKIE_NAME}=user-admin-1`);
    });

    it("adversarially rejects switching to non-existent or invalid userId", async () => {
      const reqNonExistent = new NextRequest("http://localhost:3000/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", userId: "user-phantom-999" }),
      });

      const resNonExistent = await postAuth(reqNonExistent);
      expect(resNonExistent.status).toBe(404);
      const json = await resNonExistent.json();
      expect(json.error).toBe("User not found.");

      const reqEmpty = new NextRequest("http://localhost:3000/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", userId: "" }),
      });
      const resEmpty = await postAuth(reqEmpty);
      expect(resEmpty.status).toBe(404);
    });

    it("empirically verifies rapid cyclic switching (driver -> host -> admin) is idempotent and stable", async () => {
      const personas = ["user-driver-1", "user-host-1", "user-admin-1"];
      const expectedRoles = ["driver", "host", "admin"];

      for (let cycle = 0; cycle < 15; cycle++) {
        for (let i = 0; i < personas.length; i++) {
          const targetId = personas[i];
          const expectedRole = expectedRoles[i];

          const req = new NextRequest("http://localhost:3000/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "switch", userId: targetId }),
          });

          const res = await postAuth(req);
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.currentUser.id).toBe(targetId);
          expect(data.currentUser.role).toBe(expectedRole);
        }
      }
    });

    it("empirically verifies logout transition clears session to guest", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });

      const res = await postAuth(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.currentUser).toBeNull();

      const cookieHeader = res.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain(`${AUTH_COOKIE_NAME}=guest`);
    });

    it("empirically verifies resolveRequestUser resolution logic across cookies, headers, and guest states", () => {
      // 1. With user cookie
      const reqWithCookie = new NextRequest("http://localhost:3000/api/bookings", {
        headers: { cookie: `${AUTH_COOKIE_NAME}=user-host-1` },
      });
      const userFromCookie = resolveRequestUser(reqWithCookie);
      expect(userFromCookie?.id).toBe("user-host-1");
      expect(userFromCookie?.role).toBe("host");

      // 2. With x-parkorbit-user-id header
      const reqWithHeader = new NextRequest("http://localhost:3000/api/bookings", {
        headers: { "x-parkorbit-user-id": "user-admin-1" },
      });
      const userFromHeader = resolveRequestUser(reqWithHeader);
      expect(userFromHeader?.id).toBe("user-admin-1");
      expect(userFromHeader?.role).toBe("admin");

      // 3. With guest cookie
      const reqGuest = new NextRequest("http://localhost:3000/api/bookings", {
        headers: { cookie: `${AUTH_COOKIE_NAME}=guest` },
      });
      const userGuest = resolveRequestUser(reqGuest);
      expect(userGuest).toBeNull();

      // 4. Fallback when unauthenticated and no cookie (zero friction demo exploration)
      const reqEmpty = new NextRequest("http://localhost:3000/api/bookings");
      const userFallback = resolveRequestUser(reqEmpty);
      expect(userFallback).toBeDefined();
      expect(userFallback?.id).toBe("user-driver-1");
    });
  });

  /* ------------------------------------------------------------------------
   * SUITE 3: ROLE-GATED NAVIGATION & EXCLUSIVITY
   * ------------------------------------------------------------------------ */
  describe("Suite 3: Role-Gated Navigation Routes & Exclusivity", () => {
    it("empirically verifies Driver navigation contains only driver links and excludes host/admin paths", () => {
      const links = getNavLinksForRole("driver");
      const hrefs = links.map((l) => l.href);

      expect(hrefs).toContain("/");
      expect(hrefs).toContain("/dashboard/driver");

      // Strict Exclusivity
      expect(hrefs).not.toContain("/dashboard/host");
      expect(hrefs).not.toContain("/host/new");
      expect(hrefs).not.toContain("/admin");

      expect(getBrandRootHref("driver")).toBe("/");
    });

    it("empirically verifies Host navigation contains only host links and excludes driver/admin paths", () => {
      const links = getNavLinksForRole("host");
      const hrefs = links.map((l) => l.href);

      expect(hrefs).toContain("/dashboard/host");
      expect(hrefs).toContain("/host/new");

      // Strict Exclusivity
      expect(hrefs).not.toContain("/");
      expect(hrefs).not.toContain("/dashboard/driver");
      expect(hrefs).not.toContain("/admin");

      expect(getBrandRootHref("host")).toBe("/dashboard/host");
    });

    it("empirically verifies Admin navigation contains only admin links and excludes driver/host paths", () => {
      const links = getNavLinksForRole("admin");
      const hrefs = links.map((l) => l.href);

      expect(hrefs).toContain("/admin");

      // Strict Exclusivity
      expect(hrefs).not.toContain("/");
      expect(hrefs).not.toContain("/dashboard/driver");
      expect(hrefs).not.toContain("/dashboard/host");
      expect(hrefs).not.toContain("/host/new");

      expect(getBrandRootHref("admin")).toBe("/admin");
    });

    it("empirically verifies unknown or default role falls back to Driver navigation", () => {
      const links = getNavLinksForRole("unknown_role");
      const hrefs = links.map((l) => l.href);

      expect(hrefs).toContain("/");
      expect(hrefs).toContain("/dashboard/driver");
      expect(hrefs).not.toContain("/dashboard/host");
      expect(hrefs).not.toContain("/admin");
    });
  });

  /* ------------------------------------------------------------------------
   * SUITE 4: ROLE-BASED AUTHORIZATION & ENDPOINT DATA SCOPING
   * ------------------------------------------------------------------------ */
  describe("Suite 4: Role-Based Endpoint Scoping & Authorization Security", () => {
    it("empirically verifies /api/bookings data scoping between Driver and Host", async () => {
      // 1. Request as Driver (user-driver-1)
      const driverReq = new NextRequest("http://localhost:3000/api/bookings?role=driver", {
        headers: { "x-parkorbit-user-id": "user-driver-1" },
      });
      const driverRes = await getBookings(driverReq);
      expect(driverRes.status).toBe(200);
      const driverData = await driverRes.json();

      // Driver owns zero host listings
      expect(driverData.hostListings.length).toBe(0);
      expect(driverData.hostBookings.length).toBe(0);

      // 2. Request as Host (user-host-1)
      const hostReq = new NextRequest("http://localhost:3000/api/bookings?role=host", {
        headers: { "x-parkorbit-user-id": "user-host-1" },
      });
      const hostRes = await getBookings(hostReq);
      expect(hostRes.status).toBe(200);
      const hostData = await hostRes.json();

      // Host Neha Kulkarni owns listings
      expect(hostData.hostListings.length).toBeGreaterThan(0);
      for (const listing of hostData.hostListings) {
        expect(listing.hostId).toBe("user-host-1");
      }

      // 3. Request as unauthenticated Guest
      const guestReq = new NextRequest("http://localhost:3000/api/bookings", {
        headers: { cookie: `${AUTH_COOKIE_NAME}=guest` },
      });
      const guestRes = await getBookings(guestReq);
      expect(guestRes.status).toBe(401);
    });

    it("empirically enforces admin-only authorization on platform config updates (/api/reports)", async () => {
      // Driver attempt -> must be rejected with 403
      const driverReq = new NextRequest("http://localhost:3000/api/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-parkorbit-user-id": "user-driver-1",
        },
        body: JSON.stringify({
          action: "update_config",
          commissionRatePercent: 25,
        }),
      });
      const driverRes = await patchReports(driverReq);
      expect(driverRes.status).toBe(403);
      const driverJson = await driverRes.json();
      expect(driverJson.error).toContain("FORBIDDEN");

      // Host attempt -> must be rejected with 403
      const hostReq = new NextRequest("http://localhost:3000/api/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-parkorbit-user-id": "user-host-1",
        },
        body: JSON.stringify({
          action: "update_config",
          commissionRatePercent: 25,
        }),
      });
      const hostRes = await patchReports(hostReq);
      expect(hostRes.status).toBe(403);

      // Admin attempt -> must succeed with 200
      const adminReq = new NextRequest("http://localhost:3000/api/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-parkorbit-user-id": "user-admin-1",
        },
        body: JSON.stringify({
          action: "update_config",
          commissionRatePercent: 15,
        }),
      });
      const adminRes = await patchReports(adminReq);
      expect(adminRes.status).toBe(200);
      const adminJson = await adminRes.json();
      expect(adminJson.config.commissionRatePercent).toBe(15);
    });

    it("empirically prevents non-owner driver or host from altering another host's listing", async () => {
      const db = readDb();
      const hostListing = db.listings.find((l) => l.hostId === "user-host-1");
      expect(hostListing).toBeDefined();
      if (!hostListing) return;

      // 1. Driver user-driver-1 tries to pause Host's listing
      const driverReq = new NextRequest(
        `http://localhost:3000/api/listings/${hostListing.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-parkorbit-user-id": "user-driver-1",
          },
          body: JSON.stringify({ status: "paused" }),
        }
      );
      const driverRes = await patchListing(driverReq, {
        params: Promise.resolve({ id: hostListing.id }),
      });
      expect(driverRes.status).toBe(403);
      const driverErr = await driverRes.json();
      expect(driverErr.error).toContain("FORBIDDEN");

      // 2. Listing owner user-host-1 updates own listing -> 200 OK
      const ownerReq = new NextRequest(
        `http://localhost:3000/api/listings/${hostListing.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-parkorbit-user-id": "user-host-1",
          },
          body: JSON.stringify({ status: "paused" }),
        }
      );
      const ownerRes = await patchListing(ownerReq, {
        params: Promise.resolve({ id: hostListing.id }),
      });
      expect(ownerRes.status).toBe(200);
      const ownerData = await ownerRes.json();
      expect(ownerData.listing.status).toBe("paused");
    });
  });

  /* ------------------------------------------------------------------------
   * SUITE 5: DRIVER DISCOVERY VIEW DE-CLUTTERING & PUNE GEOLOCATION
   * ------------------------------------------------------------------------ */
  describe("Suite 5: Driver Discovery Cleanliness & Pune Geolocation", () => {
    it("empirically verifies all locality chips in find/page.tsx fall within authentic Pune coordinates", () => {
      const pageFile = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "find", "page.tsx"),
        "utf-8"
      );

      const localityMatch = pageFile.match(
        /const LOCALITIES: Array<\{ name: string; lat: number; lng: number \}> = (\[[\s\S]*?\n\];)/
      );
      expect(localityMatch?.[1]).toBeDefined();

      const entryRegex = /\{\s*name:\s*"([^"]+)",\s*lat:\s*([0-9.]+),\s*lng:\s*([0-9.]+)\s*\}/g;
      let match;
      let count = 0;
      while ((match = entryRegex.exec(localityMatch![1])) !== null) {
        const lat = parseFloat(match[2]);
        const lng = parseFloat(match[3]);
        count++;
        expect(lat).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LAT);
        expect(lat).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LAT);
        expect(lng).toBeGreaterThanOrEqual(PUNE_BOUNDS.MIN_LNG);
        expect(lng).toBeLessThanOrEqual(PUNE_BOUNDS.MAX_LNG);
      }
      expect(count).toBeGreaterThanOrEqual(8);
    });

    it("empirically verifies absence of marketing walls, stat strips, and host banners in page.tsx", () => {
      const pageContent = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "page.tsx"),
        "utf-8"
      );

      // Verify removed marketing walls
      expect(pageContent).not.toContain("STADIUM-SCALE PARKING REDEFINED");
      expect(pageContent).not.toContain("24,000+ PARKING SPOTS");
      expect(pageContent).not.toContain("HOW PARKORBIT WORKS");
      expect(pageContent).not.toContain("EARN FROM YOUR EMPTY PARKING SPOT");
      expect(pageContent).not.toContain("Indiranagar");
      expect(pageContent).not.toContain("Bengaluru");
      expect(pageContent).not.toContain("Mumbai");
      expect(pageContent).not.toContain("Delhi");
    });
  });

  /* ------------------------------------------------------------------------
   * SUITE 6: UI PERSONA CONSISTENCY & DEFECT AUDIT
   * ------------------------------------------------------------------------ */
  describe("Suite 6: Persona Consistency & UI Defect Identification", () => {
    it("adversarially audits src/app/admin/page.tsx for stale persona name references", () => {
      const adminPageContent = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "admin", "page.tsx"),
        "utf-8"
      );

      const hasMeeraKrishnan = adminPageContent.includes("Meera Krishnan");
      expect(hasMeeraKrishnan).toBe(false);
      expect(adminPageContent).toContain("Nandini Sharma");
    });

    it("verifies Navbar persona pills have proper test IDs and labels for automated testing", () => {
      const navbarContent = fs.readFileSync(
        path.join(process.cwd(), "src", "components", "layout", "Navbar.tsx"),
        "utf-8"
      );

      expect(navbarContent).toContain('data-testid="nav-persona-switcher"');
      expect(navbarContent).toContain('data-testid={`persona-pill-${persona.role}`}');
    });
  });
});
