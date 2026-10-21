"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ListingForm } from "@/components/host/ListingForm";
import type { ParkingListing } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function EditHostListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [listing, setListing] = useState<ParkingListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.listing) {
          setListing(data.listing);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12">
        <div className="h-80 rounded-[28px] bg-[#FCFBFA] animate-pulse border border-black/8" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-20 text-center space-y-4">
        <h1 className="text-3xl font-medium text-[#141413]">
          Listing Not Found
        </h1>
        <Link href="/dashboard/host">
          <Button variant="default">Return to Host Studio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div className="space-y-3">
        <Link
          href="/dashboard/host"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#595550] hover:text-[#141413] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Host Studio
        </Link>
        <div className="mc-eyebrow">
          <span className="mc-eyebrow-dot" />
          <span>UPDATE PARKING LISTING</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] text-[#141413]">
          Edit: {listing.title}
        </h1>
        <p className="text-base text-[#595550] max-w-2xl">
          Update pricing, photos, vehicle clearance dimensions, or access
          instructions without recreating your space.
        </p>
      </div>

      <ListingForm mode="edit" initialListing={listing} />
    </div>
  );
}
