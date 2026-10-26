"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Switch } from "@/components/ui/primitives";
import { CURATED_PARKING_PHOTOS } from "@/lib/seed";
import { SPACE_TYPE_LABELS, VEHICLE_LABELS, POLICY_LABELS } from "@/lib/labels";
import type { ParkingListing, SpaceType, VehicleType, CancellationPolicy } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";

// Leaflet needs window, so the picker only ever renders on the client
const HostLocationPicker = dynamic(
  () => import("@/components/map/HostLocationPicker").then((mod) => mod.HostLocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[420px] rounded-stadium bg-[#E8E2DA] flex items-center justify-center">
        <MapPin className="size-6 text-slate animate-bounce" />
      </div>
    ),
  }
);

const STEPS = ["Location", "The space", "Price", "Access"] as const;

const COMMON_AMENITIES = [
  "24/7 CCTV Surveillance",
  "Security Guard on Duty",
  "Covered Roof Protection",
  "15A EV Charging Point",
  "Automated Boom Barrier",
  "Well-Lit Night Access",
  "Gated Compound",
];

interface ListingFormProps {
  initialListing?: Partial<ParkingListing>;
  mode: "create" | "edit";
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill px-4 py-2.5 text-[14px] font-medium transition-colors",
        active ? "bg-ink text-canvas" : "bg-canvas text-ink hover:bg-[#E8E2DA]"
      )}
    >
      {children}
    </button>
  );
}

export function ListingForm({ initialListing, mode }: ListingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState(initialListing?.title || "");
  const [description, setDescription] = useState(initialListing?.description || "");
  const [address, setAddress] = useState(initialListing?.address || "");
  const [locality, setLocality] = useState(initialListing?.locality || "Koregaon Park");
  const [landmark, setLandmark] = useState(initialListing?.landmark || "North Main Road & Lane 5");
  const [city, setCity] = useState(initialListing?.city || "Pune");
  const [state] = useState("Maharashtra");
  const [pincode, setPincode] = useState("411001");
  const [latitude, setLatitude] = useState<number>(initialListing?.latitude ?? 18.5362);
  const [longitude, setLongitude] = useState<number>(initialListing?.longitude ?? 73.8940);

  const [spaceType, setSpaceType] = useState<SpaceType>(initialListing?.spaceType || "covered");
  const [selectedPhoto, setSelectedPhoto] = useState<string>(
    initialListing?.photos?.[0]?.url || CURATED_PARKING_PHOTOS[0].url
  );
  const [supportedVehicles, setSupportedVehicles] = useState<VehicleType[]>(
    initialListing?.vehicleTypes || ["hatchback", "sedan"]
  );
  const [lengthFt, setLengthFt] = useState<number>(initialListing?.dimensions?.lengthFt ?? 17);
  const [widthFt, setWidthFt] = useState<number>(initialListing?.dimensions?.widthFt ?? 9);
  const [heightFt, setHeightFt] = useState<string>(
    initialListing?.dimensions?.heightClearanceFt != null
      ? String(initialListing.dimensions.heightClearanceFt)
      : "7.5"
  );

  const [pricePerHour, setPricePerHour] = useState<number>(initialListing?.hourlyRateInr ?? 60);
  const [pricePerDay, setPricePerDay] = useState<number>(initialListing?.dailyRateInr ?? 420);
  const pricePerMonth = initialListing?.monthlyRateInr ?? 5200;

  const [amenities, setAmenities] = useState<string[]>(
    initialListing?.amenities || ["24/7 CCTV Surveillance", "Covered Roof Protection"]
  );
  const [rulesText, setRulesText] = useState<string>(
    (
      initialListing?.parkingRules || [
        "Park strictly within designated bay lines",
        "No horn or loud idling inside residential gate",
      ]
    ).join("\n")
  );
  const [accessInstructions, setAccessInstructions] = useState<string>(
    initialListing?.accessInstructions ||
      "Show your 4-digit ParkOrbit check-in code at the main gate."
  );
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy>(
    initialListing?.cancellationPolicy || "flexible"
  );
  const [is24Hours, setIs24Hours] = useState<boolean>(initialListing?.openingHours?.is24Hours ?? true);
  const [openingTime, setOpeningTime] = useState<string>(initialListing?.openingHours?.open || "06:00");
  const [closingTime, setClosingTime] = useState<string>(initialListing?.openingHours?.close || "23:00");
  const minNoticeMinutes = initialListing?.minNoticeMinutes ?? 15;

  const [submittingStatus, setSubmittingStatus] = useState<"draft" | "published" | null>(null);

  const toggle = <T,>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  // Returns an error message for the step, or null when it's complete
  const stepError = (i: number): string | null => {
    if (i === 0 && (!address.trim() || !locality.trim() || !city.trim()))
      return "Add the street address so drivers can find you.";
    if (i === 1 && title.trim().length < 5) return "Give your space a name (at least 5 characters).";
    if (i === 1 && supportedVehicles.length === 0) return "Pick at least one vehicle that fits.";
    if (i === 2 && (pricePerHour <= 0 || pricePerDay <= 0)) return "Prices must be more than ₹0.";
    return null;
  };

  const goNext = () => {
    const err = stepError(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (targetStatus: "draft" | "published") => {
    if (targetStatus === "published") {
      for (let i = 0; i < STEPS.length; i++) {
        const err = stepError(i);
        if (err) {
          setStep(i);
          toast.error(err);
          return;
        }
      }
    }

    setSubmittingStatus(targetStatus);
    try {
      const payload = {
        title: title.trim() || "Untitled parking space (draft)",
        subtitle: `${SPACE_TYPE_LABELS[spaceType]} in ${locality.trim() || city.trim()}`,
        description:
          description.trim() || "Private parking space available for reservation on ParkOrbit.",
        address: address.trim(),
        locality: locality.trim(),
        landmark: landmark.trim() || `${locality} Main Road`,
        city: city.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        spaceType,
        photos: [selectedPhoto, CURATED_PARKING_PHOTOS[1].url].map((url, idx) => ({
          id: `ph-custom-${idx + 1}`,
          url,
          caption: idx === 0 ? "Primary space view" : "Access lane view",
          isPrimary: idx === 0,
        })),
        vehicleTypes: supportedVehicles.length > 0 ? supportedVehicles : ["sedan"],
        dimensions: {
          lengthFt: Number(lengthFt) || 16,
          widthFt: Number(widthFt) || 8.5,
          heightClearanceFt: heightFt.trim() ? Number(heightFt) : 8.5,
        },
        hourlyRateInr: Number(pricePerHour) || 50,
        dailyRateInr: Number(pricePerDay) || 350,
        monthlyRateInr: Number(pricePerMonth) || 4500,
        amenities,
        parkingRules: rulesText
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
        restrictions: heightFt.trim()
          ? `Max clearance height ${heightFt.trim()} ft.`
          : "Open top clearance.",
        accessInstructions: accessInstructions.trim(),
        cancellationPolicy,
        openingHours: { open: openingTime, close: closingTime, is24Hours },
        minNoticeMinutes,
        status: targetStatus,
      };

      const url =
        mode === "edit" && initialListing?.id ? `/api/listings/${initialListing.id}` : "/api/listings";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't save your space.");
        return;
      }

      toast.success(targetStatus === "draft" ? "Saved as a draft." : "Your space is live! Drivers can book it now.");
      router.push("/dashboard/host");
      router.refresh();
    } catch {
      toast.error("Network error while saving.");
    } finally {
      setSubmittingStatus(null);
    }
  };

  const estimatedMonthlyNet = Math.round(pricePerHour * 8 * 22 * 0.88);
  const isLast = step === STEPS.length - 1;

  return (
    <div className="max-w-[760px] mx-auto">
      {/* Progress */}
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => (i <= step || mode === "edit" ? setStep(i) : goNext())}
              className="w-full text-left group"
              aria-current={i === step ? "step" : undefined}
            >
              <div className="h-1 rounded-full bg-[#E8E2DA] overflow-hidden">
                <div
                  className="h-full bg-ink transition-all duration-500 ease-out"
                  style={{ width: i <= step ? "100%" : "0%" }}
                />
              </div>
              <div
                className={cn(
                  "mt-3 text-[13px] md:text-[14px] transition-colors",
                  i === step ? "text-ink font-medium" : "text-slate group-hover:text-ink"
                )}
              >
                {label}
              </div>
            </button>
          </li>
        ))}
      </ol>

      <div key={step} className="mt-14 animate-in fade-in slide-in-from-bottom-3 duration-500">
        {step === 0 && (
          <section className="space-y-8">
            <div>
              <h2 className="text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.025em]">
                Where is your spot?
              </h2>
              <p className="mt-2 text-[16px] text-slate">
                Pick your area, then drag the pin onto the exact entrance.
              </p>
            </div>
            <HostLocationPicker
              latitude={latitude}
              longitude={longitude}
              locality={locality}
              city={city}
              onChange={({ latitude: lat, longitude: lng, locality: loc, landmark: lm, city: c, pincode: pin }) => {
                setLatitude(lat);
                setLongitude(lng);
                if (loc) setLocality(loc);
                if (lm) setLandmark(lm);
                if (c) setCity(c);
                if (pin) setPincode(pin);
              }}
            />
            <div className="grid sm:grid-cols-2 gap-5">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="listing-address">Street address</FieldLabel>
                <Input
                  id="listing-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Bungalow 14, Lane 7, Koregaon Park"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="listing-locality">Area</FieldLabel>
                <Input id="listing-locality" value={locality} onChange={(e) => setLocality(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="listing-landmark">Nearby landmark</FieldLabel>
                <Input id="listing-landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
              </Field>
            </div>
            <p className="text-[13px] text-slate">
              {city}, {state} · {pincode}
            </p>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-10">
            <div>
              <h2 className="text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.025em]">
                Tell drivers about it
              </h2>
              <p className="mt-2 text-[16px] text-slate">A clear name and photo get the most bookings.</p>
            </div>

            <Field>
              <FieldLabel htmlFor="listing-title">Name your space</FieldLabel>
              <Input
                id="listing-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Covered driveway near Koregaon Park Lane 7"
              />
            </Field>

            <div>
              <div className="text-[14px] font-medium mb-3">Photo</div>
              <div className="flex flex-wrap gap-3">
                {CURATED_PARKING_PHOTOS.map((photo, idx) => (
                  <button
                    key={photo.url}
                    type="button"
                    onClick={() => setSelectedPhoto(photo.url)}
                    aria-label={`Use photo ${idx + 1}`}
                    aria-pressed={selectedPhoto === photo.url}
                    className={cn(
                      "relative size-20 rounded-full overflow-hidden transition-all",
                      selectedPhoto === photo.url
                        ? "ring-[3px] ring-ink ring-offset-4 ring-offset-canvas"
                        : "opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={photo.url} alt={photo.caption} className="size-full object-cover" />
                    {selectedPhoto === photo.url && (
                      <span className="absolute inset-0 flex items-center justify-center bg-ink/30">
                        <Check className="size-6 text-white" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[14px] font-medium mb-3">Type of space</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SPACE_TYPE_LABELS) as SpaceType[]).map((t) => (
                  <Choice key={t} active={spaceType === t} onClick={() => setSpaceType(t)}>
                    {SPACE_TYPE_LABELS[t]}
                  </Choice>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[14px] font-medium mb-3">What fits?</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(VEHICLE_LABELS) as VehicleType[]).map((v) => (
                  <Choice
                    key={v}
                    active={supportedVehicles.includes(v)}
                    onClick={() => setSupportedVehicles((prev) => toggle(prev, v))}
                  >
                    {VEHICLE_LABELS[v]}
                  </Choice>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="dim-length">Length (ft)</FieldLabel>
                <Input id="dim-length" type="number" step="0.5" value={lengthFt} onChange={(e) => setLengthFt(Number(e.target.value))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="dim-width">Width (ft)</FieldLabel>
                <Input id="dim-width" type="number" step="0.5" value={widthFt} onChange={(e) => setWidthFt(Number(e.target.value))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="dim-height">Height (ft)</FieldLabel>
                <Input id="dim-height" type="number" step="0.5" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} placeholder="Open" />
              </Field>
            </div>

            <div>
              <div className="text-[14px] font-medium mb-3">Extras</div>
              <div className="flex flex-wrap gap-2">
                {COMMON_AMENITIES.map((a) => (
                  <Choice key={a} active={amenities.includes(a)} onClick={() => setAmenities((prev) => toggle(prev, a))}>
                    {a}
                  </Choice>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-10">
            <div>
              <h2 className="text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.025em]">
                Set your price
              </h2>
              <p className="mt-2 text-[16px] text-slate">Most Pune spaces charge ₹45–₹90 an hour.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field>
                <FieldLabel htmlFor="price-hour">Per hour (₹)</FieldLabel>
                <Input id="price-hour" type="number" min="10" value={pricePerHour} onChange={(e) => setPricePerHour(Number(e.target.value))} className="text-[20px] h-14" />
              </Field>
              <Field>
                <FieldLabel htmlFor="price-day">Per day (₹)</FieldLabel>
                <Input id="price-day" type="number" min="50" value={pricePerDay} onChange={(e) => setPricePerDay(Number(e.target.value))} className="text-[20px] h-14" />
                <FieldDescription>Charged instead of hourly for long stays.</FieldDescription>
              </Field>
            </div>

            <div className="rounded-stadium bg-ink text-canvas p-8 md:p-10">
              <div className="text-[13px] uppercase tracking-[0.06em] font-bold text-canvas/50">
                You could earn
              </div>
              <div className="mt-3 text-[48px] md:text-[56px] font-medium tracking-[-0.03em] leading-none tabular-nums">
                {formatInr(estimatedMonthlyNet)}
                <span className="text-[18px] text-canvas/60"> / month</span>
              </div>
              <div className="mt-3 text-[14px] text-canvas/60">
                If booked 8 hours a day, 22 days a month, after the 12% ParkOrbit fee.
              </div>
            </div>

            <label className="flex items-center justify-between gap-6 rounded-stadium bg-lifted px-6 py-5 cursor-pointer">
              <div>
                <div className="text-[16px] font-medium">Open 24 hours</div>
                <div className="text-[14px] text-slate">Turn off to set opening hours.</div>
              </div>
              <Switch checked={is24Hours} onCheckedChange={setIs24Hours} aria-label="Open 24 hours" />
            </label>
            {!is24Hours && (
              <div className="grid grid-cols-2 gap-5">
                <Field>
                  <FieldLabel htmlFor="opening-time">Opens</FieldLabel>
                  <Input id="opening-time" type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="closing-time">Closes</FieldLabel>
                  <Input id="closing-time" type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
                </Field>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="space-y-10">
            <div>
              <h2 className="text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.025em]">
                How do drivers get in?
              </h2>
              <p className="mt-2 text-[16px] text-slate">The last step before you go live.</p>
            </div>

            <Field>
              <FieldLabel htmlFor="listing-access">Gate & entry instructions</FieldLabel>
              <Textarea
                id="listing-access"
                value={accessInstructions}
                onChange={(e) => setAccessInstructions(e.target.value)}
                placeholder="Gate code, bay number, who to call…"
              />
              <FieldDescription className="flex items-center gap-1.5">
                <LockKeyhole className="size-3.5" />
                Private. Only shown to drivers after they book.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="listing-rules">House rules (one per line)</FieldLabel>
              <Textarea id="listing-rules" value={rulesText} onChange={(e) => setRulesText(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel htmlFor="listing-description">Anything else? (optional)</FieldLabel>
              <Textarea
                id="listing-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lighting, security guard, walking distance to the metro…"
              />
            </Field>

            <div>
              <div className="text-[14px] font-medium mb-3">Cancellations</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(POLICY_LABELS) as CancellationPolicy[]).map((p) => (
                  <Choice key={p} active={cancellationPolicy === p} onClick={() => setCancellationPolicy(p)}>
                    {POLICY_LABELS[p].title.replace(" cancellation", "")}
                  </Choice>
                ))}
              </div>
              <p className="mt-3 text-[14px] text-slate">{POLICY_LABELS[cancellationPolicy].detail}</p>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-5 rounded-stadium bg-white p-5 shadow-halo">
              <img src={selectedPhoto} alt="" className="size-20 rounded-full object-cover shrink-0" />
              <div className="min-w-0">
                <div className="text-[17px] font-medium truncate">{title || "Your space"}</div>
                <div className="text-[14px] text-slate">
                  {locality} · {formatInr(pricePerHour)}/hr · {SPACE_TYPE_LABELS[spaceType]}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-14 pt-8 border-t border-ink/10 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft />
            Back
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {(isLast || mode === "edit") && (
            <Button
              variant="secondary"
              disabled={submittingStatus !== null}
              onClick={() => handleSubmit("draft")}
            >
              {submittingStatus === "draft" ? "Saving…" : "Save draft"}
            </Button>
          )}
          {isLast ? (
            <Button disabled={submittingStatus !== null} onClick={() => handleSubmit("published")}>
              {submittingStatus === "published" ? "Publishing…" : mode === "edit" ? "Save & publish" : "Publish"}
              <ArrowRight />
            </Button>
          ) : (
            <Button onClick={goNext}>
              Next
              <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
