"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives";
import { Reveal } from "@/components/motion/Reveal";
import { useAuth } from "@/context/AuthContext";
import { cn, formatDateTime, formatInr, formatShortDate } from "@/lib/utils";
import type { Booking } from "@/lib/types";

const STATUS_LABEL: Record<Booking["status"], string> = {
  confirmed: "Upcoming",
  checked_in: "Parked now",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function DriverDashboardPage() {
  const { currentUser: user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchDriverBookings = useCallback(async () => {
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

  const patchBooking = async (booking: Booking, body: Record<string, unknown>, success: string) => {
    setActionId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong.");
        return;
      }
      toast.success(
        body.action === "cancel"
          ? `Cancelled. Refund: ${formatInr(data.booking?.refundAmountInr || 0)}`
          : success
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
        body: JSON.stringify({ bookingId: reviewBooking.id, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't post your review.");
        return;
      }
      toast.success("Thanks for the review!");
      setReviewBooking(null);
      setComment("");
      await fetchDriverBookings();
    } finally {
      setSubmittingReview(false);
    }
  };

  const active = bookings
    .filter((b) => b.status === "confirmed" || b.status === "checked_in")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const past = bookings
    .filter((b) => b.status === "completed" || b.status === "cancelled")
    .sort((a, b) => b.startTime.localeCompare(a.startTime));

  return (
    <div className="mx-auto max-w-[960px] px-5 md:px-8 pt-12 md:pt-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p className="text-[16px] text-slate">Hi {user?.name.split(" ")[0] ?? "there"}</p>
          <h1 className="mt-1 text-[40px] md:text-[56px] leading-[1] tracking-[-0.03em]">Your trips</h1>
        </div>
        <Link href="/find">
          <Button>
            Find parking
            <ArrowRight />
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="mt-14 h-[280px] rounded-stadium bg-lifted animate-pulse" />
      ) : (
        <>
          <section className="mt-14 space-y-6">
            {active.length === 0 ? (
              <div className="rounded-stadium bg-lifted p-12 text-center">
                <h2 className="text-[24px]">No upcoming trips</h2>
                <p className="mt-2 text-slate">Book a spot and your gate pass will show up here.</p>
              </div>
            ) : (
              active.map((booking, i) => (
                <Reveal key={booking.id} delay={i * 100}>
                  <article
                    data-testid={`driver-booking-card-${booking.id}`}
                    className="rounded-stadium bg-ink text-canvas overflow-hidden grid md:grid-cols-[1fr_auto]"
                  >
                    <div className="p-7 md:p-10">
                      <div className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-1.5 text-[13px]">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            booking.status === "checked_in" ? "bg-[#4ADE80] animate-pulse" : "bg-[#F37338]"
                          )}
                        />
                        {STATUS_LABEL[booking.status]}
                      </div>
                      <h2 className="mt-6 text-[26px] md:text-[30px] leading-[1.15] text-canvas">
                        {booking.listingTitle}
                      </h2>
                      <p className="mt-2 flex items-center gap-1.5 text-[15px] text-canvas/60">
                        <MapPin className="size-4" />
                        {booking.listingAddress}, {booking.listingLocality}
                      </p>
                      <div className="mt-6 grid grid-cols-2 gap-6 text-[15px] max-w-md">
                        <div>
                          <div className="text-canvas/50 text-[13px]">Arrive</div>
                          <div className="mt-1">{formatDateTime(booking.startTime)}</div>
                        </div>
                        <div>
                          <div className="text-canvas/50 text-[13px]">Leave by</div>
                          <div className="mt-1">{formatDateTime(booking.endTime)}</div>
                        </div>
                      </div>
                      <div className="mt-6 rounded-cta bg-white/10 p-5 text-[15px] leading-[1.5]">
                        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.06em] text-[#F37338] mb-1.5">
                          <KeyRound className="size-3.5" />
                          How to get in
                        </div>
                        {booking.accessInstructions}
                      </div>
                      <div className="mt-8 flex flex-wrap gap-3">
                        {booking.status === "confirmed" && (
                          <Button
                            variant="secondary"
                            className="bg-canvas border-canvas"
                            disabled={actionId === booking.id}
                            onClick={() =>
                              patchBooking(
                                booking,
                                { action: "checkin", checkinPin: booking.checkinPin },
                                "Checked in. Enjoy your stay!"
                              )
                            }
                          >
                            I&apos;ve arrived
                          </Button>
                        )}
                        {booking.status === "checked_in" && (
                          <Button
                            variant="secondary"
                            className="bg-canvas border-canvas"
                            disabled={actionId === booking.id}
                            onClick={() =>
                              patchBooking(booking, { action: "complete" }, "Trip ended. Rate your spot?")
                            }
                          >
                            End parking
                          </Button>
                        )}
                        {booking.status === "confirmed" && (
                          <Button
                            variant="ghost"
                            className="text-canvas/70 hover:text-canvas hover:bg-white/10"
                            disabled={actionId === booking.id}
                            onClick={() =>
                              patchBooking(
                                booking,
                                { action: "cancel", reason: "Cancelled by driver" },
                                ""
                              )
                            }
                          >
                            Cancel booking
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Tear-off PIN stub, like a boarding pass */}
                    <div className="relative border-t md:border-t-0 md:border-l border-dashed border-white/20 px-10 py-8 md:py-10 flex md:flex-col items-center justify-between md:justify-center gap-2 bg-white/[0.04]">
                      <div className="text-[12px] uppercase tracking-[0.08em] font-bold text-canvas/50">
                        Gate PIN
                      </div>
                      <div className="text-[44px] md:text-[52px] font-medium tracking-[0.2em] leading-none">
                        {booking.checkinPin}
                      </div>
                      <div className="hidden md:block mt-2 text-[12px] text-canvas/50">
                        {booking.referenceCode}
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))
            )}
          </section>

          {past.length > 0 && (
            <section className="mt-20">
              <h2 className="text-[24px]">Past trips</h2>
              <ul className="mt-6 divide-y divide-ink/10">
                {past.map((booking) => (
                  <li key={booking.id} className="flex items-center gap-5 py-5">
                    <img
                      src={booking.listingPhotoUrl}
                      alt=""
                      className="size-14 rounded-full object-cover shrink-0 bg-lifted"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/listings/${booking.listingId}`}
                        className="block text-[16px] font-medium truncate hover:underline"
                      >
                        {booking.listingTitle}
                      </Link>
                      <div className="text-[14px] text-slate">
                        {formatShortDate(booking.startTime)} ·{" "}
                        {booking.status === "cancelled"
                          ? `Cancelled · refunded ${formatInr(booking.refundAmountInr ?? 0)}`
                          : formatInr(booking.totalDriverPaidInr)}
                      </div>
                    </div>
                    {booking.status === "completed" &&
                      (booking.hasReview ? (
                        <span className="inline-flex items-center gap-1 text-[14px] text-slate">
                          <Star className="size-3.5 fill-slate" />
                          Reviewed
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setReviewBooking(booking);
                            setRating(5);
                            setComment("");
                          }}
                        >
                          Rate
                        </Button>
                      ))}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Dialog open={Boolean(reviewBooking)} onOpenChange={(open) => !open && setReviewBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How was your spot?</DialogTitle>
            <DialogDescription>{reviewBooking?.listingTitle}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReview} className="space-y-5 mt-2">
            <div className="flex gap-2" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  onClick={() => setRating(star)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      "size-8 transition-colors",
                      rating >= star ? "fill-ink text-ink" : "text-taupe"
                    )}
                  />
                </button>
              ))}
            </div>
            <Textarea
              aria-label="Your review"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Easy to find? Did your car fit?"
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setReviewBooking(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingReview}>
                {submittingReview ? "Posting…" : "Post review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
