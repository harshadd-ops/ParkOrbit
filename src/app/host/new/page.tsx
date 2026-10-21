"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ListingForm } from "@/components/host/ListingForm";

export default function NewHostListingPage() {
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
          <span>HOST ONBOARDING WIZARD</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] text-[#141413]">
          List your parking space on ParkOrbit
        </h1>
        <p className="text-base text-[#595550] max-w-2xl">
          Turn your unused driveway, apartment bay, or commercial parking spot
          into dependable income. Publish immediately or save as a draft.
        </p>
      </div>

      <ListingForm mode="create" />
    </div>
  );
}
