"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PlusCircle,
  CalendarOff,
  CheckCircle2,
  KeyRound,
  PauseCircle,
  PlayCircle,
  Edit3,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Field, FieldLabel } from "@/components/ui/field";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/primitives";
import { useAuth } from "@/context/AuthContext";
import { formatInr, formatDateTime } from "@/lib/utils";
import type {
  ParkingListing,
  Booking,
  BlockedPeriod,
} from "@/lib/types";
import { toast } from "sonner";

interface HostFinancials {
  grossBookingVolumeInr: number;
  totalPlatformCommissionInr: number;
  completedEstimatedEarningsInr: number;
  upcomingPendingEarningsInr: number;
  totalBookedHours: number;
  payoutStatusLabel: string;
}

export default function HostDashboardPage() {
  const { currentUser: user } = useAuth();
  const [hostListings, setHostListings] = useState<ParkingListing[]>([]);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [hostBlocks, setHostBlocks] = useState<BlockedPeriod[]>([]);
  const [financials, setFinancials] = useState<HostFinancials | null>(null);
  const [loading, setLoading] = useState(true);

  // Blocked Period Form State
  const [selectedListingForBlock, setSelectedListingForBlock] =
    useState<string>("");
  const [blockStart, setBlockStart] = useState<string>(() => {
    const d = new Date(Date.now() + 72 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [blockEnd, setBlockEnd] = useState<string>(() => {
    const d = new Date(Date.now() + 76 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [blockReason, setBlockReason] = useState<string>(
    "Owner personal vehicle use"
  );
  const [addingBlock, setAddingBlock] = useState(false);

  // PIN verification input per booking
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});

  const fetchHostData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const bookingsRes = await fetch(`/api/bookings?role=host`);
      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        const items: ParkingListing[] = bData.hostListings || [];
        setHostListings(items);
        setHostBookings(bData.hostBookings || []);
        setHostBlocks(bData.hostBlocks || []);
        setFinancials(bData.hostFinancials || null);
        if (items.length > 0 && !selectedListingForBlock) {
          setSelectedListingForBlock(items[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, selectedListingForBlock]);

  useEffect(() => {
    fetchHostData();
  }, [fetchHostData]);

  const handleToggleListingStatus = async (listing: ParkingListing) => {
    const nextStatus =
      listing.status === "published" ? "paused" : "published";
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Could not update listing status.");
        return;
      }
      toast.success(
        nextStatus === "published"
          ? `"${listing.title}" is now live on the marketplace!`
          : `"${listing.title}" has been paused.`
      );
      await fetchHostData();
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListingForBlock) {
      toast.error("Please select a listing to block.");
      return;
    }
    setAddingBlock(true);
    try {
      const startIso = new Date(blockStart).toISOString();
      const endIso = new Date(blockEnd).toISOString();
      const res = await fetch(
        `/api/listings/${selectedListingForBlock}/blocks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime: startIso,
            endTime: endIso,
            reason: blockReason,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add blocked period.");
        return;
      }
      toast.success("Unavailable time window blocked on calendar.");
      await fetchHostData();
    } catch {
      toast.error("Invalid date/time format.");
    } finally {
      setAddingBlock(false);
    }
  };

  const handleRemoveBlock = async (listingId: string, blockId: string) => {
    try {
      const res = await fetch(
        `/api/listings/${listingId}/blocks?blockId=${blockId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Blocked window removed — slot reopened for drivers.");
        await fetchHostData();
      }
    } catch {
      toast.error("Could not remove block.");
    }
  };

  const handleVerifyCheckIn = async (booking: Booking) => {
    const code = pinInputs[booking.id] || booking.checkinPin;
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkin",
          checkinPin: code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Invalid check-in PIN.");
        return;
      }
      toast.success("Driver check-in verified!");
      await fetchHostData();
    } catch {
      toast.error("Verification failed.");
    }
  };

  const handleCompleteReservation = async (booking: Booking) => {
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      if (res.ok) {
        toast.success("Reservation marked completed.");
        await fetchHostData();
      }
    } catch {
      toast.error("Could not complete reservation.");
    }
  };

  const activeListingsCount = hostListings.filter(
    (l) => l.status === "published"
  ).length;
  const draftListingsCount = hostListings.filter(
    (l) => l.status === "draft"
  ).length;
  const upcomingReservationsCount = hostBookings.filter(
    (b) => b.status === "confirmed" || b.status === "checked_in"
  ).length;
  const completedReservationsCount = hostBookings.filter(
    (b) => b.status === "completed"
  ).length;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mc-eyebrow mb-2">
            <span className="mc-eyebrow-dot" />
            <span>HOST OPERATIONS & EARNINGS STUDIO</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] text-[#141413]">
            Manage Your Parking Spaces & Revenue
          </h1>
          <p className="text-base text-[#595550] mt-1">
            Control availability schedules, verify driver check-in PINs, and
            track estimated net payouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/host/new">
            <Button variant="default">
              <PlusCircle className="w-4 h-4" />
              Create New Parking Listing
            </Button>
          </Link>
        </div>
      </div>

      {user && user.role !== "host" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between text-xs text-[#595550]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are currently viewing as <strong>{user.name}</strong> ({user.role.toUpperCase()}). Use the <strong>1-Click Persona Switcher</strong> in the top navigation bar to switch to <strong>Neha Kulkarni (Host)</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Honest Financial Banner */}
      <div className="rounded-2xl bg-[#FCFBFA] border border-[#C85A00]/30 p-4 flex items-start gap-3 text-xs text-[#595550]">
        <AlertCircle className="w-4 h-4 text-[#C85A00] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#141413]">
            Honest Financial Reporting (Pending Settlement):
          </strong>{" "}
          {financials?.payoutStatusLabel ||
            "All earnings below reflect net host revenue after the ParkOrbit platform commission and are marked as Pending Settlement / Estimated because live bank payouts are not configured in this sandbox."}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#141413] text-[#F3F0EE] rounded-[24px] p-6 shadow-mc-card">
          <div className="text-xs font-bold uppercase tracking-wider text-[#A39E98]">
            Estimated Net Earnings (Completed)
          </div>
          <div className="text-3xl font-bold text-white mt-2">
            {formatInr(financials?.completedEstimatedEarningsInr ?? 0)}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill bg-[#C85A00]/25 text-[#F37338] text-[11px] font-semibold">
            Pending Settlement · Estimated
          </div>
        </div>

        <div className="bg-[#FCFBFA] rounded-[24px] p-6 border border-black/8 shadow-mc-card">
          <div className="text-xs font-bold uppercase tracking-wider text-[#595550]">
            Upcoming Pipeline (Net Host Share)
          </div>
          <div className="text-3xl font-bold text-[#141413] mt-2">
            {formatInr(financials?.upcomingPendingEarningsInr ?? 0)}
          </div>
          <div className="text-xs text-[#595550] mt-2">
            Gross Volume: {formatInr(financials?.grossBookingVolumeInr ?? 0)}
          </div>
        </div>

        <div className="bg-[#FCFBFA] rounded-[24px] p-6 border border-black/8 shadow-mc-card">
          <div className="text-xs font-bold uppercase tracking-wider text-[#595550]">
            Active & Draft Spaces
          </div>
          <div className="text-3xl font-bold text-[#141413] mt-2">
            {activeListingsCount} Active{" "}
            <span className="text-base font-normal text-[#736E68]">
              / {draftListingsCount} Drafts
            </span>
          </div>
          <div className="text-xs text-[#1E7E48] font-semibold mt-2">
            {upcomingReservationsCount} upcoming reservations
          </div>
        </div>

        <div className="bg-[#FCFBFA] rounded-[24px] p-6 border border-black/8 shadow-mc-card">
          <div className="text-xs font-bold uppercase tracking-wider text-[#595550]">
            Utilization & Booked Hours
          </div>
          <div className="text-3xl font-bold text-[#141413] mt-2">
            {financials?.totalBookedHours ?? 0} hrs
          </div>
          <div className="text-xs text-[#595550] mt-2">
            Across {completedReservationsCount} completed +{" "}
            {upcomingReservationsCount} active trips
          </div>
        </div>
      </div>

      {/* Main Host Studio Tabs */}
      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="listings">
            My Spaces ({hostListings.length})
          </TabsTrigger>
          <TabsTrigger value="reservations">
            Reservations & Check-In ({hostBookings.length})
          </TabsTrigger>
          <TabsTrigger value="availability">
            Availability & Blocked Dates
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: HOST LISTINGS */}
        <TabsContent value="listings" className="space-y-5">
          {loading ? (
            <div className="h-48 rounded-[24px] bg-[#FCFBFA] animate-pulse border border-black/8" />
          ) : hostListings.length === 0 ? (
            <div className="bg-[#FCFBFA] rounded-[28px] p-12 text-center border border-black/8 space-y-4">
              <h3 className="text-2xl font-medium text-[#141413]">
                You haven&apos;t listed any parking spaces under {user?.name} yet
              </h3>
              <p className="text-sm text-[#595550] max-w-md mx-auto">
                Click &ldquo;Create New Parking Listing&rdquo; to publish a driveway or save a draft.
                You can also use the 1-click persona switcher in the top navigation bar to switch between Pune demo accounts.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/host/new">
                  <Button variant="default">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create Your First Listing
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            hostListings.map((listing) => {
              const blocks = hostBlocks.filter(
                (blk) => blk.listingId === listing.id
              );
              const photoUrl =
                listing.photos[0]?.url ||
                "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1000&q=80";

              return (
                <div
                  key={listing.id}
                  className="bg-[#FCFBFA] rounded-[28px] p-6 border border-black/10 shadow-mc-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 flex-1">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#E8E2DA] shrink-0">
                      <img
                        src={photoUrl}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            listing.status === "published"
                              ? "default"
                              : listing.status === "draft"
                                ? "orbit"
                                : "outline"
                          }
                        >
                          {listing.status.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-semibold text-[#595550]">
                          {listing.locality}, {listing.city}
                        </span>
                        {blocks.length > 0 && (
                          <Badge variant="outline">
                            {blocks.length} Blocked Window(s)
                          </Badge>
                        )}
                      </div>

                      <Link
                        href={`/listings/${listing.id}`}
                        className="text-xl font-medium text-[#141413] hover:text-[#CF4500] block"
                      >
                        {listing.title}
                      </Link>

                      <div className="text-xs text-[#595550] flex flex-wrap gap-3">
                        <span>
                          Hourly:{" "}
                          <strong className="text-[#141413]">
                            {formatInr(listing.hourlyRateInr)}
                          </strong>
                        </span>
                        <span>
                          Daily:{" "}
                          <strong className="text-[#141413]">
                            {formatInr(listing.dailyRateInr)}
                          </strong>
                        </span>
                        <span>
                          Dimensions: {listing.dimensions.lengthFt}×
                          {listing.dimensions.widthFt} ft
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-black/8">
                    <Button
                      size="sm"
                      variant={
                        listing.status === "published" ? "secondary" : "consent"
                      }
                      onClick={() => handleToggleListingStatus(listing)}
                    >
                      {listing.status === "published" ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          Pause Space
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          Publish Live
                        </>
                      )}
                    </Button>

                    <Link href={`/host/listings/${listing.id}/edit`}>
                      <Button size="sm" variant="default">
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Pricing & Details
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* TAB 2: RESERVATIONS & PIN CHECK-IN */}
        <TabsContent value="reservations" className="space-y-5">
          {hostBookings.length === 0 ? (
            <div className="bg-[#FCFBFA] rounded-[28px] p-12 text-center border border-black/8">
              <p className="text-sm text-[#595550]">
                No reservations found for your listings yet.
              </p>
            </div>
          ) : (
            hostBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-[#FCFBFA] rounded-[28px] p-6 border border-black/10 shadow-mc-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        booking.status === "completed" ||
                        booking.status === "checked_in"
                          ? "default"
                          : booking.status === "cancelled"
                            ? "signal"
                            : "secondary"
                      }
                    >
                      {booking.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-bold text-[#141413]">
                      Ref: {booking.referenceCode}
                    </span>
                    <span className="text-xs text-[#595550]">
                      Driver: <strong>{booking.driverName}</strong> · Plate:{" "}
                      <strong className="text-[#141413]">
                        {booking.vehiclePlate}
                      </strong>
                    </span>
                  </div>

                  <h3 className="text-lg font-medium text-[#141413]">
                    {booking.listingTitle}
                  </h3>

                  <p className="text-xs text-[#595550]">
                    {formatDateTime(booking.startTime)} →{" "}
                    {formatDateTime(booking.endTime)} ({booking.durationHours}h)
                  </p>

                  <div className="text-xs text-[#595550]">
                    Estimated Net Host Share:{" "}
                    <strong className="text-[#1E7E48]">
                      {formatInr(booking.netHostEarningsInr)}
                    </strong>{" "}
                    <span className="text-[11px] text-[#736E68]">
                      (Pending Settlement · after{" "}
                      {booking.platformCommissionPercent}% fee)
                    </span>
                  </div>
                </div>

                {/* Check-in PIN verifier & Complete controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {booking.status === "confirmed" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        maxLength={4}
                        placeholder={`PIN (${booking.checkinPin})`}
                        value={pinInputs[booking.id] || ""}
                        onChange={(e) =>
                          setPinInputs((prev) => ({
                            ...prev,
                            [booking.id]: e.target.value,
                          }))
                        }
                        className="w-32 h-9 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleVerifyCheckIn(booking)}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Verify Check-In
                      </Button>
                    </div>
                  )}

                  {(booking.status === "confirmed" ||
                    booking.status === "checked_in") && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCompleteReservation(booking)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Completed
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* TAB 3: AVAILABILITY & BLOCKED PERIODS */}
        <TabsContent value="availability" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Block Form */}
            <form
              onSubmit={handleAddBlock}
              className="lg:col-span-5 bg-[#FCFBFA] rounded-[28px] p-6 sm:p-7 border border-black/10 space-y-4"
            >
              <div className="mc-eyebrow">
                <span className="mc-eyebrow-dot" />
                <span>BLOCK UNAVAILABLE DATES</span>
              </div>
              <h3 className="text-xl font-medium text-[#141413]">
                Reserve your space for personal use
              </h3>
              <p className="text-xs text-[#595550]">
                Blocked time slots immediately prevent drivers from booking
                overlapping windows.
              </p>

              <Field>
                <FieldLabel htmlFor="block-listing-select">
                  Select Listing
                </FieldLabel>
                <select
                  id="block-listing-select"
                  value={selectedListingForBlock}
                  onChange={(e) => setSelectedListingForBlock(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413]"
                >
                  {hostListings.map((lst) => (
                    <option key={lst.id} value={lst.id}>
                      {lst.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor="block-start">Start Date & Time</FieldLabel>
                <Input
                  id="block-start"
                  type="datetime-local"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="block-end">End Date & Time</FieldLabel>
                <Input
                  id="block-end"
                  type="datetime-local"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="block-reason">Reason</FieldLabel>
                <Input
                  id="block-reason"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Personal vehicle / Family visit / Maintenance"
                  required
                />
              </Field>

              <Button
                type="submit"
                variant="default"
                className="w-full"
                disabled={addingBlock || hostListings.length === 0}
              >
                <CalendarOff className="w-4 h-4" />
                {addingBlock ? "Blocking Slot..." : "Block Selected Time Slot"}
              </Button>
            </form>

            {/* Existing Blocks List */}
            <div className="lg:col-span-7 bg-[#FCFBFA] rounded-[28px] p-6 sm:p-7 border border-black/10 space-y-4">
              <h3 className="text-xl font-medium text-[#141413]">
                Active Blocked Time Windows
              </h3>
              {hostBlocks.length === 0 ? (
                <p className="text-sm text-[#595550]">
                  No blocked windows right now. Your published listings are
                  bookable during their standard operating hours.
                </p>
              ) : (
                <div className="space-y-3">
                  {hostBlocks.map((blk) => {
                    const lst = hostListings.find(
                      (l) => l.id === blk.listingId
                    );
                    return (
                      <div
                        key={blk.id}
                        className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#F3F0EE] border border-black/8"
                      >
                        <div>
                          <div className="text-sm font-bold text-[#141413]">
                            {lst?.title || blk.listingId}
                          </div>
                          <div className="text-xs text-[#595550]">
                            {formatDateTime(blk.startTime)} →{" "}
                            {formatDateTime(blk.endTime)}
                          </div>
                          <div className="text-xs text-[#CF4500] font-medium mt-0.5">
                            Reason: {blk.reason}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleRemoveBlock(blk.listingId, blk.id)
                          }
                          className="text-[#B91C1C] hover:bg-[#B91C1C]/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Unblock
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
