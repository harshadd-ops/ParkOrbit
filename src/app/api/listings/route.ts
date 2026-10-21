import { NextRequest, NextResponse } from "next/server";
import { createListing, readDb, searchListings } from "@/lib/db";
import { resolveRequestUser } from "@/lib/auth-server";
import { SpaceType, VehicleType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || undefined;
  const city = searchParams.get("city") || undefined;
  const spaceType = (searchParams.get("spaceType") as SpaceType | "all") || "all";
  const vehicleType =
    (searchParams.get("vehicleType") as VehicleType | "all") || "all";
  const maxHourlyPrice = searchParams.get("maxHourlyPrice")
    ? Number(searchParams.get("maxHourlyPrice"))
    : undefined;
  const startTime = searchParams.get("startTime") || undefined;
  const endTime = searchParams.get("endTime") || undefined;
  const lat = searchParams.get("lat")
    ? Number(searchParams.get("lat"))
    : undefined;
  const lng = searchParams.get("lng")
    ? Number(searchParams.get("lng"))
    : undefined;
  const maxDistanceKm = searchParams.get("maxDistanceKm")
    ? Number(searchParams.get("maxDistanceKm"))
    : undefined;
  const onlyAvailable = searchParams.get("onlyAvailable") === "true";
  const sortBy =
    (searchParams.get("sortBy") as
      | "featured"
      | "price_asc"
      | "price_desc"
      | "distance"
      | "rating") || "featured";
  const hostId = searchParams.get("hostId") || undefined;

  const listings = searchListings({
    query,
    city,
    spaceType,
    vehicleType,
    maxHourlyPrice,
    startTime,
    endTime,
    lat,
    lng,
    maxDistanceKm,
    onlyAvailable,
    sortBy,
    includeNonPublishedForHostId: hostId,
  });

  const db = readDb();
  return NextResponse.json({
    listings,
    config: db.config,
  });
}

export async function POST(req: NextRequest) {
  try {
    const actor = resolveRequestUser(req);
    if (!actor) {
      return NextResponse.json(
        { error: "Please sign in to create a parking listing." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const created = createListing(actor.id, body);
    return NextResponse.json({ listing: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create listing.";
    const status = message.startsWith("UNAUTHORIZED")
      ? 401
      : message.startsWith("FORBIDDEN")
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
