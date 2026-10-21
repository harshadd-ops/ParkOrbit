"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  KeyRound,
  CheckCircle2,
  XCircle,
  Star,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Field, FieldLabel } from "@/components/ui/field";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives";
import { useAuth } from "@/context/AuthContext";
import { formatInr, formatDateTime } from "@/lib/utils";
import type { Booking } from "@/lib/types";
import { toast } from "sonner";

export default function DriverDashboardPage() {
  const { currentUser: user, updateProfile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Review Modal State
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Profile Edit State
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [profileBio, setProfileBio] = useState(user?.bio || "");
  const [profileUpi, setProfileUpi] = useState(user?.upiId || "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone);
      setProfileBio(user.bio);
      setProfileUpi(user.upiId || "");
    }
  }, [user]);

  const fetchDriverBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings?role=driver");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.driverBookings || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDriverBookings();
  }, [fetchDriverBookings, user?.id]);

  const handleCheckIn = async (booking: Booking) => {
    setActionId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkin",
          checkinPin: booking.checkinPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Check-in failed.");
        return;
      }
      toast.success(
        `Checked in with PIN ${booking.checkinPin}! Enjoy your parking session.`
      );
      await fetchDriverBookings();
    } finally {
      setActionId(null);
    }
  };

  const handleCompleteBooking = async (booking: Booking) => {
    setActionId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not complete session.");
        return;
      }
      toast.success(
        "Parking session marked as completed! You can now leave a verified review."
      );
      await fetchDriverBookings();
    } finally {
      setActionId(null);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    setActionId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reason: "Driver schedule changed via Driver Dashboard",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not cancel reservation.");
        return;
      }
      toast.success(
        `Booking cancelled. Simulated refund: ${formatInr(
          data.booking?.refundAmountInr || 0
        )} (${data.refundExplanation || "Policy applied"})`
      );
      await fetchDriverBookings();
    } finally {
      setActionId(null);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: reviewBooking.id,
          rating,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not submit review.");
        return;
      }
      toast.success("Thank you! Your verified review has been published.");
      setReviewBooking(null);
      setComment("");
      await fetchDriverBookings();
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        name: profileName,
        phone: profilePhone,
        bio: profileBio,
        upiId: profileUpi,
      });
      toast.success("Driver profile updated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const activeBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "checked_in"
  );
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

  const totalSpent = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.totalDriverPaidInr, 0);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mc-eyebrow mb-2">
            <span className="mc-eyebrow-dot" />
            <span>DRIVER COMMAND CENTER</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] text-[#141413]">
            Your Parking Reservations & Passes
          </h1>
          <p className="text-base text-[#595550] mt-1">
            Inspect check-in PINs, view gate access instructions, manage
            cancellations, or review completed trips.
          </p>
        </div>

        <Link href="/#discover">
          <Button variant="default">
            Find Another Parking Space
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#FCFBFA] rounded-[24px] p-6 border border-black/8 shadow-mc-card">
          <div className="text-xs font-bold uppercase tracking-wider text-[#595550]">
            Active & Upcoming Passes
          </div>
          <div className="text-4xl font-bold text-[#141413] mt-2">
            {activeBookings.length}
          </div>
          <div className="text-xs text-[#1E7E48] font-medium mt-1">
            Ready for 4-digit PIN check-in
          </div>
        </div>

        <div className="bg-[#FCFBFA] rounded-[24px] p-6 border border-black/8 shadow-mc-card">
          <div className="text-xs font-bold uppercase tracking-wider text-[#595550]">
            Completed Parking Sessions
          </div>
          <div className="text-4xl font-bold text-[#141413] mt-2">
            {completedBookings.length}
          </div>
          <div className="text-xs text-[#595550] mt-1">
            Eligible for verified host reviews
          </div>
        </div>

        <div className="bg-[#FCFBFA] rounded-[24px] p-6 border border-black/8 shadow-mc-card">
          <div className="text-xs font-bold uppercase tracking-wider text-[#595550]">
            Total Simulated Bookings Value
          </div>
          <div className="text-4xl font-bold text-[#141413] mt-2">
            {formatInr(totalSpent)}
          </div>
          <div className="text-xs text-[#CF4500] font-medium mt-1">
            Sandbox test mode — no real charges
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming & Active ({activeBookings.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelledBookings.length})
          </TabsTrigger>
          <TabsTrigger value="profile">Profile & Settings</TabsTrigger>
        </TabsList>

        {/* UPCOMING & ACTIVE TAB */}
        <TabsContent value="upcoming" className="space-y-5">
          {loading ? (
            <div className="h-48 rounded-[24px] bg-[#FCFBFA] animate-pulse border border-black/8" />
          ) : activeBookings.length === 0 ? (
            <div className="bg-[#FCFBFA] rounded-[28px] p-12 text-center border border-black/8 space-y-4">
              <h3 className="text-2xl font-medium text-[#141413]">
                No upcoming reservations right now
              </h3>
              <p className="text-sm text-[#595550] max-w-md mx-auto">
                Explore nearby driveways, apartment podiums, and commercial lots
                to reserve your next spot.
              </p>
              <Link href="/#discover">
                <Button variant="default">Browse Parking Spaces</Button>
              </Link>
            </div>
          ) : (
            activeBookings.map((booking) => (
              <div
                key={booking.id}
                data-testid={`driver-booking-card-${booking.id}`}
                className="bg-[#FCFBFA] rounded-[28px] p-6 sm:p-7 border border-black/10 shadow-mc-card flex flex-col lg:flex-row gap-6 justify-between"
              >
                <div className="flex flex-col sm:flex-row gap-5 flex-1">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#E8E2DA] shrink-0">
                    <img
                      src={booking.listingPhotoUrl}
                      alt={booking.listingTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          booking.status === "checked_in"
                            ? "signal"
                            : "default"
                        }
                      >
                        {booking.status === "checked_in"
                          ? "Checked In • Active"
                          : "Confirmed Reservation"}
                      </Badge>
                      <span className="text-xs font-bold text-[#141413] bg-[#F3F0EE] px-3 py-1 rounded-pill">
                        Ref: {booking.referenceCode}
                      </span>
                      <span className="text-xs font-bold text-[#CF4500] bg-[#CF4500]/10 px-3 py-1 rounded-pill">
                        Check-In PIN: {booking.checkinPin}
                      </span>
                    </div>

                    <Link
                      href={`/listings/${booking.listingId}`}
                      className="text-xl font-medium text-[#141413] hover:text-[#CF4500] block"
                    >
                      {booking.listingTitle}
                    </Link>

                    <p className="text-xs text-[#595550] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#CF4500]" />
                      {booking.listingAddress}, {booking.listingCity}
                    </p>

                    <div className="flex flex-wrap gap-4 text-xs text-[#141413] pt-1">
                      <span>
                        <strong>Arrival:</strong>{" "}
                        {formatDateTime(booking.startTime)}
                      </span>
                      <span>
                        <strong>Departure:</strong>{" "}
                        {formatDateTime(booking.endTime)}
                      </span>
                      <span>
                        <strong>Vehicle:</strong> {booking.vehiclePlate} (
                        {booking.vehicleType})
                      </span>
                    </div>

                    {/* Access instructions box */}
                    <div className="mt-3 p-3.5 rounded-2xl bg-[#F3F0EE] border border-black/8 text-xs text-[#141413]">
                      <strong className="text-[#CF4500] uppercase tracking-wider block mb-0.5">
                        Gate & Entry Instructions:
                      </strong>
                      {booking.accessInstructions}
                    </div>
                  </div>
                </div>

                {/* Right Actions Column */}
                <div className="flex flex-col justify-between lg:items-end gap-4 border-t lg:border-t-0 lg:border-l border-black/8 pt-4 lg:pt-0 lg:pl-6 min-w-[230px]">
                  <div className="lg:text-right">
                    <div className="text-xs text-[#595550]">
                      Simulated Amount Paid
                    </div>
                    <div className="text-2xl font-bold text-[#141413]">
                      {formatInr(booking.totalDriverPaidInr)}
                    </div>
                    <div className="text-[11px] text-[#736E68]">
                      Includes {formatInr(booking.driverServiceFeeInr)} service
                      fee
                    </div>
                  </div>

                  <div className="flex flex-wrap lg:flex-col gap-2 w-full">
                    {booking.status === "confirmed" && (
                      <Button
                        size="sm"
                        variant="default"
                        disabled={actionId === booking.id}
                        onClick={() => handleCheckIn(booking)}
                        className="w-full"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Check In (PIN {booking.checkinPin})
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actionId === booking.id}
                      onClick={() => handleCompleteBooking(booking)}
                      className="w-full"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Trip Completed
                    </Button>

                    {booking.status === "confirmed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={actionId === booking.id}
                        onClick={() => handleCancelBooking(booking)}
                        className="w-full text-[#B91C1C] hover:bg-[#B91C1C]/10"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel Reservation
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* COMPLETED TAB */}
        <TabsContent value="completed" className="space-y-5">
          {completedBookings.length === 0 ? (
            <div className="bg-[#FCFBFA] rounded-[28px] p-12 text-center border border-black/8">
              <p className="text-sm text-[#595550]">
                No completed parking trips yet.
              </p>
            </div>
          ) : (
            completedBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-[#FCFBFA] rounded-[28px] p-6 border border-black/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Completed</Badge>
                    <span className="text-xs font-semibold text-[#595550]">
                      Ref: {booking.referenceCode}
                    </span>
                  </div>
                  <Link
                    href={`/listings/${booking.listingId}`}
                    className="text-xl font-medium text-[#141413] hover:text-[#CF4500] block"
                  >
                    {booking.listingTitle}
                  </Link>
                  <p className="text-xs text-[#595550]">
                    {formatDateTime(booking.startTime)} →{" "}
                    {formatDateTime(booking.endTime)} · Paid{" "}
                    <strong>{formatInr(booking.totalDriverPaidInr)}</strong>
                  </p>
                </div>

                <div>
                  {booking.hasReview ? (
                    <Badge variant="outline" className="px-4 py-2">
                      <Star className="w-3.5 h-3.5 fill-[#CF4500] text-[#CF4500] mr-1" />
                      Verified Review Submitted
                    </Badge>
                  ) : (
                    <Button
                      variant="consent"
                      size="sm"
                      onClick={() => {
                        setReviewBooking(booking);
                        setRating(5);
                        setComment("");
                      }}
                    >
                      <Star className="w-3.5 h-3.5" />
                      Leave Verified Review
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* CANCELLED TAB */}
        <TabsContent value="cancelled" className="space-y-5">
          {cancelledBookings.length === 0 ? (
            <div className="bg-[#FCFBFA] rounded-[28px] p-12 text-center border border-black/8">
              <p className="text-sm text-[#595550]">
                You have no cancelled reservations.
              </p>
            </div>
          ) : (
            cancelledBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-[#FCFBFA] rounded-[28px] p-6 border border-black/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="signal">Cancelled</Badge>
                    <span className="text-xs font-semibold text-[#595550]">
                      Ref: {booking.referenceCode}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-[#141413]">
                    {booking.listingTitle}
                  </h3>
                  <p className="text-xs text-[#595550]">
                    Reason: {booking.cancellationReason || "Cancelled by user"}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-[#595550]">
                    Simulated Refund Issued
                  </div>
                  <div className="text-xl font-bold text-[#1E7E48]">
                    {formatInr(booking.refundAmountInr ?? 0)}
                  </div>
                  <div className="text-[11px] text-[#736E68]">
                    of {formatInr(booking.totalDriverPaidInr)} paid
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <form
            onSubmit={handleSaveProfile}
            className="bg-[#FCFBFA] rounded-[28px] p-6 sm:p-8 border border-black/8 max-w-2xl space-y-5"
          >
            <h3 className="text-2xl font-medium text-[#141413]">
              Driver & Account Profile
            </h3>
            <Field>
              <FieldLabel htmlFor="prof-name">Full Name</FieldLabel>
              <Input
                id="prof-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="prof-phone">Phone Number</FieldLabel>
              <Input
                id="prof-phone"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="prof-upi">
                Preferred UPI ID (for Refunds & Host Payouts)
              </FieldLabel>
              <Input
                id="prof-upi"
                value={profileUpi}
                onChange={(e) => setProfileUpi(e.target.value)}
                placeholder="name@okhdfcbank"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="prof-bio">Bio</FieldLabel>
              <Textarea
                id="prof-bio"
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="default" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Profile Changes"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Review Submission Modal */}
      <Dialog
        open={Boolean(reviewBooking)}
        onOpenChange={(open) => !open && setReviewBooking(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Parking Experience</DialogTitle>
            <DialogDescription>
              Reviewing <strong>{reviewBooking?.listingTitle}</strong> (Booking{" "}
              {reviewBooking?.referenceCode})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReview} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-2">
                Star Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border transition-all ${
                      rating >= star
                        ? "bg-[#CF4500] text-white border-[#CF4500]"
                        : "bg-[#F3F0EE] text-[#595550] border-black/10"
                    }`}
                  >
                    {star}★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="review-comment"
                className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1"
              >
                Your Review
              </label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Was the space easy to find? Did your vehicle fit comfortably? How was gate check-in?"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReviewBooking(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={submittingReview}
              >
                {submittingReview ? "Publishing..." : "Publish Verified Review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
