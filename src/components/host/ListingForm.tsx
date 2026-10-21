"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// Dynamic import of HostLocationPicker with SSR disabled to guarantee zero SSR 'window is not defined' errors
const HostLocationPicker = dynamic(
  () =>
    import("@/components/map/HostLocationPicker").then(
      (mod) => mod.HostLocationPicker
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[360px] rounded-[24px] bg-[#F3F0EE] border border-black/8 flex flex-col items-center justify-center text-[#595550] gap-3">
        <MapPin className="w-8 h-8 text-[#F37338] animate-bounce" />
        <p className="text-sm font-medium">
          Loading interactive Pune map picker...
        </p>
      </div>
    ),
  }
);
import {
  MapPin,
  Car,
  IndianRupee,
  Clock,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Save,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Input,
  Textarea,
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { CURATED_PARKING_PHOTOS, URBAN_HUBS } from "@/lib/seed";
import type { ParkingListing, SpaceType, VehicleType, CancellationPolicy } from "@/lib/types";
import { formatInr } from "@/lib/utils";
import { toast } from "sonner";

const SPACE_TYPE_LABELS_SHORT: Record<SpaceType, string> = {
  covered: "Covered",
  uncovered: "Open",
  driveway: "Driveway",
  dedicated_private: "Dedicated Private",
  commercial_lot: "Commercial Deck",
};

const ALL_VEHICLES: Array<{ id: VehicleType; label: string }> = [
  { id: "two_wheeler", label: "Two-Wheeler / Bike" },
  { id: "hatchback", label: "Compact / Hatchback" },
  { id: "sedan", label: "Sedan" },
  { id: "suv", label: "SUV / Crossover" },
  { id: "ev", label: "EV Car (Charging)" },
];

const COMMON_AMENITIES = [
  "24/7 CCTV Surveillance",
  "Security Guard on Duty",
  "Covered Roof Protection",
  "15A EV Charging Point",
  "Automated Boom Barrier",
  "Well-Lit Night Access",
  "Wide Turning Radius",
  "Gated Compound",
];

interface ListingFormProps {
  initialListing?: Partial<ParkingListing>;
  mode: "create" | "edit";
}

export function ListingForm({ initialListing, mode }: ListingFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialListing?.title || "");
  const [description, setDescription] = useState(
    initialListing?.description || ""
  );
  const [address, setAddress] = useState(initialListing?.address || "");
  const [locality, setLocality] = useState(
    initialListing?.locality || "Koregaon Park"
  );
  const [landmark, setLandmark] = useState(
    initialListing?.landmark || "North Main Road & Lane 5"
  );
  const [city, setCity] = useState(initialListing?.city || "Pune");
  const [state, setState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("411001");
  const [latitude, setLatitude] = useState<number>(
    initialListing?.latitude ?? 18.5362
  );
  const [longitude, setLongitude] = useState<number>(
    initialListing?.longitude ?? 73.8940
  );

  const [spaceType, setSpaceType] = useState<SpaceType>(
    initialListing?.spaceType || "covered"
  );
  const [selectedPhoto, setSelectedPhoto] = useState<string>(
    initialListing?.photos?.[0]?.url || CURATED_PARKING_PHOTOS[0].url
  );
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");

  const [supportedVehicles, setSupportedVehicles] = useState<VehicleType[]>(
    initialListing?.vehicleTypes || ["hatchback", "sedan"]
  );
  const [lengthFt, setLengthFt] = useState<number>(
    initialListing?.dimensions?.lengthFt ?? 17
  );
  const [widthFt, setWidthFt] = useState<number>(
    initialListing?.dimensions?.widthFt ?? 9
  );
  const [heightFt, setHeightFt] = useState<string>(
    initialListing?.dimensions?.heightClearanceFt != null
      ? String(initialListing.dimensions.heightClearanceFt)
      : "7.5"
  );

  const [pricePerHour, setPricePerHour] = useState<number>(
    initialListing?.hourlyRateInr ?? 60
  );
  const [pricePerDay, setPricePerDay] = useState<number>(
    initialListing?.dailyRateInr ?? 420
  );
  const [pricePerMonth, setPricePerMonth] = useState<number>(
    initialListing?.monthlyRateInr ?? 5200
  );

  const [amenities, setAmenities] = useState<string[]>(
    initialListing?.amenities || [
      "24/7 CCTV Surveillance",
      "Covered Roof Protection",
    ]
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

  const [cancellationPolicy, setCancellationPolicy] =
    useState<CancellationPolicy>(
      initialListing?.cancellationPolicy || "flexible"
    );
  const [is24Hours, setIs24Hours] = useState<boolean>(
    initialListing?.openingHours?.is24Hours ?? true
  );
  const [openingTime, setOpeningTime] = useState<string>(
    initialListing?.openingHours?.open || "06:00"
  );
  const [closingTime, setClosingTime] = useState<string>(
    initialListing?.openingHours?.close || "23:00"
  );
  const [minNoticeMinutes, setMinNoticeMinutes] = useState<number>(
    initialListing?.minNoticeMinutes ?? 15
  );

  const [submittingStatus, setSubmittingStatus] = useState<
    "draft" | "published" | null
  >(null);

  const toggleVehicle = (v: VehicleType) => {
    setSupportedVehicles((prev) =>
      prev.includes(v) ? prev.filter((item) => item !== v) : [...prev, v]
    );
  };

  const toggleAmenity = (a: string) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((item) => item !== a) : [...prev, a]
    );
  };

  const handleApplyHubCoordinates = (hubId: string) => {
    const hub = URBAN_HUBS.find((h) => h.id === hubId);
    if (!hub) return;
    setLocality(hub.name);
    setCity(hub.city);
    setLatitude(Number((hub.latitude + 0.0012).toFixed(4)));
    setLongitude(Number((hub.longitude + 0.0012).toFixed(4)));
    toast.success(`Coordinates set near ${hub.name}, ${hub.city}`);
  };

  const handleSubmit = async (targetStatus: "draft" | "published") => {
    if (targetStatus === "published") {
      if (!title.trim() || title.trim().length < 5) {
        toast.error(
          "Please enter a descriptive listing title (at least 5 characters) before publishing."
        );
        return;
      }
      if (!address.trim() || !locality.trim() || !city.trim()) {
        toast.error(
          "Street address, locality, and city are required to publish a listing."
        );
        return;
      }
      if (supportedVehicles.length === 0) {
        toast.error("Please select at least one compatible vehicle type.");
        return;
      }
      if (pricePerHour <= 0 || pricePerDay <= 0) {
        toast.error("Hourly and daily prices must be greater than ₹0.");
        return;
      }
    }

    setSubmittingStatus(targetStatus);
    try {
      const photoUrls = customPhotoUrl.trim()
        ? [customPhotoUrl.trim(), selectedPhoto]
        : [selectedPhoto, CURATED_PARKING_PHOTOS[1].url];

      const payload = {
        title: title.trim() || "Untitled Parking Space (Draft)",
        subtitle: `${SPACE_TYPE_LABELS_SHORT[spaceType] || "Private"} bay in ${locality.trim() || city.trim()}`,
        description:
          description.trim() ||
          "Private parking space available for reservation on ParkOrbit.",
        address: address.trim(),
        locality: locality.trim(),
        landmark: landmark.trim() || `${locality} Main Road`,
        city: city.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        spaceType,
        photos: photoUrls.map((url, idx) => ({
          id: `ph-custom-${idx + 1}`,
          url,
          caption: idx === 0 ? "Primary space view" : "Access lane view",
          isPrimary: idx === 0,
        })),
        vehicleTypes:
          supportedVehicles.length > 0 ? supportedVehicles : ["sedan"],
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
        openingHours: {
          open: openingTime,
          close: closingTime,
          is24Hours,
        },
        minNoticeMinutes: Number(minNoticeMinutes) || 15,
        status: targetStatus,
      };

      const url =
        mode === "edit" && initialListing?.id
          ? `/api/listings/${initialListing.id}`
          : "/api/listings";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save parking listing.");
        return;
      }

      if (targetStatus === "draft") {
        toast.success("Listing saved as a draft in your Host Studio.");
      } else {
        toast.success("Parking listing published to the live marketplace!");
      }
      router.push("/dashboard/host");
      router.refresh();
    } catch {
      toast.error("Network error while saving listing.");
    } finally {
      setSubmittingStatus(null);
    }
  };

  const estimatedMonthlyGross = pricePerDay * 20;
  const estimatedMonthlyNet = Math.round(estimatedMonthlyGross * 0.88);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      {/* Main Form Column (8 Cols) */}
      <div className="lg:col-span-8 space-y-8">
        {/* Step 1: Title, Type & Photos */}
        <div className="bg-[#FCFBFA] rounded-[28px] p-6 sm:p-8 border border-black/8 space-y-6">
          <div className="mc-eyebrow">
            <span className="mc-eyebrow-dot" />
            <span>STEP 1 · SPACE IDENTITY & PHOTOS</span>
          </div>

          <Field>
            <FieldLabel htmlFor="listing-title">Listing Title *</FieldLabel>
            <Input
              id="listing-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Koregaon Park Lane 7 Covered EV Villa Driveway"
            />
            <FieldDescription>
              Highlight your nearest landmark and whether the space is covered or
              gated.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="listing-description">
              Space Description
            </FieldLabel>
            <Textarea
              id="listing-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe entry width, security guard presence, lighting, and walking distance to nearby offices or metro stations..."
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="listing-space-type">
              Parking Space Type
            </FieldLabel>
            <select
              id="listing-space-type"
              value={spaceType}
              onChange={(e) =>
                setSpaceType(e.target.value as SpaceType)
              }
              className="w-full h-11 px-4 rounded-xl border border-black/15 bg-white text-sm text-[#141413]"
            >
              <option value="covered">Covered Garage / Stilt Bay</option>
              <option value="driveway">Private Residential Driveway</option>
              <option value="dedicated_private">Dedicated Private Slot</option>
              <option value="commercial_lot">Commercial Building Slot</option>
              <option value="uncovered">Uncovered Open Compound</option>
            </select>
          </Field>

          {/* Photo Picker */}
          <div className="space-y-3">
            <FieldLabel>Select Space Photo or Paste Custom Image URL</FieldLabel>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {CURATED_PARKING_PHOTOS.map((photoObj, idx) => (
                <button
                  key={photoObj.url}
                  type="button"
                  onClick={() => setSelectedPhoto(photoObj.url)}
                  className={`relative h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedPhoto === photoObj.url
                      ? "border-[#CF4500] ring-2 ring-[#CF4500]/30 scale-[1.02]"
                      : "border-transparent opacity-75 hover:opacity-100"
                  }`}
                >
                  <img
                    src={photoObj.url}
                    alt={photoObj.caption || `Parking preset ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            <Input
              value={customPhotoUrl}
              onChange={(e) => setCustomPhotoUrl(e.target.value)}
              placeholder="Optional: Paste custom photo URL (https://...)"
            />
          </div>
        </div>

        {/* Step 2: Location & Coordinates */}
        <div className="bg-[#FCFBFA] rounded-[28px] p-6 sm:p-8 border border-black/8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="mc-eyebrow">
              <span className="mc-eyebrow-dot" />
              <span>STEP 2 · ADDRESS & INTERACTIVE MAP PIN</span>
            </div>
            <div className="text-xs text-[#595550] font-medium">
              Drag pin or select Pune preset to set exact spot coordinates
            </div>
          </div>

          {/* Interactive Leaflet Map Location Picker */}
          <HostLocationPicker
            latitude={latitude}
            longitude={longitude}
            locality={locality}
            city={city}
            onChange={({
              latitude: newLat,
              longitude: newLng,
              locality: newLoc,
              landmark: newLm,
              city: newCity,
              pincode: newPin,
            }) => {
              setLatitude(newLat);
              setLongitude(newLng);
              if (newLoc) setLocality(newLoc);
              if (newLm) setLandmark(newLm);
              if (newCity) setCity(newCity);
              if (newPin) setPincode(newPin);
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="listing-address">Street Address *</FieldLabel>
              <Input
                id="listing-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Bungalow 14, Lane 7, Koregaon Park"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="listing-locality">
                Locality / Area *
              </FieldLabel>
              <Input
                id="listing-locality"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="Koregaon Park"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="listing-landmark">
                Nearest Landmark
              </FieldLabel>
              <Input
                id="listing-landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Near German Bakery / Osho Garden"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="listing-city">City *</FieldLabel>
              <Input
                id="listing-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Pune"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="listing-pincode">PIN Code</FieldLabel>
              <Input
                id="listing-pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="411001"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="listing-lat">
                Latitude (Auto-synced with pin)
              </FieldLabel>
              <Input
                id="listing-lat"
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(Number(e.target.value))}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="listing-lng">
                Longitude (Auto-synced with pin)
              </FieldLabel>
              <Input
                id="listing-lng"
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(Number(e.target.value))}
              />
            </Field>
          </div>
        </div>

        {/* Step 3: Dimensions & Vehicle Compatibility */}
        <div className="bg-[#FCFBFA] rounded-[28px] p-6 sm:p-8 border border-black/8 space-y-6">
          <div className="mc-eyebrow">
            <span className="mc-eyebrow-dot" />
            <span>STEP 3 · VEHICLE COMPATIBILITY & DIMENSIONS</span>
          </div>

          <div>
            <FieldLabel className="mb-2.5 block">
              Supported Vehicles *
            </FieldLabel>
            <div className="flex flex-wrap gap-2.5">
              {ALL_VEHICLES.map((v) => {
                const active = supportedVehicles.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleVehicle(v.id)}
                    className={`px-4 py-2 rounded-pill text-xs font-semibold border transition-all ${
                      active
                        ? "bg-[#141413] text-[#F3F0EE] border-[#141413]"
                        : "bg-[#F3F0EE] text-[#595550] border-black/10 hover:border-black/30"
                    }`}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field>
              <FieldLabel htmlFor="dim-length">Length (ft)</FieldLabel>
              <Input
                id="dim-length"
                type="number"
                step="0.5"
                value={lengthFt}
                onChange={(e) => setLengthFt(Number(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="dim-width">Width (ft)</FieldLabel>
              <Input
                id="dim-width"
                type="number"
                step="0.5"
                value={widthFt}
                onChange={(e) => setWidthFt(Number(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="dim-height">
                Roof Clearance (ft, blank if open)
              </FieldLabel>
              <Input
                id="dim-height"
                type="number"
                step="0.5"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                placeholder="e.g. 7.5"
              />
            </Field>
          </div>
        </div>

        {/* Step 4: Pricing, Schedule & Access Rules */}
        <div className="bg-[#FCFBFA] rounded-[28px] p-6 sm:p-8 border border-black/8 space-y-6">
          <div className="mc-eyebrow">
            <span className="mc-eyebrow-dot" />
            <span>STEP 4 · PRICING, HOURS & ACCESS RULES</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field>
              <FieldLabel htmlFor="price-hour">Hourly Rate (₹) *</FieldLabel>
              <Input
                id="price-hour"
                type="number"
                min="10"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(Number(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="price-day">Daily Rate (₹) *</FieldLabel>
              <Input
                id="price-day"
                type="number"
                min="50"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(Number(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="price-month">Monthly Pass (₹)</FieldLabel>
              <Input
                id="price-month"
                type="number"
                min="500"
                value={pricePerMonth}
                onChange={(e) => setPricePerMonth(Number(e.target.value))}
              />
            </Field>
          </div>

          {/* Operating Hours */}
          <div className="space-y-3 pt-2 border-t border-black/8">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#141413] cursor-pointer">
              <input
                type="checkbox"
                checked={is24Hours}
                onChange={(e) => setIs24Hours(e.target.checked)}
                className="rounded border-black/25 text-[#CF4500]"
              />
              <span>Space is accessible 24 Hours a day</span>
            </label>

            {!is24Hours && (
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="opening-time">Opening Time</FieldLabel>
                  <Input
                    id="opening-time"
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="closing-time">Closing Time</FieldLabel>
                  <Input
                    id="closing-time"
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Amenities */}
          <div>
            <FieldLabel className="mb-2.5 block">
              Available Amenities
            </FieldLabel>
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map((item) => {
                const active = amenities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAmenity(item)}
                    className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition-all ${
                      active
                        ? "bg-[#1E7E48] text-white border-[#1E7E48]"
                        : "bg-[#F3F0EE] text-[#595550] border-black/10"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cancellation Policy & Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="listing-policy">
                Cancellation Policy
              </FieldLabel>
              <select
                id="listing-policy"
                value={cancellationPolicy}
                onChange={(e) =>
                  setCancellationPolicy(e.target.value as CancellationPolicy)
                }
                className="w-full h-11 px-4 rounded-xl border border-black/15 bg-white text-sm text-[#141413]"
              >
                <option value="flexible">
                  Flexible (Full refund 2h before start)
                </option>
                <option value="moderate">
                  Moderate (Full refund 24h before start)
                </option>
                <option value="strict">
                  Strict (Full refund 48h before start)
                </option>
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="listing-notice">
                Minimum Advance Notice (Minutes)
              </FieldLabel>
              <Input
                id="listing-notice"
                type="number"
                value={minNoticeMinutes}
                onChange={(e) => setMinNoticeMinutes(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="listing-access">
              Protected Check-in & Gate Access Instructions
            </FieldLabel>
            <Textarea
              id="listing-access"
              value={accessInstructions}
              onChange={(e) => setAccessInstructions(e.target.value)}
              placeholder="Shared only with confirmed drivers (e.g. Gate code, security intercom, bay number)..."
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="listing-rules">
              Parking Rules (One rule per line)
            </FieldLabel>
            <Textarea
              id="listing-rules"
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Right Sticky Summary & Save/Publish Actions (4 Cols) */}
      <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
        <div className="bg-[#141413] text-[#F3F0EE] rounded-[32px] p-7 shadow-mc-floating space-y-6">
          <div className="mc-eyebrow text-[#F37338]">
            <span className="mc-eyebrow-dot" />
            <span>HOST EARNINGS SIMULATOR</span>
          </div>

          <div>
            <div className="text-xs text-[#A39E98]">
              Estimated Monthly Net Earnings (at 20 days occupancy)
            </div>
            <div className="text-4xl font-bold text-white mt-1">
              {formatInr(estimatedMonthlyNet)}
            </div>
            <div className="text-xs text-[#D0CBC5] mt-1">
              Gross: {formatInr(estimatedMonthlyGross)} · Less 12% ParkOrbit
              commission
            </div>
          </div>

          {/* Preview Circular Portrait */}
          <div className="flex items-center gap-4 bg-white/10 p-3.5 rounded-2xl border border-white/15">
            <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-white/25">
              <img
                src={customPhotoUrl.trim() || selectedPhoto}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {title || "Your Parking Space Title"}
              </div>
              <div className="text-xs text-[#A39E98] truncate">
                {locality}, {city} · {formatInr(pricePerHour)}/hr
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="consent"
              size="lg"
              className="w-full"
              disabled={submittingStatus !== null}
              onClick={() => handleSubmit("published")}
            >
              {submittingStatus === "published"
                ? "Publishing..."
                : mode === "edit"
                ? "Save & Publish Listing"
                : "Publish Active Listing"}
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full bg-white text-[#141413] hover:bg-[#F3F0EE]"
              disabled={submittingStatus !== null}
              onClick={() => handleSubmit("draft")}
            >
              <Save className="w-4 h-4 mr-1" />
              {submittingStatus === "draft"
                ? "Saving Draft..."
                : "Save as Draft"}
            </Button>
          </div>

          <p className="text-[11px] text-[#A39E98] leading-relaxed">
            You can pause your listing, update hourly pricing, or block specific
            dates anytime from your Host Studio.
          </p>
        </div>
      </div>
    </div>
  );
}
