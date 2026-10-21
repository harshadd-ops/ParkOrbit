import {
  AvailabilityResult,
  BlockedPeriod,
  Booking,
  ParkingListing,
  VehicleType,
} from "./types";

export function intervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a0 = new Date(startA).getTime();
  const a1 = new Date(endA).getTime();
  const b0 = new Date(startB).getTime();
  const b1 = new Date(endB).getTime();
  return a0 < b1 && a1 > b0;
}

function parseHourMinute(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function checkListingAvailability(
  listing: ParkingListing,
  startTimeIso: string,
  endTimeIso: string,
  existingBookings: Booking[],
  blockedPeriods: BlockedPeriod[],
  vehicleType?: VehicleType
): AvailabilityResult {
  const startDate = new Date(startTimeIso);
  const endDate = new Date(endTimeIso);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return {
      available: false,
      reason: "Invalid arrival or departure time format.",
    };
  }

  if (endDate.getTime() <= startDate.getTime()) {
    return {
      available: false,
      reason: "Departure time must be after arrival time.",
    };
  }

  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
  if (durationMinutes < 30) {
    return {
      available: false,
      reason: "Minimum booking duration is 30 minutes.",
    };
  }

  if (listing.status !== "published") {
    return {
      available: false,
      reason: `Listing is currently ${listing.status} and not accepting new reservations.`,
    };
  }

  if (vehicleType && !listing.vehicleTypes.includes(vehicleType)) {
    return {
      available: false,
      reason: `This space does not support ${vehicleType.replace("_", "-")} vehicles.`,
    };
  }

  // Check day of week availability
  if (
    listing.availableDays &&
    listing.availableDays.length > 0 &&
    !listing.availableDays.includes(startDate.getDay())
  ) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      available: false,
      reason: `Space is closed on ${dayNames[startDate.getDay()]}.`,
    };
  }

  // Check opening hours if not 24 hours and booking is within a single day
  if (!listing.openingHours.is24Hours) {
    const openMins = parseHourMinute(listing.openingHours.open);
    const closeMins = parseHourMinute(listing.openingHours.close);
    const startMins = startDate.getHours() * 60 + startDate.getMinutes();
    const endMins = endDate.getHours() * 60 + endDate.getMinutes();
    const sameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate();

    if (
      startMins < openMins ||
      (sameDay && endMins > closeMins && closeMins > openMins)
    ) {
      return {
        available: false,
        reason: `Space operates between ${listing.openingHours.open} and ${listing.openingHours.close}.`,
      };
    }
  }

  // Check host blocked periods
  const listingBlocks = blockedPeriods.filter(
    (b) => b.listingId === listing.id
  );
  for (const block of listingBlocks) {
    if (intervalsOverlap(startTimeIso, endTimeIso, block.startTime, block.endTime)) {
      return {
        available: false,
        reason: `Unavailable during host blocked period (${block.reason || "Host reserved"}).`,
        conflictingBlockReason: block.reason,
      };
    }
  }

  // Check confirmed / checked-in bookings for overlap
  const activeBookings = existingBookings.filter(
    (b) =>
      b.listingId === listing.id &&
      (b.status === "confirmed" || b.status === "checked_in")
  );
  for (const booking of activeBookings) {
    if (
      intervalsOverlap(
        startTimeIso,
        endTimeIso,
        booking.startTime,
        booking.endTime
      )
    ) {
      return {
        available: false,
        reason: `Space is already reserved for an overlapping period (Ref: ${booking.referenceCode}).`,
        conflictingBookingRef: booking.referenceCode,
      };
    }
  }

  return { available: true };
}
