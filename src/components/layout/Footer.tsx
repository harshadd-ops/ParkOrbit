import React from "react";
import Link from "next/link";
import {
  CircleHelp,
  CreditCard,
  Globe,
  MapPin,
  MessageSquare,
} from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-ink text-white pt-16 pb-28 px-6 md:px-16 lg:px-24 mt-24">
      <div className="mx-auto max-w-[1280px]">
        {/* Large conversational H2 per DESIGN-mastercard.md */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-14">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.04em] text-signal-light mb-3">
              <span className="size-2 rounded-full bg-signal-light inline-block" />
              <span>EVERY SPACE IN ORBIT</span>
            </div>
            <h2 className="text-[36px] md:text-[44px] font-medium leading-[1.15] tracking-[-0.02em] text-white">
              We&apos;re always here when you need a trusted space to park.
            </h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/host/new"
              className="inline-flex items-center justify-center rounded-cta bg-white text-ink px-6 py-2.5 text-[15px] font-medium tracking-[-0.02em] hover:bg-canvas transition-colors"
            >
              List Your Driveway ↗
            </Link>
            <Link
              href="/dashboard/driver"
              className="inline-flex items-center justify-center rounded-cta border border-white/40 bg-transparent text-white px-6 py-2.5 text-[15px] font-[450] hover:border-white transition-colors"
            >
              Manage Reservations
            </Link>
          </div>
        </div>

        {/* 4-Column Link Grid per DESIGN-mastercard.md */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-14">
          <div className="flex flex-col gap-3.5">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.04em] text-taupe">
              NEED HELP?
            </h3>
            <Link
              href="/dashboard/driver"
              className="inline-flex items-center gap-2.5 text-[14px] font-[450] text-white/90 hover:text-white"
            >
              <MessageSquare className="size-4 text-signal-light" />
              <span>Driver Check-In & PIN Support ↗</span>
            </Link>
            <Link
              href="/dashboard/host"
              className="inline-flex items-center gap-2.5 text-[14px] font-[450] text-white/90 hover:text-white"
            >
              <CreditCard className="size-4 text-signal-light" />
              <span>Simulated Payments & Refund Policy ↗</span>
            </Link>
            <Link
              href="/#discover"
              className="inline-flex items-center gap-2.5 text-[14px] font-[450] text-white/90 hover:text-white"
            >
              <MapPin className="size-4 text-signal-light" />
              <span>Pune Neighborhood Hubs (KP • Baner • Viman Nagar) ↗</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2.5 text-[14px] font-[450] text-white/90 hover:text-white"
            >
              <CircleHelp className="size-4 text-signal-light" />
              <span>Report a Listing or Safety Issue ↗</span>
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.04em] text-taupe">
              FOR DRIVERS
            </h3>
            <Link
              href="/#discover-search"
              className="text-[14px] font-[450] text-white/85 hover:text-white"
            >
              Hourly & Full-Day Parking
            </Link>
            <Link
              href="/#discover-search"
              className="text-[14px] font-[450] text-white/85 hover:text-white"
            >
              EV Charging Residential Bays
            </Link>
            <Link
              href="/dashboard/driver"
              className="text-[14px] font-[450] text-white/85 hover:text-white"
            >
              Upcoming & Past Bookings
            </Link>
            <Link
              href="/dashboard/driver"
              className="text-[14px] font-[450] text-white/85 hover:text-white"
            >
              Instant Cancellation & Refunds
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.04em] text-taupe">
              FOR PARKING HOSTS
            </h3>
            <Link
              href="/host/new"
              className="text-[14px] font-[450] text-white/85 hover:text-white"
            >
              Publish a Private Driveway
            </Link>
            <Link
              href="/dashboard/host"
              className="text-[14px] font-[450] text-white/85 hover:text-white"
            >
              Host Studio & Availability Blocks
            </Link>
            <Link
              href="/dashboard/host"
              className="text-[14px] font-[450] text-white/85 hover:text-white"
            >
              Transparent Commission Calculator
            </Link>
            <Link
              href="/dashboard/host"
              className="text-[14px] font-[450] text-white/85 hover:text-white"
            >
              Commercial Lot Subscriptions
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.04em] text-taupe">
              TRUST & TRANSPARENCY
            </h3>
            <p className="text-[13px] font-[450] text-taupe leading-relaxed">
              Simulated Test Environment: Payments use a clearly labeled test UPI/Card sandbox. No real funds are charged, and host payouts are displayed honestly as Pending / Estimated.
            </p>
            <Link
              href="/admin"
              className="text-[14px] font-medium text-signal-light hover:underline"
            >
              Open Trust & Moderation Console ↗
            </Link>
          </div>
        </div>

        {/* 1px white-at-30%-opacity divider per DESIGN-mastercard.md */}
        <div className="h-[1px] w-full bg-white/25 my-8" />

        {/* Bottom row: copyright + legal + country-language pill dropdown + 4 social icons */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6 text-[13px] font-[450] text-taupe">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center rounded-md bg-white px-1.5 py-1 shadow-sm">
                <img
                  src="/logo.png"
                  alt="ParkOrbit Logo"
                  width={18}
                  height={22}
                  className="h-5 w-auto object-contain select-none"
                />
              </span>
              <span className="text-white font-medium">
                © 2026 ParkOrbit Marketplace.
              </span>
            </div>
            <span>Privacy Choices</span>
            <span>Terms of Parking Access</span>
            <span>Transparent Fee Guarantee</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Country/language selector pill per DESIGN-mastercard.md */}
            <div className="inline-flex items-center gap-2 rounded-pill border border-white/40 bg-ink px-4 py-1.5 text-[13px] text-white">
              <Globe className="size-3.5 text-signal-light" />
              <span>India (English) • INR ₹</span>
            </div>

            <div className="flex items-center gap-2">
              {["IN", "X", "IG", "YT"].map((net) => (
                <span
                  key={net}
                  className="size-9 rounded-full border border-white/25 inline-flex items-center justify-center text-[11px] font-medium text-white/80"
                >
                  {net}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
