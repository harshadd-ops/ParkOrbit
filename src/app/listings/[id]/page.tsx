"use client";

import React, { useState, useEffect, useMemo, use, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Clock,
  KeyRound,
  LockKeyhole,
  Ruler,
  ShieldCheck,
  Star,
  Umbrella,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives";
import { useAuth } from "@/context/AuthContext";
import { calculatePriceBreakdown } from "@/lib/pricing";
import { checkListingAvailability } from "@/lib/availability";
import {
  buildTimeWindow,
  cn,
  DURATION_OPTIONS,
  formatDateTime,
  formatInr,
  tomorrowDateString,
} from "@/lib/utils";
import { POLICY_LABELS, SPACE_TYPE_LABELS, VEHICLE_LABELS } from "@/lib/labels";
import type {
  ParkingListing,
  BlockedPeriod,
  Review,
  Booking,
  VehicleType,
  PlatformConfig,
  ModerationReport,
} from "@/lib/types";

type ReservedSlot = Pick<Booking, "id" | "referenceCode" | "startTime" | "endTime" | "status">;

const DEFAULT_CONFIG: PlatformConfig = {
  commissionRatePercent: 12,
  driverServiceFeePercent: 5,
  featuredListingMonthlyInr: 499,
  proHostSubscriptionInr: 1499,
  paymentMode: "simulated_test",
  payoutMode: "estimated_pending",
};

const labelCls = "block text-[13px] text-slate mb-1.5 pl-1";
const selectCls =
  "w-full h-11 rounded-pill border border-ink/35 bg-white px-5 text-[15px] text-ink focus:outline-none focus:border-ink";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const { currentUser: user, setAuthModalOpen } = useAuth();

  const [listing, setListing] = useState<ParkingListing | null>(null);
  const [blocks, setBlocks] = useState<BlockedPeriod[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reservedSlots, setReservedSlots] = useState<ReservedSlot[]>([]);
  const [config, setConfig] = useState<PlatformConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(searchParams.get("date") || tomorrowDateString());
  const [arrivalTime, setArrivalTime] = useState(searchParams.get("arrival") || "10:00");
  const [durationHours, setDurationHours] = useState(Number(searchParams.get("duration") || "3"));
  const [vehicleType, setVehicleType] = useState<VehicleType>("sedan");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"upi_simulated" | "card_simulated">("upi_simulated");
  const [upiId, setUpiId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] =
    useState<ModerationReport["reasonCategory"]>("inaccurate_location");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (user?.defaultVehiclePlate) setVehiclePlate((p) => p || user.defaultVehiclePlate!);
    if (user?.upiId) setUpiId((u) => u || user.upiId);
  }, [user]);

  const fetchListingDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) {
        setListing(null);
        return;
      }
      const data = await res.json();
      setListing(data.listing);
      setBlocks(data.blockedPeriods || []);
      setReviews(data.reviews || []);
      setReservedSlots(data.reservedSlots || []);
      if (data.config) setConfig(data.config);
      if (data.listing?.vehicleTypes?.length > 0) {
        setVehicleType((v) => (data.listing.vehicleTypes.includes(v) ? v : data.listing.vehicleTypes[0]));
      }
    } catch {
      toast.error("Couldn't load this space.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchListingDetail();
  }, [fetchListingDetail]);

  const { startTimeIso, endTimeIso } = useMemo(
    () => buildTimeWindow(date, arrivalTime, durationHours),
    [date, arrivalTime, durationHours]
  );

  // Same overlap rules the server enforces, run locally for instant feedback
  const availabilityCheck = useMemo(() => {
    if (!listing) return { available: false, reason: "Loading…" };
    const asBookings = reservedSlots.map(
      (b) => ({ ...b, listingId: listing.id }) as unknown as Booking
    );
    return checkListingAvailability(listing, startTimeIso, endTimeIso, asBookings, blocks, vehicleType);
  }, [listing, startTimeIso, endTimeIso, reservedSlots, blocks, vehicleType]);

  const priceBreakdown = useMemo(
    () => (listing ? calculatePriceBreakdown(listing, startTimeIso, endTimeIso, config) : null),
    [listing, startTimeIso, endTimeIso, config]
  );

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (vehiclePlate.trim().length < 4) {
      toast.error("Add your vehicle number plate.");
      return;
    }
    if (!availabilityCheck.available) {
      toast.error(availabilityCheck.reason || "That time isn't available.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          startTime: startTimeIso,
          endTime: endTimeIso,
          vehiclePlate: vehiclePlate.trim().toUpperCase(),
          vehicleType,
          paymentMethod,
          paymentMethodDetail:
            paymentMethod === "upi_simulated" ? upiId || "demo@upi" : "Test card •••• 4242",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't complete the booking.");
        return;
      }
      setConfirmedBooking(data.booking);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await fetchListingDetail();
    } catch {
      toast.error("Network error while booking.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "listing",
          targetId: listing.id,
          targetTitle: listing.title,
          reasonCategory: reportReason,
          description: reportDetails,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't send the report.");
        return;
      }
      toast.success("Thanks. Our trust team will review it.");
      setReportOpen(false);
      setReportDetails("");
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 md:px-8 py-14 space-y-6">
        <div className="h-10 w-2/3 rounded-pill bg-lifted animate-pulse" />
        <div className="h-[420px] rounded-stadium bg-lifted animate-pulse" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 md:px-8 py-32 text-center">
        <h1 className="text-[40px]">This space isn&apos;t available</h1>
        <p className="mt-3 text-slate">It may have been paused by its host.</p>
        <Link href="/find" className="inline-block mt-8">
          <Button>Back to the map</Button>
        </Link>
      </div>
    );
  }

  const policy = POLICY_LABELS[listing.cancellationPolicy] || POLICY_LABELS.flexible;
  const isOwnListing = user?.id === listing.hostId;
  const facts = [
    { icon: Umbrella, label: SPACE_TYPE_LABELS[listing.spaceType] },
    {
      icon: Clock,
      label: listing.openingHours.is24Hours
        ? "Open 24 hours"
        : `${listing.openingHours.open} – ${listing.openingHours.close}`,
    },
    {
      icon: Ruler,
      label: `${listing.dimensions.lengthFt} × ${listing.dimensions.widthFt} ft${
        listing.dimensions.heightClearanceFt ? `, ${listing.dimensions.heightClearanceFt} ft high` : ""
      }`,
    },
    { icon: Car, label: listing.vehicleTypes.map((v) => VEHICLE_LABELS[v]).join(", ") },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-5 md:px-8 pt-10 md:pt-14">
      <Link
        href="/find"
        className="inline-flex items-center gap-2 text-[15px] text-slate hover:text-ink transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to map
      </Link>

      <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[15px] text-slate">
            {listing.locality}, {listing.city}
          </div>
          <h1 className="mt-2 text-[34px] md:text-[48px] leading-[1.05] tracking-[-0.025em] max-w-3xl">
            {listing.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-4 fill-ink" />
              {listing.ratingAvg.toFixed(1)}
              <span className="text-slate">({listing.reviewCount} reviews)</span>
            </span>
            {listing.hostVerified && (
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4" />
                Verified host
              </span>
            )}
          </div>
        </div>
        {isOwnListing && (
          <Link href={`/host/listings/${listing.id}/edit`}>
            <Button variant="secondary">Edit your listing</Button>
          </Link>
        )}
      </div>

      <div className="mt-10 h-[300px] md:h-[460px] rounded-stadium overflow-hidden bg-lifted">
        <img src={listing.photos[0]?.url} alt={listing.title} className="size-full object-cover" />
      </div>

      <div className="mt-14 grid lg:grid-cols-12 gap-14 items-start">
        {/* Details */}
        <div className="lg:col-span-7 space-y-14">
          <section>
            <p className="text-[18px] leading-[1.6] text-granite">{listing.description}</p>
            <ul className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-6">
              {facts.map((f) => (
                <li key={f.label} className="flex items-center gap-4">
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-lifted shrink-0">
                    <f.icon className="size-5" strokeWidth={1.6} />
                  </span>
                  <span className="text-[16px]">{f.label}</span>
                </li>
              ))}
            </ul>
          </section>

          {listing.amenities.length > 0 && (
            <section className="border-t border-ink/10 pt-12">
              <h2 className="text-[24px]">What&apos;s included</h2>
              <ul className="mt-6 grid sm:grid-cols-2 gap-3">
                {listing.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-3 text-[16px]">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="border-t border-ink/10 pt-12 space-y-6">
            <div className="flex items-center gap-4">
              <div className="inline-flex size-14 items-center justify-center rounded-full bg-ink text-canvas text-[18px] font-medium">
                {listing.hostName.slice(0, 1)}
              </div>
              <div>
                <div className="text-[18px] font-medium">Hosted by {listing.hostName}</div>
                <div className="text-[14px] text-slate">{policy.title} · {policy.detail}</div>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-stadium bg-lifted p-6">
              <LockKeyhole className="size-5 shrink-0 mt-0.5" />
              <p className="text-[15px] text-granite">
                Gate codes and bay details are shared only after you book. You&apos;ll get a
                one-time PIN to show at arrival.
              </p>
            </div>
            {listing.parkingRules.length > 0 && (
              <ul className="space-y-2 text-[15px] text-granite">
                {listing.parkingRules.map((rule) => (
                  <li key={rule} className="flex gap-3">
                    <span className="mt-2 size-1.5 rounded-full bg-[#F37338] shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {reviews.length > 0 && (
            <section className="border-t border-ink/10 pt-12">
              <h2 className="text-[24px] flex items-center gap-2">
                <Star className="size-5 fill-ink" />
                {listing.ratingAvg.toFixed(1)} · {reviews.length} reviews
              </h2>
              <div className="mt-8 grid sm:grid-cols-2 gap-8">
                {reviews.slice(0, 4).map((rev) => (
                  <div key={rev.id}>
                    <div className="text-[16px] font-medium">{rev.driverName}</div>
                    <div className="text-[13px] text-slate">{"★".repeat(rev.rating)}</div>
                    <p className="mt-2 text-[15px] text-granite leading-[1.55]">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="text-[14px] text-slate underline underline-offset-4 hover:text-ink"
          >
            Report this listing
          </button>
        </div>

        {/* Booking card / pass */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          {confirmedBooking ? (
            <div className="rounded-stadium bg-ink text-canvas p-8 shadow-halo animate-in fade-in zoom-in-95 duration-500">
              <div className="inline-flex items-center gap-2 text-[14px] text-canvas/70">
                <CheckCircle2 className="size-4 text-[#F37338]" />
                You&apos;re booked
              </div>
              <div className="mt-8 text-[13px] uppercase tracking-[0.06em] font-bold text-canvas/50">
                Gate PIN
              </div>
              <div
                data-testid="confirmed-checkin-pin"
                className="mt-2 text-[64px] font-medium tracking-[0.25em] leading-none"
              >
                {confirmedBooking.checkinPin}
              </div>
              <p className="mt-3 text-[14px] text-canvas/60">
                Show this to the host when you arrive.
              </p>

              <dl className="mt-8 border-t border-white/15 pt-6 space-y-3 text-[15px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-canvas/60">Arrive</dt>
                  <dd>{formatDateTime(confirmedBooking.startTime)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-canvas/60">Leave by</dt>
                  <dd>{formatDateTime(confirmedBooking.endTime)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-canvas/60">Paid</dt>
                  <dd>{formatInr(confirmedBooking.totalDriverPaidInr)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-canvas/60">Booking</dt>
                  <dd data-testid="confirmed-booking-reference">{confirmedBooking.referenceCode}</dd>
                </div>
              </dl>

              <div className="mt-6 rounded-cta bg-white/10 p-5">
                <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.06em] text-[#F37338]">
                  <KeyRound className="size-4" />
                  How to get in
                </div>
                <p className="mt-2 text-[15px] leading-[1.5]">{confirmedBooking.accessInstructions}</p>
              </div>

              <Link href="/dashboard/driver" className="block mt-8">
                <Button variant="secondary" className="w-full bg-canvas border-canvas">
                  Go to my trips
                </Button>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleConfirmBooking}
              className="rounded-stadium bg-white p-7 md:p-8 shadow-halo space-y-5"
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[32px] font-medium tracking-[-0.02em]">
                    {formatInr(listing.hourlyRateInr)}
                  </span>
                  <span className="text-[15px] text-slate"> / hour</span>
                </div>
                <span className="text-[14px] text-slate">{formatInr(listing.dailyRateInr)} / day</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="booking-date" className={labelCls}>Date</label>
                  <Input
                    id="booking-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="px-4"
                  />
                </div>
                <div>
                  <label htmlFor="booking-arrival" className={labelCls}>Arrive</label>
                  <Input
                    id="booking-arrival"
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    required
                    className="px-4"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="booking-duration" className={labelCls}>For</label>
                <select
                  id="booking-duration"
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className={selectCls}
                >
                  {DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="booking-vehicle-type" className={labelCls}>Vehicle</label>
                  <select
                    id="booking-vehicle-type"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className={selectCls}
                  >
                    {listing.vehicleTypes.map((v) => (
                      <option key={v} value={v}>{VEHICLE_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="booking-vehicle-plate" className={labelCls}>Number plate</label>
                  <Input
                    id="booking-vehicle-plate"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="MH-12-AB-1234"
                    required
                    className="px-4 uppercase"
                  />
                </div>
              </div>

              <div
                data-testid="availability-status-banner"
                className={cn(
                  "flex items-center gap-2 text-[14px] px-1",
                  availabilityCheck.available ? "text-granite" : "text-signal"
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full shrink-0",
                    availabilityCheck.available ? "bg-[#1E7E48]" : "bg-signal"
                  )}
                />
                {availabilityCheck.available ? "Free at this time" : availabilityCheck.reason}
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-pill bg-canvas p-1">
                {(
                  [
                    ["upi_simulated", "UPI"],
                    ["card_simulated", "Card"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    aria-pressed={paymentMethod === value}
                    className={cn(
                      "rounded-pill py-2 text-[14px] font-medium transition-colors",
                      paymentMethod === value ? "bg-white shadow-nav" : "text-slate"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {paymentMethod === "upi_simulated" && (
                <Input
                  aria-label="UPI ID"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                />
              )}

              {priceBreakdown && (
                <div className="border-t border-ink/10 pt-5 space-y-2 text-[15px]">
                  <div className="flex justify-between text-slate">
                    <span>{priceBreakdown.explanation}</span>
                    <span>{formatInr(priceBreakdown.baseSubtotalInr)}</span>
                  </div>
                  <div className="flex justify-between text-slate">
                    <span>Service fee</span>
                    <span>{formatInr(priceBreakdown.driverServiceFeeInr)}</span>
                  </div>
                  <div className="flex justify-between text-[18px] font-medium pt-2">
                    <span>Total</span>
                    <span data-testid="booking-total-amount">
                      {formatInr(priceBreakdown.totalDriverPaidInr)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-pill"
                disabled={isOwnListing || !availabilityCheck.available || submitting}
              >
                {isOwnListing ? "This is your space" : submitting ? "Booking…" : user ? "Reserve" : "Sign in to reserve"}
              </Button>
              <p className="text-center text-[13px] text-slate">
                Demo mode: no real money is charged.
              </p>
            </form>
          )}
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this listing</DialogTitle>
            <DialogDescription>Our trust team reviews every report.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReport} className="space-y-4 mt-2">
            <select
              aria-label="Reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value as ModerationReport["reasonCategory"])}
              className={selectCls}
            >
              <option value="inaccurate_location">Wrong location or photos</option>
              <option value="access_issue">Couldn&apos;t get in</option>
              <option value="suspicious_listing">Asked for cash / suspicious</option>
              <option value="safety_concern">Safety concern</option>
            </select>
            <Textarea
              aria-label="What happened?"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="What happened?"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={reporting}>
                {reporting ? "Sending…" : "Send report"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
