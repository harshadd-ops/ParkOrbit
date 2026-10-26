"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { X } from "lucide-react";
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
      <div className="mx-auto max-w-[760px] px-5 py-16">
        <div className="h-80 rounded-stadium bg-lifted animate-pulse" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-[760px] px-5 py-32 text-center space-y-6">
        <h1 className="text-[36px]">Listing not found</h1>
        <Link href="/dashboard/host">
          <Button>Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 md:px-8 pt-10 md:pt-14">
      <div className="max-w-[760px] mx-auto flex items-center justify-between gap-4 mb-12">
        <h1 className="text-[18px] font-medium text-slate truncate">Editing {listing.title}</h1>
        <Link
          href="/dashboard/host"
          aria-label="Close and return to dashboard"
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-lifted transition-colors shrink-0"
        >
          <X className="size-5" />
        </Link>
      </div>
      <ListingForm mode="edit" initialListing={listing} />
    </div>
  );
}
