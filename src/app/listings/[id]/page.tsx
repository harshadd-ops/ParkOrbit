"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MapPin,
  Star,
  ShieldCheck,
  Car,
  CheckCircle2,
  AlertTriangle,
  Flag,
  ArrowLeft,
  KeyRound,
  CreditCard,
  Smartphone,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatInr, formatDateTime } from "@/lib/utils";
import type {
  ParkingListing,
  BlockedPeriod,
  Review,
  Booking,
  VehicleType,
  PlatformConfig,
  ModerationReport,
} from "@/lib/types";
import { toast } from "sonner";

const VEHICLE_LABELS: Record<VehicleType, string> = {
  two_wheeler: "Two-Wheeler / Bike",
  hatchback: "Compact / Hatchback",
  sedan: "Sedan",
  suv: "SUV / Crossover",
  ev: "EV Car (Charging)",
};

const POLICY_DESCRIPTIONS: Record<
  string,
  { title: string; detail: string }
> = {
  flexible: {
    title: "Flexible Cancellation",
    detail:
      "100% refund up to 2 hours before start time; 50% refund within 2 hours of start.",
  },
  moderate: {
    title: "Moderate Cancellation",
    detail:
      "100% refund up to 24 hours before start time; 50% refund up to 4 hours before start.",
  },
  strict: {
    title: "Strict Cancellation",
    detail:
      "100% refund up to 48 hours before start time; 50% refund up to 24 hours before start.",
  },
};

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const { currentUser: user } = useAuth();

  const [listing, setListing] = useState<ParkingListing | null>(null);
  const [blocks, setBlocks] = useState<BlockedPeriod[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeBookings, setActiveBookings] = useState<
    Array<{
      id: string;
      referenceCode: string;
      startTime: string;
      endTime: string;
      status: Booking["status"];
    }>
  >([]);
  const [config, setConfig] = useState<PlatformConfig>({
    commissionRatePercent: 12,
    driverServiceFeePercent: 5,
    featuredListingMonthlyInr: 499,
    proHostSubscriptionInr: 1499,
    paymentMode: "simulated_test",
    payoutMode: "estimated_pending",
  });
  const [loading, setLoading] = useState(true);

  // Default booking inputs from query string or tomorrow 10:00 AM
  const initialDate = useMemo(() => {
    const qDate = searchParams.get("date");
    if (qDate) return qDate;
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    return tomorrow.toISOString().slice(0, 10);
  }, [searchParams]);

  const initialArrival = searchParams.get("arrival") || "10:00";
  const initialDuration = Number(searchParams.get("duration") || "3");

  const [date, setDate] = useState(initialDate);
  const [arrivalTime, setArrivalTime] = useState(initialArrival);
  const [durationHours, setDurationHours] = useState(initialDuration);
  const [vehicleType, setVehicleType] = useState<VehicleType>("sedan");
  const [vehiclePlate, setVehiclePlate] = useState("MH-12-PQ-4821");
  const [paymentMethod, setPaymentMethod] = useState<
    "upi_simulated" | "card_simulated"
  >("upi_simulated");
  const [upiId, setUpiId] = useState("driver@okicici");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(
    null
  );

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<
    ModerationReport["reasonCategory"]
  >("inaccurate_location");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  const fetchListingDetail = async () => {
    setLoading(true);
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
      setActiveBookings(data.reservedSlots || []);
      if (data.config) {
        setConfig(data.config);
      }
      if (data.listing?.vehicleTypes?.length > 0) {
        setVehicleType(data.listing.vehicleTypes[0]);
      }
    } catch {
      toast.error("Failed to load parking space details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListingDetail();
  }, [id]);

  const { startTimeIso, endTimeIso } = useMemo(() => {
    try {
      const start = new Date(`${date}T${arrivalTime}:00`);
      if (isNaN(start.getTime())) {
        const fallback = new Date(Date.now() + 24 * 3600 * 1000);
        return {
          startTimeIso: fallback.toISOString(),
          endTimeIso: new Date(
            fallback.getTime() + durationHours * 3600 * 1000
          ).toISOString(),
        };
      }
      const end = new Date(start.getTime() + durationHours * 3600 * 1000);
      return {
        startTimeIso: start.toISOString(),
        endTimeIso: end.toISOString(),
      };
    } catch {
      const fallback = new Date(Date.now() + 24 * 3600 * 1000);
      return {
        startTimeIso: fallback.toISOString(),
        endTimeIso: new Date(
          fallback.getTime() + durationHours * 3600 * 1000
        ).toISOString(),
      };
    }
  }, [date, arrivalTime, durationHours]);

  // Live availability check
  const availabilityCheck = useMemo(() => {
    if (!listing) return { available: false, reason: "Loading..." };
    const mappedBookings: Booking[] = activeBookings.map((b) => ({
      id: b.id,
      referenceCode: b.referenceCode || "PKO-RESERVED",
      checkinPin: "0000",
      listingId: listing.id,
      listingTitle: listing.title,
      listingAddress: listing.address,
      listingLocality: listing.locality,
      listingCity: listing.city,
      listingPhotoUrl: listing.photos[0]?.url || "",
      listingSpaceType: listing.spaceType,
      cancellationPolicy: listing.cancellationPolicy,
      accessInstructions: "",
      driverId: "",
      driverName: "",
      driverEmail: "",
      driverPhone: "",
      hostId: listing.hostId,
      hostName: listing.hostName,
      vehicleType: "sedan",
      vehiclePlate: "",
      startTime: b.startTime,
      endTime: b.endTime,
      durationHours: 1,
      pricingMode: "hourly",
      baseSubtotalInr: 0,
      platformCommissionPercent: 12,
      driverServiceFeePercent: 5,
      driverServiceFeeInr: 0,
      platformHostCommissionInr: 0,
      totalDriverPaidInr: 0,
      netHostEarningsInr: 0,
      status: b.status,
      refundAmountInr: 0,
      refundStatus: "none",
      payoutStatus: "pending_settlement",
      paymentMethod: "upi_simulated",
      paymentReference: "",
      hasReview: false,
      isDemo: true,
      createdAt: "",
    }));

    return checkListingAvailability(
      listing,
      startTimeIso,
      endTimeIso,
      mappedBookings,
      blocks,
      vehicleType
    );
  }, [listing, startTimeIso, endTimeIso, activeBookings, blocks, vehicleType]);

  // Live Price Breakdown
  const priceBreakdown = useMemo(() => {
    if (!listing) return null;
    return calculatePriceBreakdown(listing, startTimeIso, endTimeIso, config);
  }, [listing, startTimeIso, endTimeIso, config]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    if (!user) {
      toast.error("Please sign in from the top navigation bar to reserve.");
      return;
    }
    if (!vehiclePlate.trim() || vehiclePlate.trim().length < 4) {
      toast.error("Please enter a valid vehicle registration plate.");
      return;
    }
    if (!availabilityCheck.available) {
      toast.error(availabilityCheck.reason || "Time slot is not available.");
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
            paymentMethod === "upi_simulated"
              ? upiId
              : "RuPay / Visa Sandbox •••• 4242",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not complete reservation.");
        return;
      }
      setConfirmedBooking(data.booking);
      toast.success(
        `Reservation confirmed! Reference: ${data.booking.referenceCode}`
      );
      await fetchListingDetail();
    } catch {
      toast.error("Network error while creating reservation.");
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
        toast.error(data.error || "Failed to submit report.");
        return;
      }
      toast.success(
        "Report submitted to ParkOrbit Trust & Safety moderation queue."
      );
      setReportOpen(false);
      setReportDetails("");
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12">
        <div className="h-96 rounded-stadium bg-[#FCFBFA] animate-pulse border border-black/8" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-20 text-center space-y-4">
        <h1 className="text-3xl font-medium text-[#141413]">
          Parking Listing Not Found
        </h1>
        <p className="text-[#595550]">
          The parking space you are looking for may have been removed or paused.
        </p>
        <Link href="/">
          <Button variant="default">Back to Discovery</Button>
        </Link>
      </div>
    );
  }

  const policy =
    POLICY_DESCRIPTIONS[listing.cancellationPolicy] ||
    POLICY_DESCRIPTIONS.flexible;

  const primaryPhoto =
    listing.photos[0]?.url ||
    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1000&q=80";
  const secondaryPhoto = listing.photos[1]?.url || primaryPhoto;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-10">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/#discover"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#595550] hover:text-[#141413] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Parking Discovery
        </Link>

        <div className="flex items-center gap-3">
          {user && user.id === listing.hostId && (
            <Link href={`/host/listings/${listing.id}/edit`}>
              <Button variant="secondary" size="sm">
                Edit Your Listing
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportOpen(true)}
            className="text-[#736E68] hover:text-[#B91C1C]"
          >
            <Flag className="w-3.5 h-3.5 mr-1" />
            Report Listing
          </Button>
        </div>
      </div>

      {/* Header & Stadium Photo Showcase */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="mc-eyebrow">
                <span className="mc-eyebrow-dot" />
                <span>{listing.spaceType.replace("_", " ").toUpperCase()}</span>
              </div>
              {listing.isDemo && (
                <Badge variant="demo">Demo Marketplace Space</Badge>
              )}
              {listing.isFeatured && (
                <Badge variant="signal">Featured Space</Badge>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-[-0.02em] text-[#141413]">
              {listing.title}
            </h1>

            <p className="text-sm sm:text-base text-[#595550] flex flex-wrap items-center gap-2">
              <MapPin className="w-4 h-4 text-[#CF4500]" />
              <span>
                {listing.address}, {listing.locality}, {listing.city}
              </span>
              <span className="text-[#141413] font-semibold">
                • Near {listing.landmark}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#FCFBFA] px-5 py-3 rounded-2xl border border-black/8 shadow-sm">
            <Star className="w-5 h-5 fill-[#CF4500] text-[#CF4500]" />
            <div>
              <div className="text-lg font-bold text-[#141413]">
                {listing.ratingAvg.toFixed(2)}{" "}
                <span className="text-xs font-normal text-[#595550]">
                  ({listing.reviewCount} reviews)
                </span>
              </div>
              <div className="text-xs text-[#1E7E48] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {listing.hostVerified ? "Verified Host" : "Community Host"}
              </div>
            </div>
          </div>
        </div>

        {/* Stadium & Circular Portrait Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 h-[340px] sm:h-[420px] rounded-stadium overflow-hidden border border-black/10 relative shadow-mc-card">
            <img
              src={primaryPhoto}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-[#141413]/85 backdrop-blur-md text-[#F3F0EE] px-4 py-2 rounded-pill text-xs font-medium">
              Coordinates: {listing.latitude.toFixed(4)}° N,{" "}
              {listing.longitude.toFixed(4)}° E
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-center bg-[#FCFBFA] rounded-stadium p-6 border border-black/8 h-full min-h-[340px] space-y-4">
            <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-[#E8E2DA] shadow-md">
              <img
                src={secondaryPhoto}
                alt={`${listing.title} secondary angle`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#CF4500]">
                Clearance & Dimensions
              </div>
              <div className="text-lg font-bold text-[#141413]">
                {listing.dimensions.lengthFt} ft (L) ×{" "}
                {listing.dimensions.widthFt} ft (W)
                {listing.dimensions.heightClearanceFt
                  ? ` × ${listing.dimensions.heightClearanceFt} ft (H)`
                  : " · Open Sky"}
              </div>
              <p className="text-xs text-[#595550]">
                Operating hours:{" "}
                {listing.openingHours.is24Hours
                  ? "Open 24 Hours"
                  : `${listing.openingHours.open} – ${listing.openingHours.close}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main 12-Col Split: Left 7 Cols Details & Availability, Right 5 Cols Booking & Price Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-7 space-y-8">
          {/* About this space */}
          <div className="bg-[#FCFBFA] rounded-[28px] p-6 sm:p-8 border border-black/8 space-y-4">
            <h2 className="text-2xl font-medium text-[#141413]">
              About this parking space
            </h2>
            <p className="text-base text-[#595550] leading-relaxed">
              {listing.description}
            </p>

            {/* Supported Vehicles */}
            <div className="pt-4 border-t border-black/8">
              <div className="text-xs font-bold uppercase tracking-wider text-[#595550] mb-3">
                Compatible Vehicles
              </div>
              <div className="flex flex-wrap gap-2.5">
                {listing.vehicleTypes.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#F3F0EE] text-xs font-semibold text-[#141413]"
                  >
                    <Car className="w-4 h-4 text-[#CF4500]" />
                    {VEHICLE_LABELS[v]}
                  </span>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="pt-4 border-t border-black/8">
              <div className="text-xs font-bold uppercase tracking-wider text-[#595550] mb-3">
                Included Amenities & Security
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {listing.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2.5 text-sm text-[#141413]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#1E7E48] shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rules, Cancellation Policy & Host Info */}
          <div className="bg-[#FCFBFA] rounded-[28px] p-6 sm:p-8 border border-black/8 space-y-6">
            <div className="flex items-center justify-between border-b border-black/8 pb-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#CF4500]">
                  Hosted By
                </div>
                <h3 className="text-xl font-medium text-[#141413] mt-0.5">
                  {listing.hostName}
                </h3>
                <p className="text-xs text-[#595550] mt-0.5">
                  Minimum advance notice: {listing.minNoticeMinutes} mins · Instant Booking enabled
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#141413] text-[#F3F0EE] flex items-center justify-center font-bold text-lg">
                {listing.hostName.slice(0, 2).toUpperCase()}
              </div>
            </div>

            {/* Parking Rules */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#141413] mb-2.5">
                Parking Rules & Restrictions
              </h4>
              <ul className="space-y-2">
                {listing.parkingRules.map((rule, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-[#595550] flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CF4500] mt-2 shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cancellation Policy */}
            <div className="p-4 rounded-2xl bg-[#F3F0EE] border border-black/8">
              <div className="text-sm font-bold text-[#141413]">
                {policy.title}
              </div>
              <p className="text-xs text-[#595550] mt-1">{policy.detail}</p>
            </div>

            {/* Privacy note on Access Instructions */}
            <div className="flex items-start gap-3 text-xs text-[#595550] bg-white p-4 rounded-2xl border border-black/8">
              <Lock className="w-4 h-4 text-[#CF4500] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#141413]">
                  Protected Gate & Access Instructions:
                </strong>{" "}
                For host security, exact gate keypad codes, pillar numbers, and
                intercom instructions are only revealed after your booking is
                confirmed.
              </div>
            </div>
          </div>

          {/* Live Availability Schedule (Reserved & Blocked Windows) */}
          <div className="bg-[#FCFBFA] rounded-[28px] p-6 sm:p-8 border border-black/8 space-y-4">
            <h3 className="text-xl font-medium text-[#141413]">
              Live Space Schedule & Blocked Windows
            </h3>
            <p className="text-xs text-[#595550]">
              ParkOrbit prevents overlapping double-bookings automatically. Here
              are the currently reserved or host-blocked windows for this bay:
            </p>

            {activeBookings.length === 0 && blocks.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#1E7E48]/10 text-[#1E7E48] text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                No upcoming conflicts or blocked periods — open during standard
                operating hours.
              </div>
            ) : (
              <div className="space-y-2">
                {activeBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F3F0EE] text-xs"
                  >
                    <span className="font-semibold text-[#141413]">
                      Reserved Booking ({b.status})
                    </span>
                    <span className="text-[#595550]">
                      {formatDateTime(b.startTime)} →{" "}
                      {formatDateTime(b.endTime)}
                    </span>
                  </div>
                ))}
                {blocks.map((blk) => (
                  <div
                    key={blk.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#C85A00]/10 text-xs"
                  >
                    <span className="font-semibold text-[#C85A00]">
                      Host Blocked: {blk.reason}
                    </span>
                    <span className="text-[#595550]">
                      {formatDateTime(blk.startTime)} →{" "}
                      {formatDateTime(blk.endTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Driver Reviews */}
          <div className="bg-[#FCFBFA] rounded-[28px] p-6 sm:p-8 border border-black/8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-[#141413]">
                Verified Driver Reviews ({reviews.length})
              </h3>
              <div className="flex items-center gap-1 text-sm font-bold">
                <Star className="w-4 h-4 fill-[#CF4500] text-[#CF4500]" />
                {listing.ratingAvg.toFixed(2)}
              </div>
            </div>

            {reviews.length === 0 ? (
              <p className="text-sm text-[#595550]">
                No driver reviews yet for this space. Complete a booking to
                leave the first verified review!
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-[#F3F0EE] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#141413]">
                        {rev.driverName}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-[#CF4500]">
                        <Star className="w-3.5 h-3.5 fill-[#CF4500]" />
                        {rev.rating}.0
                      </span>
                    </div>
                    <p className="text-sm text-[#595550]">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RESERVATION & TRANSPARENT PRICE BREAKDOWN */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          {confirmedBooking ? (
            /* CONFIRMED BOOKING PASS */
            <div className="bg-[#141413] text-[#F3F0EE] rounded-[32px] p-7 sm:p-8 shadow-mc-floating border border-white/15 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-[#1E7E48] text-white text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                Reservation Confirmed
              </div>

              <div>
                <h2 className="text-2xl font-medium">
                  Your parking spot is reserved!
                </h2>
                <p className="text-xs text-[#A39E98] mt-1">
                  Present your Booking Reference or 4-Digit Check-in PIN upon
                  arrival.
                </p>
              </div>

              {/* Booking Reference & 4-Digit Check-in PIN */}
              <div className="grid grid-cols-2 gap-4 bg-white/10 p-4 rounded-2xl border border-white/15">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#A39E98]">
                    Booking Reference
                  </div>
                  <div
                    data-testid="confirmed-booking-reference"
                    className="text-lg font-bold text-white mt-0.5"
                  >
                    {confirmedBooking.referenceCode}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#A39E98]">
                    4-Digit Check-In PIN
                  </div>
                  <div
                    data-testid="confirmed-checkin-pin"
                    className="text-2xl font-bold text-[#F37338] tracking-widest mt-0.5"
                  >
                    {confirmedBooking.checkinPin}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#D0CBC5] border-t border-white/15 pt-4">
                <div className="flex justify-between">
                  <span>Arrival:</span>
                  <strong className="text-white">
                    {formatDateTime(confirmedBooking.startTime)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Departure:</span>
                  <strong className="text-white">
                    {formatDateTime(confirmedBooking.endTime)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Vehicle Plate:</span>
                  <strong className="text-white">
                    {confirmedBooking.vehiclePlate}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Simulated Payment Paid:</span>
                  <strong className="text-white">
                    {formatInr(confirmedBooking.totalDriverPaidInr)} (Test Mode)
                  </strong>
                </div>
              </div>

              {/* Unlocked Access Instructions */}
              <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-[#F37338] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  Unlocked Host Access Instructions
                </div>
                <p className="text-xs text-[#F3F0EE] leading-relaxed">
                  {confirmedBooking.accessInstructions}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/dashboard/driver" className="flex-1">
                  <Button variant="consent" className="w-full">
                    Manage in Driver Trips
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmedBooking(null)}
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  Book Another Slot
                </Button>
              </div>
            </div>
          ) : (
            /* RESERVATION CHECKOUT CARD */
            <form
              onSubmit={handleConfirmBooking}
              className="bg-[#FCFBFA] rounded-[32px] p-6 sm:p-8 border border-black/10 shadow-mc-floating space-y-6"
            >
              {/* Top Rate Header */}
              <div className="flex items-baseline justify-between border-b border-black/8 pb-4">
                <div>
                  <span className="text-3xl font-bold text-[#141413]">
                    {formatInr(listing.hourlyRateInr)}
                  </span>
                  <span className="text-xs text-[#595550]"> / hour</span>
                </div>
                <div className="text-xs text-[#595550]">
                  Daily:{" "}
                  <strong className="text-[#141413]">
                    {formatInr(listing.dailyRateInr)}
                  </strong>
                  {listing.monthlyRateInr ? (
                    <>
                      {" "}
                      · Monthly:{" "}
                      <strong className="text-[#141413]">
                        {formatInr(listing.monthlyRateInr)}
                      </strong>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Date, Time & Duration Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="booking-date"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1"
                  >
                    Date
                  </label>
                  <Input
                    id="booking-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="booking-arrival"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1"
                  >
                    Arrival Time
                  </label>
                  <Input
                    id="booking-arrival"
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="booking-duration"
                  className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1"
                >
                  Parking Duration
                </label>
                <select
                  id="booking-duration"
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                >
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                  <option value={3}>3 Hours</option>
                  <option value={4}>4 Hours</option>
                  <option value={6}>6 Hours</option>
                  <option value={8}>Full Day (8 Hours — Daily Rate Cap)</option>
                  <option value={12}>Overnight (12 Hours)</option>
                  <option value={24}>24 Hours (1 Full Day)</option>
                  <option value={48}>48 Hours (2 Days)</option>
                </select>
              </div>

              {/* Live Availability Banner */}
              <div
                data-testid="availability-status-banner"
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 ${
                  availabilityCheck.available
                    ? "bg-[#1E7E48]/10 text-[#1E7E48]"
                    : "bg-[#B91C1C]/10 text-[#B91C1C]"
                }`}
              >
                {availabilityCheck.available ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      Slot is available for {formatDateTime(startTimeIso)} →{" "}
                      {formatDateTime(endTimeIso)}.
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>{availabilityCheck.reason}</div>
                  </>
                )}
              </div>

              {/* Vehicle Plate & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="booking-vehicle-type"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1"
                  >
                    Vehicle Type
                  </label>
                  <select
                    id="booking-vehicle-type"
                    value={vehicleType}
                    onChange={(e) =>
                      setVehicleType(e.target.value as VehicleType)
                    }
                    className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413]"
                  >
                    {listing.vehicleTypes.map((v) => (
                      <option key={v} value={v}>
                        {VEHICLE_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="booking-vehicle-plate"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1"
                  >
                    Registration Plate
                  </label>
                  <Input
                    id="booking-vehicle-plate"
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="KA-01-MJ-4821"
                    required
                  />
                </div>
              </div>

              {/* Transparent Price Breakdown */}
              {priceBreakdown && (
                <div className="bg-[#F3F0EE] rounded-2xl p-4 space-y-2.5 border border-black/8">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#141413]">
                    Transparent Price Breakdown
                  </div>
                  <div className="flex justify-between text-xs text-[#595550]">
                    <span>{priceBreakdown.explanation}</span>
                    <span className="font-semibold text-[#141413]">
                      {formatInr(priceBreakdown.baseSubtotalInr)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[#595550]">
                    <span>
                      ParkOrbit Driver Service Fee (
                      {priceBreakdown.driverServiceFeePercent}%)
                    </span>
                    <span className="font-semibold text-[#141413]">
                      {formatInr(priceBreakdown.driverServiceFeeInr)}
                    </span>
                  </div>
                  <div className="border-t border-black/10 pt-2 flex justify-between text-base font-bold text-[#141413]">
                    <span>Total Payable</span>
                    <span data-testid="booking-total-amount">
                      {formatInr(priceBreakdown.totalDriverPaidInr)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#736E68] flex justify-between pt-1">
                    <span>
                      Host Net Earnings (after{" "}
                      {priceBreakdown.platformCommissionPercent}% commission):
                    </span>
                    <span>{formatInr(priceBreakdown.netHostEarningsInr)}</span>
                  </div>
                </div>
              )}

              {/* Simulated Payment Selector (Honest Indian UPI / Card Sandbox) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#595550]">
                    Payment Method (Simulated Sandbox)
                  </span>
                  <Badge variant="orbit">Test Payment Mode</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi_simulated")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      paymentMethod === "upi_simulated"
                        ? "border-[#141413] bg-[#141413] text-[#F3F0EE]"
                        : "border-black/15 bg-white text-[#141413]"
                    }`}
                  >
                    <Smartphone className="w-4 h-4 shrink-0 text-[#CF4500]" />
                    <div>
                      <div className="text-xs font-bold">UPI Instant</div>
                      <div className="text-[10px] opacity-75">
                        GPay / PhonePe Test
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card_simulated")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      paymentMethod === "card_simulated"
                        ? "border-[#141413] bg-[#141413] text-[#F3F0EE]"
                        : "border-black/15 bg-white text-[#141413]"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 shrink-0 text-[#CF4500]" />
                    <div>
                      <div className="text-xs font-bold">Card Sandbox</div>
                      <div className="text-[10px] opacity-75">
                        RuPay / Visa Test
                      </div>
                    </div>
                  </button>
                </div>

                {paymentMethod === "upi_simulated" && (
                  <Input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="Enter Test UPI ID (e.g. name@okicici)"
                  />
                )}

                <p className="text-[11px] text-[#736E68] leading-snug bg-[#F3F0EE] p-2.5 rounded-xl">
                  <strong>Simulated Payment Notice:</strong> Live payment
                  gateway credentials are not configured in this environment.
                  Clicking confirm executes a simulated sandbox transaction — no
                  real money is collected.
                </p>
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full"
                disabled={!availabilityCheck.available || submitting}
              >
                {submitting
                  ? "Confirming Reservation..."
                  : `Reserve Spot · ${
                      priceBreakdown
                        ? formatInr(priceBreakdown.totalDriverPaidInr)
                        : ""
                    }`}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Report Listing Modal */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report This Parking Listing</DialogTitle>
            <DialogDescription>
              Flag inaccurate dimensions, blocked access, or suspicious host
              behavior for the ParkOrbit Trust & Safety team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReport} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1">
                Reason
              </label>
              <select
                value={reportReason}
                onChange={(e) =>
                  setReportReason(
                    e.target.value as ModerationReport["reasonCategory"]
                  )
                }
                className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413]"
              >
                <option value="inaccurate_location">
                  Inaccurate dimensions or misleading location/photos
                </option>
                <option value="access_issue">
                  Space was locked or inaccessible on arrival
                </option>
                <option value="suspicious_listing">
                  Suspicious listing or unauthorized cash demanded
                </option>
                <option value="safety_concern">
                  Safety or security concern
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1">
                Additional Details
              </label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe what happened so our moderation team can investigate..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReportOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="consent" disabled={reporting}>
                {reporting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
