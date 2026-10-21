import {
  Booking,
  CancellationPolicy,
  ParkingListing,
  PlatformConfig,
  PriceBreakdown,
} from "./types";

export function calculatePriceBreakdown(
  listing: Pick<ParkingListing, "hourlyRateInr" | "dailyRateInr">,
  startTimeIso: string,
  endTimeIso: string,
  config: Pick<PlatformConfig, "commissionRatePercent" | "driverServiceFeePercent">
): PriceBreakdown {
  const startMs = new Date(startTimeIso).getTime();
  const endMs = new Date(endTimeIso).getTime();
  const rawHours = (endMs - startMs) / (1000 * 60 * 60);
  const durationHours = Math.max(1, Math.ceil(rawHours));

  const pureHourlyTotal = durationHours * listing.hourlyRateInr;
  const fullDays = Math.floor(durationHours / 24);
  const remHours = durationHours % 24;
  const remHoursCappedCost = Math.min(
    remHours * listing.hourlyRateInr,
    listing.dailyRateInr
  );
  const hybridTotal =
    fullDays > 0
      ? fullDays * listing.dailyRateInr + remHoursCappedCost
      : Math.min(pureHourlyTotal, listing.dailyRateInr);

  let baseSubtotalInr = pureHourlyTotal;
  let pricingMode: "hourly" | "daily" | "hybrid" = "hourly";
  let explanation = `${durationHours} hr × ₹${listing.hourlyRateInr}/hr`;

  if (hybridTotal < pureHourlyTotal) {
    baseSubtotalInr = hybridTotal;
    if (fullDays === 0 || remHours === 0) {
      pricingMode = "daily";
      const billedDays = Math.max(1, fullDays + (remHours > 0 ? 1 : 0));
      explanation = `${billedDays} day${billedDays > 1 ? "s" : ""} cap × ₹${listing.dailyRateInr}/day (saves ₹${pureHourlyTotal - hybridTotal})`;
    } else {
      pricingMode = "hybrid";
      explanation = `${fullDays}d × ₹${listing.dailyRateInr} + ${remHours}h × ₹${listing.hourlyRateInr}`;
    }
  }

  const driverServiceFeeInr = Math.round(
    baseSubtotalInr * (config.driverServiceFeePercent / 100)
  );
  const totalDriverPaidInr = baseSubtotalInr + driverServiceFeeInr;
  const platformHostCommissionInr = Math.round(
    baseSubtotalInr * (config.commissionRatePercent / 100)
  );
  const netHostEarningsInr = Math.max(
    0,
    baseSubtotalInr - platformHostCommissionInr
  );

  return {
    durationHours,
    daysCount: fullDays,
    remainingHours: remHours,
    pricingMode,
    baseSubtotalInr,
    driverServiceFeePercent: config.driverServiceFeePercent,
    driverServiceFeeInr,
    totalDriverPaidInr,
    platformCommissionPercent: config.commissionRatePercent,
    platformHostCommissionInr,
    netHostEarningsInr,
    explanation,
  };
}

export function calculateCancellationRefund(
  booking: Pick<Booking, "startTime" | "totalDriverPaidInr" | "baseSubtotalInr">,
  policy: CancellationPolicy,
  cancelTimeIso: string = new Date().toISOString()
): {
  refundAmountInr: number;
  refundPercent: number;
  policyExplanation: string;
} {
  const startMs = new Date(booking.startTime).getTime();
  const cancelMs = new Date(cancelTimeIso).getTime();
  const hoursBeforeStart = (startMs - cancelMs) / (1000 * 60 * 60);

  if (policy === "flexible") {
    if (hoursBeforeStart >= 2) {
      return {
        refundAmountInr: booking.totalDriverPaidInr,
        refundPercent: 100,
        policyExplanation:
          "Flexible Policy: Cancelled at least 2 hours before arrival (100% full simulated refund).",
      };
    }
    const half = Math.round(booking.totalDriverPaidInr * 0.5);
    return {
      refundAmountInr: half,
      refundPercent: 50,
      policyExplanation:
        "Flexible Policy: Cancelled within 2 hours of arrival (50% partial simulated refund).",
    };
  }

  if (policy === "moderate") {
    if (hoursBeforeStart >= 24) {
      return {
        refundAmountInr: booking.totalDriverPaidInr,
        refundPercent: 100,
        policyExplanation:
          "Moderate Policy: Cancelled 24+ hours before arrival (100% full simulated refund).",
      };
    }
    if (hoursBeforeStart >= 2) {
      const half = Math.round(booking.totalDriverPaidInr * 0.5);
      return {
        refundAmountInr: half,
        refundPercent: 50,
        policyExplanation:
          "Moderate Policy: Cancelled between 2 and 24 hours before arrival (50% partial simulated refund).",
      };
    }
    return {
      refundAmountInr: 0,
      refundPercent: 0,
      policyExplanation:
        "Moderate Policy: Cancelled less than 2 hours before arrival (non-refundable).",
    };
  }

  // Strict policy
  if (hoursBeforeStart >= 48) {
    const half = Math.round(booking.totalDriverPaidInr * 0.5);
    return {
      refundAmountInr: half,
      refundPercent: 50,
      policyExplanation:
        "Strict Policy: Cancelled 48+ hours before arrival (50% simulated refund).",
    };
  }
  return {
    refundAmountInr: 0,
    refundPercent: 0,
    policyExplanation:
      "Strict Policy: Cancelled within 48 hours of arrival (non-refundable).",
  };
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
