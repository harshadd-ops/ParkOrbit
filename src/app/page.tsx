"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  KeyRound,
  LockKeyhole,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, CountUp, useScrollProgress } from "@/components/motion/Reveal";
import { useAuth, DEMO_PERSONAS } from "@/context/AuthContext";
import { CURATED_PARKING_PHOTOS } from "@/lib/seed";
import { cn, formatInr } from "@/lib/utils";
import type { EnrichedListing } from "@/lib/db";

const DriverDiscoveryMap = dynamic(
  () => import("@/components/map/DriverDiscoveryMap").then((m) => m.DriverDiscoveryMap),
  {
    ssr: false,
    loading: () => <div className="w-full h-full rounded-stadium bg-[#E8E2DA] animate-pulse" />,
  }
);

const STEPS = {
  driver: [
    {
      title: "Search where you're going",
      body: "Real spaces with real prices, on a live map of Pune.",
    },
    {
      title: "Book in seconds",
      body: "Pick a time and pay by UPI. Gate instructions unlock instantly.",
    },
    {
      title: "Show your PIN",
      body: "A one-time 4-digit code checks you in. No cash, no haggling.",
    },
  ],
  host: [
    {
      title: "List in three minutes",
      body: "Drop a pin, add a photo, set your hourly price.",
    },
    {
      title: "Stay in control",
      body: "Pause anytime, or block the hours you need your spot back.",
    },
    {
      title: "Get paid",
      body: "Verify the driver's PIN on arrival. Earnings show up in your dashboard.",
    },
  ],
};

const TRUST = [
  {
    icon: LockKeyhole,
    title: "Gate codes stay private",
    body: "Bay numbers and access codes only unlock after a confirmed booking.",
  },
  {
    icon: KeyRound,
    title: "PIN check-in",
    body: "Every booking gets a one-time PIN that the host verifies at the gate.",
  },
  {
    icon: BadgeCheck,
    title: "Reviewed by people",
    body: "Any listing can be reported. Our trust team can pull it from search in one click.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { currentUser, switchUser, config } = useAuth();
  const [listings, setListings] = useState<EnrichedListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<"driver" | "host">("driver");
  const [rate, setRate] = useState(60);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const hero = useScrollProgress<HTMLDivElement>();

  useEffect(() => {
    fetch("/api/listings")
      .then((res) => res.json())
      .then((data) => setListings(data.listings || []))
      .catch(() => setListings([]));
  }, []);

  const stats = useMemo(() => {
    const localities = new Set(listings.map((l) => l.locality.split(" ")[0]));
    const minRate = listings.length ? Math.min(...listings.map((l) => l.hourlyRateInr)) : 0;
    return { spaces: listings.length, localities: localities.size, minRate };
  }, [listings]);

  const commission = config?.commissionRatePercent ?? 12;
  const monthlyEarnings = Math.round(rate * hoursPerDay * 22 * (1 - commission / 100));

  // Demo shortcut: become the right persona, then open that role's home
  const goAs = async (role: "driver" | "host", path: string) => {
    const persona = DEMO_PERSONAS.find((p) => p.role === role);
    if (persona && currentUser?.id !== persona.id) {
      const switched = await switchUser(persona.id);
      if (!switched) return;
    }
    router.push(path);
    router.refresh();
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/find?q=${encodeURIComponent(q)}` : "/find");
  };

  const parallax = hero.progress * 80;

  return (
    <div className="overflow-x-hidden">
      {/* ── 1. Hero ─────────────────────────────────────────── */}
      <section
        ref={hero.ref}
        className="relative mx-auto max-w-[1200px] px-5 md:px-8 pt-16 md:pt-24 pb-24 md:pb-32 grid lg:grid-cols-[1.05fr_1fr] gap-16 items-center"
      >
        <div>
          <Reveal>
            <div className="mc-eyebrow">
              <span className="mc-eyebrow-dot" />
              <span>Peer-to-peer parking · Pune</span>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 text-[46px] md:text-[64px] lg:text-[72px] leading-[0.98] tracking-[-0.03em]">
              Park in someone&apos;s empty spot.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 text-[18px] md:text-[20px] leading-[1.45] text-granite max-w-[30rem]">
              ParkOrbit turns idle driveways and society parking bays into
              spots you can book by the hour, with a PIN at the gate.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <form
              onSubmit={submitSearch}
              className="mt-10 flex items-center gap-2 rounded-pill bg-white p-2 pl-6 shadow-halo max-w-[30rem]"
            >
              <Search className="size-5 text-slate shrink-0" />
              <label htmlFor="hero-search" className="sr-only">Where are you going?</label>
              <input
                id="hero-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where are you going?"
                className="flex-1 min-w-0 bg-transparent text-[16px] placeholder:text-slate focus:outline-none"
              />
              <Button type="submit" className="rounded-pill">
                Find parking
              </Button>
            </form>
          </Reveal>
          <Reveal delay={320}>
            <button
              type="button"
              onClick={() => goAs("host", "/host/new")}
              className="mt-6 inline-flex items-center gap-1.5 text-[16px] font-medium text-ink border-b border-ink/30 hover:border-ink pb-0.5 transition-colors"
            >
              Have an empty spot? List it
              <ArrowRight className="size-4" />
            </button>
          </Reveal>
        </div>

        {/* Orbit composition */}
        <div className="relative h-[420px] md:h-[520px]" aria-hidden="true">
          <svg
            viewBox="0 0 520 520"
            className="absolute inset-0 w-full h-full overflow-visible"
            fill="none"
          >
            <path
              id="hero-orbit"
              d="M 40 300 C 40 120, 480 60, 490 240 C 500 420, 120 500, 40 300 Z"
              stroke="#F37338"
              strokeWidth="1.25"
              pathLength={1}
              className="orbit-draw"
            />
            <circle r="5" fill="#F37338">
              <animateMotion dur="14s" repeatCount="indefinite" rotate="auto">
                <mpath href="#hero-orbit" />
              </animateMotion>
            </circle>
          </svg>

          <div
            className="absolute left-1/2 top-1/2 size-[280px] md:size-[340px] -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `translate(-50%, calc(-50% + ${parallax * 0.4}px))` }}
          >
            <Reveal variant="scale" className="size-full">
              <div className="relative size-full">
                <img
                  src={CURATED_PARKING_PHOTOS[2].url}
                  alt=""
                  className="size-full rounded-full object-cover shadow-halo"
                />
                <span className="mc-satellite-cta absolute bottom-3 right-3">
                  <ArrowUpRight className="size-5" />
                </span>
              </div>
            </Reveal>
          </div>

          <div
            className="absolute left-0 md:left-2 top-6 md:top-10"
            style={{ transform: `translateY(${-parallax * 0.6}px)` }}
          >
            <div className="float-slow">
              <Reveal delay={500}>
                <div className="rounded-pill bg-white px-5 py-3 shadow-halo">
                  <div className="text-[12px] text-slate">Koregaon Park</div>
                  <div className="text-[16px] font-medium">₹75/hr · covered</div>
                </div>
              </Reveal>
            </div>
          </div>

          <div
            className="absolute right-0 bottom-10 md:bottom-16"
            style={{ transform: `translateY(${-parallax}px)` }}
          >
            <div className="float-slower">
              <Reveal delay={700}>
                <div className="flex items-center gap-3 rounded-pill bg-ink text-canvas pl-2 pr-5 py-2 shadow-halo">
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#F37338] text-ink text-[13px] font-bold">
                    ✓
                  </span>
                  <div>
                    <div className="text-[12px] text-canvas/60">Gate PIN</div>
                    <div className="text-[16px] font-medium tracking-[0.2em]">4 8 2 9</div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          <div
            className="absolute right-6 top-4 size-24 md:size-28"
            style={{ transform: `translateY(${parallax * 0.9}px)` }}
          >
            <Reveal delay={600} variant="scale" className="size-full">
              <img
                src={CURATED_PARKING_PHOTOS[0].url}
                alt=""
                className="size-full rounded-full object-cover shadow-halo"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 2. Problem ──────────────────────────────────────── */}
      <section className="relative py-24 md:py-36">
        <div
          className="mc-watermark absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap text-[120px] md:text-[220px]"
          aria-hidden="true"
        >
          Circling.
        </div>
        <div className="relative mx-auto max-w-[1200px] px-5 md:px-8 grid lg:grid-cols-2 gap-12 lg:gap-24 items-end">
          <Reveal>
            <h2 className="text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.025em]">
              Drivers circle the block. Driveways sit empty all day.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-[18px] leading-[1.55] text-granite">
              Offices, cafés and colleges fill up by 10am. Meanwhile, private
              spots in housing societies, bungalows and office basements stay
              empty for hours. ParkOrbit is the marketplace that connects the two.
            </p>
          </Reveal>
        </div>

        <div className="relative mx-auto max-w-[1200px] px-5 md:px-8 mt-20 grid grid-cols-3 gap-6">
          {[
            { value: stats.spaces, label: "spaces live in this demo" },
            { value: stats.localities, label: "Pune neighbourhoods" },
            { value: stats.minRate, label: "lowest hourly price", prefix: "₹" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 120} className="border-t border-ink/15 pt-6">
              <div className="text-[40px] md:text-[64px] font-medium tracking-[-0.03em] leading-none">
                {stats.spaces ? <CountUp value={s.value} prefix={s.prefix} /> : "—"}
              </div>
              <div className="mt-3 text-[14px] md:text-[16px] text-slate">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 3. How it works ─────────────────────────────────── */}
      <section id="how" className="scroll-mt-28 py-24 md:py-32 bg-lifted">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <Reveal>
              <div className="mc-eyebrow">
                <span className="mc-eyebrow-dot" />
                <span>How it works</span>
              </div>
              <h2 className="mt-5 text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.025em]">
                Three steps, either side.
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <div className="inline-flex rounded-pill bg-canvas p-1.5" role="tablist">
                {(["driver", "host"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="tab"
                    aria-selected={audience === a}
                    onClick={() => setAudience(a)}
                    className={cn(
                      "rounded-pill px-5 py-2.5 text-[15px] font-medium transition-all duration-300",
                      audience === a ? "bg-ink text-canvas" : "text-ink/70 hover:text-ink"
                    )}
                  >
                    {a === "driver" ? "I need parking" : "I have a spot"}
                  </button>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="relative mt-20">
            <svg
              className="hidden md:block absolute left-0 right-0 top-8 w-full h-24 pointer-events-none"
              viewBox="0 0 1000 100"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                key={audience}
                d="M 60 30 C 250 110, 420 -40, 500 30 S 780 110, 940 30"
                stroke="#F37338"
                strokeWidth="1.25"
                pathLength={1}
                className="orbit-draw"
              />
            </svg>
            <ol key={audience} className="relative grid md:grid-cols-3 gap-14 md:gap-10">
              {STEPS[audience].map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 140}>
                  <div className="inline-flex size-16 items-center justify-center rounded-full bg-white text-[22px] font-medium shadow-halo">
                    {i + 1}
                  </div>
                  <h3 className="mt-8 text-[24px] leading-[1.2]">{step.title}</h3>
                  <p className="mt-3 text-[16px] text-slate leading-[1.5] max-w-xs">{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── 4. Live map ─────────────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <Reveal>
              <div className="mc-eyebrow">
                <span className="mc-eyebrow-dot" />
                <span>Live</span>
              </div>
              <h2 className="mt-5 text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.025em]">
                Open spots in Pune, right now.
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <Link href="/find">
                <Button variant="secondary">
                  Open the full map
                  <ArrowRight />
                </Button>
              </Link>
            </Reveal>
          </div>
          <Reveal variant="scale" delay={150} className="mt-12">
            <DriverDiscoveryMap
              listings={listings}
              selectedId={selectedId}
              onSelect={setSelectedId}
              className="h-[460px] md:h-[600px] shadow-halo"
            />
          </Reveal>
        </div>
      </section>

      {/* ── 5. Trust ────────────────────────────────────────── */}
      <section id="trust" className="scroll-mt-28 py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <Reveal className="max-w-2xl">
            <div className="mc-eyebrow">
              <span className="mc-eyebrow-dot" />
              <span>Trust & safety</span>
            </div>
            <h2 className="mt-5 text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.025em]">
              Strangers, made safe to share with.
            </h2>
          </Reveal>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {TRUST.map((item, i) => (
              <Reveal key={item.title} delay={i * 120} className="rounded-stadium bg-lifted p-8 md:p-10">
                <div className="inline-flex size-14 items-center justify-center rounded-full bg-canvas">
                  <item.icon className="size-6" strokeWidth={1.6} />
                </div>
                <h3 className="mt-10 text-[24px] leading-[1.2]">{item.title}</h3>
                <p className="mt-3 text-[16px] text-slate leading-[1.5]">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Host earnings ────────────────────────────────── */}
      <section className="px-4 md:px-6 py-12">
        <Reveal variant="scale">
          <div className="mx-auto max-w-[1280px] rounded-stadium bg-ink text-canvas px-6 py-16 md:px-16 md:py-24 grid lg:grid-cols-2 gap-16 items-center overflow-hidden relative">
            <div className="relative">
              <div className="mc-eyebrow text-canvas">
                <span className="mc-eyebrow-dot" />
                <span>For hosts</span>
              </div>
              <h2 className="mt-5 text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.025em] text-canvas">
                What could your spot earn?
              </h2>
              <div className="mt-12 space-y-8 max-w-md">
                <label className="block">
                  <div className="flex justify-between text-[15px]">
                    <span className="text-canvas/70">Hourly price</span>
                    <span className="font-medium">{formatInr(rate)}/hr</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={150}
                    step={5}
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="mt-3 w-full accent-[#F37338]"
                  />
                </label>
                <label className="block">
                  <div className="flex justify-between text-[15px]">
                    <span className="text-canvas/70">Hours booked per day</span>
                    <span className="font-medium">{hoursPerDay} hrs</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={14}
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Number(e.target.value))}
                    className="mt-3 w-full accent-[#F37338]"
                  />
                </label>
              </div>
            </div>

            <div className="relative flex flex-col items-start lg:items-center">
              <svg
                viewBox="0 0 400 400"
                className="absolute -inset-10 w-[calc(100%+5rem)] h-[calc(100%+5rem)] spin-orbit opacity-60"
                fill="none"
                aria-hidden="true"
              >
                <ellipse cx="200" cy="200" rx="190" ry="120" stroke="#F37338" strokeWidth="1" />
              </svg>
              <div className="relative text-[13px] uppercase tracking-[0.06em] font-bold text-canvas/60">
                Estimated per month
              </div>
              <div className="relative mt-3 text-[64px] md:text-[96px] font-medium tracking-[-0.04em] leading-none tabular-nums">
                {formatInr(monthlyEarnings)}
              </div>
              <div className="relative mt-4 text-[14px] text-canvas/60">
                22 days · after {commission}% ParkOrbit fee
              </div>
              <Button
                variant="secondary"
                className="relative mt-10 bg-canvas border-canvas"
                onClick={() => goAs("host", "/host/new")}
              >
                List your space
                <ArrowRight />
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 7. Try it ───────────────────────────────────────── */}
      <section className="py-24 md:py-36">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <Reveal className="text-center">
            <h2 className="text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.025em]">
              See it from both sides.
            </h2>
            <p className="mt-4 text-[18px] text-slate">
              Two demo accounts, one live marketplace.
            </p>
          </Reveal>

          <div className="mt-20 grid md:grid-cols-2 gap-20 md:gap-10">
            {[
              {
                role: "driver" as const,
                path: "/find",
                eyebrow: "Driver",
                title: "Book a spot as Aarav",
                photo: CURATED_PARKING_PHOTOS[4].url,
                offset: "",
              },
              {
                role: "host" as const,
                path: "/dashboard/host",
                eyebrow: "Host",
                title: "Run a space as Neha",
                photo: CURATED_PARKING_PHOTOS[5].url,
                offset: "md:mt-28",
              },
            ].map((card, i) => (
              <Reveal key={card.role} delay={i * 150} className={cn("flex flex-col items-center", card.offset)}>
                <button
                  type="button"
                  onClick={() => goAs(card.role, card.path)}
                  className="group relative size-[240px] md:size-[300px]"
                  aria-label={card.title}
                >
                  <img
                    src={card.photo}
                    alt=""
                    className="size-full rounded-full object-cover shadow-halo transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <span className="mc-satellite-cta absolute bottom-4 right-2">
                    <ArrowRight className="size-5" />
                  </span>
                </button>
                <div className="mc-eyebrow mt-10">
                  <span className="mc-eyebrow-dot" />
                  <span>{card.eyebrow}</span>
                </div>
                <h3 className="mt-3 text-[24px]">{card.title}</h3>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
