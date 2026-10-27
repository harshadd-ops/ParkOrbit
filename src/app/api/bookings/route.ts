import { NextRequest, NextResponse } from "next/server";
import { createBooking, readDb } from "@/lib/db";
import { resolveRequestUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const actor = resolveRequestUser(req);
  if (!actor) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const db = readDb();
  const driverBookings = db.bookings.filter((b) => b.driverId === actor.id);
  // Hosts must ask the driver for the PIN at the gate, so it's never sent to them
  const hostBookings = db.bookings
    .filter((b) => b.hostId === actor.id)
    .map((b) => (b.driverId === actor.id ? b : { ...b, checkinPin: "" }));
  const hostListings = db.listings.filter((l) => l.hostId === actor.id);
  const hostBlocks = db.blockedPeriods.filter((blk) =>
    hostListings.some((l) => l.id === blk.listingId)
  );
  const hostReviews = db.reviews.filter((rev) =>
    hostListings.some((l) => l.id === rev.listingId)
  );

  // Honest financial calculations for host
  const activeOrCompletedHostBookings = hostBookings.filter(
    (b) => b.status !== "cancelled"
  );
  const grossBookingVolumeInr = activeOrCompletedHostBookings.reduce(
    (sum, b) => sum + b.baseSubtotalInr,
    0
  );
  const totalPlatformCommissionInr = activeOrCompletedHostBookings.reduce(
    (sum, b) => sum + b.platformHostCommissionInr,
    0
  );
  const completedEstimatedEarningsInr = hostBookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.netHostEarningsInr, 0);
  const upcomingPendingEarningsInr = hostBookings
    .filter((b) => b.status === "confirmed" || b.status === "checked_in")
    .reduce((sum, b) => sum + b.netHostEarningsInr, 0);
  const totalBookedHours = activeOrCompletedHostBookings.reduce(
    (sum, b) => sum + b.durationHours,
    0
  );

  return NextResponse.json({
    driverBookings,
    hostBookings,
    hostListings,
    hostBlocks,
    hostReviews,
    hostFinancials: {
      grossBookingVolumeInr,
      totalPlatformCommissionInr,
      completedEstimatedEarningsInr,
      upcomingPendingEarningsInr,
      totalBookedHours,
      payoutStatusLabel:
        "Pending Settlement (Simulated Demo — Live Bank Payouts Not Configured)",
    },
    config: db.config,
  });
}

export async function POST(req: NextRequest) {
  try {
    const actor = resolveRequestUser(req);
    if (!actor) {
      return NextResponse.json(
        { error: "Please sign in to reserve a parking space." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = createBooking(actor.id, {
      listingId: body.listingId,
      startTime: body.startTime,
      endTime: body.endTime,
      vehicleType: body.vehicleType,
      vehiclePlate: body.vehiclePlate,
      paymentMethod: body.paymentMethod,
      paymentMethodDetail: body.paymentMethodDetail,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create booking.";
    const status = message.startsWith("CONFLICT")
      ? 409
      : message.startsWith("UNAUTHORIZED")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
