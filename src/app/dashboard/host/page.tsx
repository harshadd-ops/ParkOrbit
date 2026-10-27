"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarOff,
  Car,
  Clock,
  IndianRupee,
  KeyRound,
  ParkingSquare,
  Pencil,
  Plus,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Switch,
} from "@/components/ui/primitives";
import { CountUp } from "@/components/motion/Reveal";
import { useAuth } from "@/context/AuthContext";
import { cn, formatDateTime, formatInr } from "@/lib/utils";
import { notifyDataChanged, useDataSync } from "@/lib/sync";
import type { ParkingListing, Booking, BlockedPeriod, Review } from "@/lib/types";

interface HostFinancials {
  completedEstimatedEarningsInr: number;
  upcomingPendingEarningsInr: number;
  totalBookedHours: number;
  grossBookingVolumeInr: number;
  totalPlatformCommissionInr: number;
}

const DAY_MS = 24 * 3600 * 1000;

// datetime-local wants local time without a zone suffix
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function Panel({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-stadium bg-white p-6 md:p-8 shadow-nav", className)}>
      {title && (
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-[20px] tracking-[-0.01em]">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  prefix,
  suffix,
  decimals,
  caption,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: boolean;
  caption: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-stadium bg-white p-6 shadow-nav flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-slate">{label}</span>
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-canvas">
          <Icon className="size-[18px]" strokeWidth={1.7} />
        </span>
      </div>
      <div className="mt-5 text-[34px] font-medium tracking-[-0.03em] leading-none tabular-nums">
        {loading ? (
          "—"
        ) : decimals ? (
          `${value.toFixed(1)}${suffix ?? ""}`
        ) : (
          <CountUp value={value} prefix={prefix} suffix={suffix} />
        )}
      </div>
      <div className="mt-3 text-[13px] text-slate">{caption}</div>
    </div>
  );
}

/** Daily net earnings: earned (ink) stacked under scheduled (taupe), one shared ₹ axis. */
function EarningsChart({ bookings, days }: { bookings: Booking[]; days: number }) {
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Window ends a few days ahead so upcoming bookings are visible
    const ahead = 5;
    const start = new Date(today.getTime() - (days - ahead - 1) * DAY_MS);
    const buckets = Array.from({ length: days }, (_, i) => {
      const date = new Date(start.getTime() + i * DAY_MS);
      return { date, key: dayKey(date), earned: 0, scheduled: 0, isToday: i === days - ahead - 1 };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const bucket = byKey.get(dayKey(new Date(b.startTime)));
      if (!bucket) continue;
      if (b.status === "completed") bucket.earned += b.netHostEarningsInr;
      else bucket.scheduled += b.netHostEarningsInr;
    }
    return buckets;
  }, [bookings, days]);

  const max = Math.max(100, ...data.map((d) => d.earned + d.scheduled));
  const niceMax = Math.ceil(max / 100) * 100;
  const ticks = [niceMax, niceMax / 2, 0];
  const total = data.reduce((s, d) => s + d.earned + d.scheduled, 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[34px] font-medium tracking-[-0.03em] leading-none tabular-nums">
            {formatInr(total)}
          </div>
          <div className="mt-2 text-[13px] text-slate">Net to you in this period</div>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-slate">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-ink" /> Earned
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-taupe" /> Scheduled
          </span>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        {/* Y axis */}
        <div className="flex flex-col justify-between h-[200px] text-[11px] text-slate tabular-nums text-right w-10 shrink-0 -mt-1.5 pb-0">
          {ticks.map((t) => (
            <span key={t}>₹{t}</span>
          ))}
        </div>

        <div className="relative flex-1 h-[200px]">
          {/* Gridlines */}
          {ticks.map((t, i) => (
            <div
              key={t}
              className="absolute left-0 right-0 border-t border-ink/[0.07]"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-[3px]">
            {data.map((d, i) => {
              const earnedH = (d.earned / niceMax) * 100;
              const schedH = (d.scheduled / niceMax) * 100;
              return (
                <div
                  key={d.key}
                  className="relative flex-1 h-full flex flex-col justify-end cursor-default"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  {hover === i && <div className="absolute inset-x-0 inset-y-0 rounded-[4px] bg-ink/[0.04]" />}
                  {d.scheduled > 0 && (
                    <div
                      className="relative mx-auto w-full max-w-[22px] rounded-t-[4px] bg-taupe transition-[height] duration-700"
                      style={{ height: `${schedH}%`, marginBottom: d.earned > 0 ? 2 : 0 }}
                    />
                  )}
                  {d.earned > 0 && (
                    <div
                      className={cn(
                        "relative mx-auto w-full max-w-[22px] bg-ink transition-[height] duration-700",
                        d.scheduled > 0 ? "" : "rounded-t-[4px]"
                      )}
                      style={{ height: `${earnedH}%` }}
                    />
                  )}
                  {d.isToday && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-[#F37338]" />
                  )}
                  {hover === i && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-cta bg-ink text-canvas px-3.5 py-2.5 text-[12px] shadow-halo pointer-events-none">
                      <div className="font-medium">
                        {d.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                      <div className="mt-1 text-canvas/70">Earned {formatInr(d.earned)}</div>
                      <div className="text-canvas/70">Scheduled {formatInr(d.scheduled)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis: first, today (under its bar), last */}
      <div className="relative mt-8 ml-[52px] h-4 text-[11px] text-slate">
        <span className="absolute left-0">
          {data[0].date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
        <span
          className="absolute -translate-x-1/2 text-ink"
          style={{ left: `${((data.findIndex((d) => d.isToday) + 0.5) / data.length) * 100}%` }}
        >
          Today
        </span>
        <span className="absolute right-0">
          {data[data.length - 1].date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>
    </div>
  );
}

export default function HostDashboardPage() {
  const { currentUser: user } = useAuth();
  const [listings, setListings] = useState<ParkingListing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<BlockedPeriod[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [financials, setFinancials] = useState<HostFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [range, setRange] = useState<14 | 30>(30);

  const [blockListing, setBlockListing] = useState<ParkingListing | null>(null);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("Using it myself");
  const [addingBlock, setAddingBlock] = useState(false);

  const fetchHostData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/bookings?role=host", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setListings(data.hostListings || []);
        setBookings(data.hostBookings || []);
        setBlocks(data.hostBlocks || []);
        setReviews(data.hostReviews || []);
        setFinancials(data.hostFinancials || null);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useDataSync(fetchHostData, [fetchHostData, user?.id, range]);

  const toggleListing = async (listing: ParkingListing) => {
    const nextStatus = listing.status === "published" ? "paused" : "published";
    setBusyId(listing.id);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Couldn't update this space.");
        return;
      }
      toast.success(nextStatus === "published" ? "Your space is live." : "Paused. Drivers can't book it.");
      notifyDataChanged("listings");
      await fetchHostData();
    } finally {
      setBusyId(null);
    }
  };

  const verifyPin = async (booking: Booking) => {
    const pin = (pinInputs[booking.id] || "").trim();
    if (!/^\d{4}$/.test(pin)) {
      toast.error("Ask the driver for their 4-digit PIN.");
      return;
    }
    setBusyId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", checkinPin: pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "That PIN doesn't match.");
        return;
      }
      toast.success(`${booking.driverName} is checked in.`);
      setPinInputs((p) => ({ ...p, [booking.id]: "" }));
      notifyDataChanged("bookings");
      await fetchHostData();
    } finally {
      setBusyId(null);
    }
  };

  const completeBooking = async (booking: Booking) => {
    setBusyId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      if (res.ok) {
        toast.success("Marked as complete.");
        notifyDataChanged("bookings");
        await fetchHostData();
      }
    } finally {
      setBusyId(null);
    }
  };

  const openBlockDialog = (listing: ParkingListing) => {
    const start = new Date(Date.now() + DAY_MS);
    start.setMinutes(0, 0, 0);
    setBlockStart(toLocalInput(start));
    setBlockEnd(toLocalInput(new Date(start.getTime() + 4 * 3600 * 1000)));
    setBlockReason("Using it myself");
    setBlockListing(listing);
  };

  const addBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockListing) return;
    if (new Date(blockEnd) <= new Date(blockStart)) {
      toast.error("End time must be after the start.");
      return;
    }
    setAddingBlock(true);
    try {
      const res = await fetch(`/api/listings/${blockListing.id}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: new Date(blockStart).toISOString(),
          endTime: new Date(blockEnd).toISOString(),
          reason: blockReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't block that time.");
        return;
      }
      toast.success("Blocked. Drivers can't book those hours.");
      notifyDataChanged("blocks");
      await fetchHostData();
    } finally {
      setAddingBlock(false);
    }
  };

  const removeBlock = async (listingId: string, blockId: string) => {
    const res = await fetch(`/api/listings/${listingId}/blocks?blockId=${blockId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Time reopened for bookings.");
      notifyDataChanged("blocks");
      await fetchHostData();
    }
  };

  const arrivals = bookings
    .filter((b) => b.status === "confirmed" || b.status === "checked_in")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const parkedNow = arrivals.filter((b) => b.status === "checked_in").length;
  const listingBlocks = blockListing ? blocks.filter((b) => b.listingId === blockListing.id) : [];
  const liveCount = listings.filter((l) => l.status === "published").length;

  const ratedListings = listings.filter((l) => l.reviewCount > 0);
  const totalReviews = ratedListings.reduce((s, l) => s + l.reviewCount, 0);
  const avgRating = totalReviews
    ? ratedListings.reduce((s, l) => s + l.ratingAvg * l.reviewCount, 0) / totalReviews
    : 0;

  const perListing = useMemo(() => {
    const map = new Map<string, { bookings: number; earned: number }>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const row = map.get(b.listingId) || { bookings: 0, earned: 0 };
      row.bookings += 1;
      row.earned += b.netHostEarningsInr;
      map.set(b.listingId, row);
    }
    return map;
  }, [bookings]);
  const topEarned = Math.max(1, ...Array.from(perListing.values()).map((r) => r.earned));

  if (user && user.role !== "host") {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-32 text-center">
        <h1 className="text-[36px]">This is the host dashboard</h1>
        <p className="mt-3 text-slate">Switch to the Host demo account in the dock below to see it.</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-[1280px] px-4 md:px-8 pt-10 md:pt-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p className="text-[15px] text-slate">{today}</p>
          <h1 className="mt-1 text-[36px] md:text-[48px] leading-[1] tracking-[-0.03em]">
            Good to see you, {user?.name.split(" ")[0] ?? "host"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/find">
            <Button variant="secondary">View marketplace</Button>
          </Link>
          <Link href="/host/new">
            <Button>
              <Plus />
              List a space
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={IndianRupee}
          label="Earned so far"
          value={financials?.completedEstimatedEarningsInr ?? 0}
          prefix="₹"
          caption="From completed bookings"
          loading={loading}
        />
        <StatCard
          icon={Clock}
          label="Coming up"
          value={financials?.upcomingPendingEarningsInr ?? 0}
          prefix="₹"
          caption={`${arrivals.length} booking${arrivals.length === 1 ? "" : "s"} scheduled`}
          loading={loading}
        />
        <StatCard
          icon={ParkingSquare}
          label="Live spaces"
          value={liveCount}
          suffix={` / ${listings.length}`}
          caption={`${financials?.totalBookedHours ?? 0} hours booked in total`}
          loading={loading}
        />
        <StatCard
          icon={Star}
          label="Guest rating"
          value={avgRating}
          decimals
          caption={`${totalReviews} review${totalReviews === 1 ? "" : "s"}`}
          loading={loading}
        />
      </div>

      {/* Earnings + payout */}
      <div className="mt-4 grid lg:grid-cols-12 gap-4">
        <Panel
          title="Earnings"
          className="lg:col-span-8"
          action={
            <div className="inline-flex rounded-pill bg-canvas p-1 text-[13px]" role="tablist">
              {([14, 30] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={range === r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-pill px-3.5 py-1.5 font-medium transition-colors",
                    range === r ? "bg-white shadow-nav" : "text-slate hover:text-ink"
                  )}
                >
                  {r} days
                </button>
              ))}
            </div>
          }
        >
          {loading ? (
            <div className="h-[280px] rounded-cta bg-canvas animate-pulse" />
          ) : (
            <EarningsChart bookings={bookings} days={range} />
          )}
        </Panel>

        <section className="lg:col-span-4 rounded-stadium bg-ink text-canvas p-6 md:p-8 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] text-canvas">Payout</h2>
            <Wallet className="size-5 text-canvas/60" strokeWidth={1.7} />
          </div>
          <div className="mt-8 text-[13px] text-canvas/60">Next payout (estimated)</div>
          <div className="mt-2 text-[44px] font-medium tracking-[-0.03em] leading-none tabular-nums">
            {formatInr(financials?.completedEstimatedEarningsInr ?? 0)}
          </div>
          <div className="mt-3 inline-flex w-fit items-center gap-2 rounded-pill bg-white/10 px-3 py-1.5 text-[12px]">
            <span className="size-1.5 rounded-full bg-[#F37338]" />
            Pending settlement
          </div>

          <dl className="mt-auto pt-8 space-y-3 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-canvas/60">Gross bookings</dt>
              <dd className="tabular-nums">{formatInr(financials?.grossBookingVolumeInr ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-canvas/60">ParkOrbit fee</dt>
              <dd className="tabular-nums">−{formatInr(financials?.totalPlatformCommissionInr ?? 0)}</dd>
            </div>
            <div className="flex justify-between border-t border-white/15 pt-3">
              <dt className="text-canvas/60">Paid to</dt>
              <dd>{user?.upiId || "Add UPI ID"}</dd>
            </div>
          </dl>
          <p className="mt-5 text-[12px] text-canvas/40">Payouts are simulated in this demo.</p>
        </section>
      </div>

      {/* Arrivals + reviews */}
      <div className="mt-4 grid lg:grid-cols-12 gap-4">
        <Panel
          title="Arrivals"
          className="lg:col-span-8"
          action={
            <span className="text-[13px] text-slate">
              {parkedNow > 0 ? `${parkedNow} parked now · ` : ""}
              {arrivals.length - parkedNow} expected
            </span>
          }
        >
          <p className="-mt-3 mb-6 flex items-center gap-2 text-[14px] text-slate">
            <KeyRound className="size-4" />
            Ask the driver for their 4-digit PIN when they arrive.
          </p>
          {loading ? (
            <div className="h-28 rounded-cta bg-canvas animate-pulse" />
          ) : arrivals.length === 0 ? (
            <div className="rounded-cta bg-canvas p-10 text-center text-[15px] text-slate">
              No upcoming bookings yet. Share your listing to get your first driver.
            </div>
          ) : (
            <ul className="divide-y divide-ink/[0.07]">
              {arrivals.map((booking) => {
                const start = new Date(booking.startTime);
                return (
                  <li key={booking.id} className="flex flex-col md:flex-row md:items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex flex-col items-center justify-center size-14 rounded-cta bg-canvas shrink-0 leading-none">
                        <span className="text-[11px] uppercase text-slate">
                          {start.toLocaleDateString("en-IN", { month: "short" })}
                        </span>
                        <span className="mt-1 text-[20px] font-medium">{start.getDate()}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[15px] font-medium">
                          {booking.driverName}
                          <span className="inline-flex items-center gap-1 rounded-pill bg-canvas px-2 py-0.5 text-[12px] font-[450] text-granite">
                            <Car className="size-3" />
                            {booking.vehiclePlate}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[13px] text-slate truncate">
                          {start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} ·{" "}
                          {booking.durationHours}h · {booking.listingTitle}
                        </div>
                      </div>
                    </div>
                    <div className="text-[15px] font-medium tabular-nums md:w-20 md:text-right shrink-0">
                      {formatInr(booking.netHostEarningsInr)}
                    </div>
                    {booking.status === "confirmed" ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          verifyPin(booking);
                        }}
                        className="flex items-center gap-2 shrink-0"
                      >
                        <Input
                          aria-label={`PIN for ${booking.driverName}`}
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="PIN"
                          value={pinInputs[booking.id] || ""}
                          onChange={(e) =>
                            setPinInputs((p) => ({ ...p, [booking.id]: e.target.value.replace(/\D/g, "") }))
                          }
                          className="w-24 h-10 text-center tracking-[0.3em] px-3"
                        />
                        <Button type="submit" size="sm" disabled={busyId === booking.id}>
                          Check in
                        </Button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="inline-flex items-center gap-2 rounded-pill bg-[#1E7E48]/10 px-3 py-1.5 text-[13px] text-[#1E7E48]">
                          <span className="size-1.5 rounded-full bg-[#1E7E48] animate-pulse" />
                          Parked
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === booking.id}
                          onClick={() => completeBooking(booking)}
                        >
                          Complete
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Recent reviews" className="lg:col-span-4">
          {reviews.length === 0 ? (
            <div className="rounded-cta bg-canvas p-8 text-center text-[14px] text-slate">
              Reviews from drivers will show up here.
            </div>
          ) : (
            <ul className="space-y-6">
              {reviews.slice(0, 3).map((rev) => (
                <li key={rev.id}>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-medium">{rev.driverName}</span>
                    <span className="inline-flex items-center gap-1 text-[13px]">
                      <Star className="size-3.5 fill-ink" />
                      {rev.rating}.0
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] text-granite leading-[1.5] line-clamp-3">{rev.comment}</p>
                  <div className="mt-2 text-[12px] text-slate truncate">
                    {listings.find((l) => l.id === rev.listingId)?.title}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Listings performance */}
      <Panel
        title="Your listings"
        className="mt-4"
        action={
          <Link href="/host/new" className="inline-flex items-center gap-1 text-[14px] font-medium hover:underline">
            Add another <ArrowUpRight className="size-4" />
          </Link>
        }
      >
        {loading ? (
          <div className="h-40 rounded-cta bg-canvas animate-pulse" />
        ) : listings.length === 0 ? (
          <div className="rounded-cta bg-canvas p-12 text-center">
            <h3 className="text-[20px]">You haven&apos;t listed a space yet</h3>
            <p className="mt-2 text-slate">It takes about three minutes.</p>
            <Link href="/host/new" className="inline-block mt-6">
              <Button>List your first space</Button>
            </Link>
          </div>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="text-[12px] uppercase tracking-[0.04em] text-slate">
                  <th className="font-bold px-2 pb-4">Space</th>
                  <th className="font-bold px-2 pb-4">Status</th>
                  <th className="font-bold px-2 pb-4 text-right">Rate</th>
                  <th className="font-bold px-2 pb-4 text-right">Bookings</th>
                  <th className="font-bold px-2 pb-4">Revenue</th>
                  <th className="font-bold px-2 pb-4 text-right">Rating</th>
                  <th className="px-2 pb-4"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.07] border-t border-ink/[0.07]">
                {listings.map((listing) => {
                  const live = listing.status === "published";
                  const stats = perListing.get(listing.id) || { bookings: 0, earned: 0 };
                  const blockCount = blocks.filter((b) => b.listingId === listing.id).length;
                  return (
                    <tr key={listing.id} className="text-[14px]">
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={listing.photos[0]?.url}
                            alt=""
                            className={cn(
                              "size-11 rounded-full object-cover shrink-0",
                              !live && "grayscale opacity-60"
                            )}
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/listings/${listing.id}`}
                              className="block font-medium truncate max-w-[260px] hover:underline"
                            >
                              {listing.title}
                            </Link>
                            <div className="text-[13px] text-slate">{listing.locality}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <label className="inline-flex items-center gap-2.5 cursor-pointer">
                          <Switch
                            checked={live}
                            disabled={busyId === listing.id || listing.status === "flagged"}
                            onCheckedChange={() => toggleListing(listing)}
                            aria-label={live ? "Pause listing" : "Publish listing"}
                          />
                          <span className={cn(!live && "text-slate")}>
                            {listing.status === "flagged"
                              ? "Suspended"
                              : live
                                ? "Live"
                                : listing.status === "draft"
                                  ? "Draft"
                                  : "Paused"}
                          </span>
                        </label>
                      </td>
                      <td className="px-2 py-4 text-right tabular-nums">{formatInr(listing.hourlyRateInr)}/hr</td>
                      <td className="px-2 py-4 text-right tabular-nums">{stats.bookings}</td>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-24 rounded-full bg-canvas overflow-hidden">
                            <div
                              className="h-full rounded-full bg-ink"
                              style={{ width: `${(stats.earned / topEarned) * 100}%` }}
                            />
                          </div>
                          <span className="tabular-nums">{formatInr(stats.earned)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-4 text-right">
                        {listing.reviewCount > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="size-3.5 fill-ink" />
                            {listing.ratingAvg.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate">New</span>
                        )}
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openBlockDialog(listing)}
                            className="px-3 hover:bg-canvas"
                          >
                            <CalendarOff />
                            {blockCount > 0 ? `Blocked (${blockCount})` : "Block time"}
                          </Button>
                          <Link href={`/host/listings/${listing.id}/edit`}>
                            <Button variant="ghost" size="sm" className="px-3 hover:bg-canvas" aria-label="Edit listing">
                              <Pencil />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Dialog open={Boolean(blockListing)} onOpenChange={(open) => !open && setBlockListing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Block time</DialogTitle>
            <DialogDescription>
              Need your spot back? Drivers won&apos;t be able to book these hours.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addBlock} className="space-y-4 mt-2">
            <Field>
              <FieldLabel htmlFor="block-start">From</FieldLabel>
              <Input
                id="block-start"
                type="datetime-local"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="block-end">Until</FieldLabel>
              <Input
                id="block-end"
                type="datetime-local"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="block-reason">Note (only you see this)</FieldLabel>
              <Input
                id="block-reason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" className="w-full" disabled={addingBlock}>
              {addingBlock ? "Blocking…" : "Block these hours"}
            </Button>
          </form>

          {listingBlocks.length > 0 && (
            <ul className="mt-6 border-t border-ink/10 pt-4 space-y-2">
              {listingBlocks.map((blk) => (
                <li key={blk.id} className="flex items-center justify-between gap-3 text-[14px]">
                  <div>
                    <div>{formatDateTime(blk.startTime)} → {formatDateTime(blk.endTime)}</div>
                    <div className="text-slate">{blk.reason}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove block"
                    onClick={() => removeBlock(blk.listingId, blk.id)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
