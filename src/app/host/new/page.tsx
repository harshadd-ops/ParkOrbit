"use client";

import React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { ListingForm } from "@/components/host/ListingForm";

export default function NewHostListingPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 md:px-8 pt-10 md:pt-14">
      <div className="max-w-[760px] mx-auto flex items-center justify-between mb-12">
        <h1 className="text-[18px] font-medium text-slate">List your space</h1>
        <Link
          href="/dashboard/host"
          aria-label="Close and return to dashboard"
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-lifted transition-colors"
        >
          <X className="size-5" />
        </Link>
      </div>
      <ListingForm mode="create" />
    </div>
  );
}
