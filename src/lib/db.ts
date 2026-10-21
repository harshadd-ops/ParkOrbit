import fs from "fs";
import path from "path";
import {
  BlockedPeriod,
  Booking,
  CancellationPolicy,
  DatabaseSchema,
  ListingStatus,
  ModerationReport,
  ParkingListing,
  PaymentRecord,
  PlatformConfig,
  Review,
  SpaceDimensions,
  SpaceType,
  User,
  VehicleType,
} from "./types";
import { createInitialSeedData } from "./seed";
import {
  calculateCancellationRefund,
  calculateDistanceKm,
  calculatePriceBreakdown,
} from "./pricing";
export { calculateDistanceKm };
import { checkListingAvailability, intervalsOverlap } from "./availability";

function getDbFilePath(): string {
  if (process.env.PARKORBIT_DB_PATH) {
    return path.resolve(process.cwd(), process.env.PARKORBIT_DB_PATH);
  }
  return path.join(process.cwd(), "data", "parkorbit-db.json");
}

export function readDb(): DatabaseSchema {
  const filePath = getDbFilePath();
  if (!fs.existsSync(filePath)) {
    const initial = createInitialSeedData();
    writeDb(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as DatabaseSchema;

    // Automatic migration guard: re-seed if stale non-Pune database detected
    const hasStaleNonPuneSeed = parsed.listings?.some(
      (l) => l.city === "Bengaluru" || l.city === "Mumbai" || l.city === "New Delhi"
    );
    if (hasStaleNonPuneSeed) {
      const freshPuneDb = createInitialSeedData();
      writeDb(freshPuneDb);
      return freshPuneDb;
    }

    return parsed;
  } catch {
    const initial = createInitialSeedData();
    writeDb(initial);
    return initial;
  }
}

/** Canonical alias for readDb() */
export const getDb = readDb;

export function writeDb(data: DatabaseSchema): void {
  const filePath = getDbFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function resetDatabaseForTests(customPath?: string): DatabaseSchema {
  if (customPath) {
    process.env.PARKORBIT_DB_PATH = customPath;
  }
  const initial = createInitialSeedData();
  writeDb(initial);
  return initial;
}

/* ---------------- AUTH & USERS ---------------- */

export function getUserById(userId: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.id === userId);
}

export function getUserByEmail(email: string): User | undefined {
  const db = readDb();
  return db.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
}

export function registerUser(input: {
  name: string;
  email: string;
  phone: string;
  password?: string;
  upiId?: string;
  bio?: string;
}): User {
  const db = readDb();
  const cleanEmail = input.email.trim().toLowerCase();
  if (!cleanEmail || !input.name.trim()) {
    throw new Error("Name and valid email are required.");
  }
  if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error("An account with this email already exists.");
  }

  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    email: cleanEmail,
    phone: input.phone?.trim() || "+91 90000 00000",
    passwordHash: input.password || "pass123",
    role: "user",
    isVerified: true,
    avatarUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80",
    bio:
      input.bio?.trim() ||
      "ParkOrbit member — Verified Driver & Parking Host.",
    upiId: input.upiId?.trim() || `${cleanEmail.split("@")[0]}@okicici`,
    isDemo: false,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

export function authenticateUser(email: string, password?: string): User {
  const user = getUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or account not found.");
  }
  if (password && user.passwordHash !== password) {
    throw new Error("Incorrect password.");
  }
  return user;
}

export function updateUserProfile(
  actorUserId: string,
  targetUserId: string,
  updates: Partial<
    Pick<
      User,
      | "name"
      | "phone"
      | "bio"
      | "upiId"
      | "defaultVehicleType"
      | "defaultVehiclePlate"
    >
  >
): User {
  if (actorUserId !== targetUserId) {
    throw new Error("FORBIDDEN: You can only update your own profile.");
  }
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === targetUserId);
  if (idx === -1) {
    throw new Error("User not found.");
  }
  const updated: User = {
    ...db.users[idx],
    ...updates,
    name: updates.name ? updates.name.trim() : db.users[idx].name,
  };
  db.users[idx] = updated;
  writeDb(db);
  return updated;
}

/* ---------------- LISTINGS & SEARCH ---------------- */

export interface SearchListingsParams {
  query?: string;
  city?: string;
  spaceType?: SpaceType | "all";
  vehicleType?: VehicleType | "all";
  maxHourlyPrice?: number;
  startTime?: string;
  endTime?: string;
  lat?: number;
  lng?: number;
  maxDistanceKm?: number;
  onlyAvailable?: boolean;
  sortBy?: "featured" | "price_asc" | "price_desc" | "distance" | "rating";
  includeNonPublishedForHostId?: string;
}

export interface EnrichedListing extends ParkingListing {
  distanceKm?: number;
  availability: {
    available: boolean;
    reason?: string;
  };
  estimatedPrice?: ReturnType<typeof calculatePriceBreakdown>;
}

export function searchListings(params: SearchListingsParams = {}): EnrichedListing[] {
  const db = readDb();
  const q = (params.query || "").trim().toLowerCase();

  let candidates = db.listings.filter((listing) => {
    if (params.includeNonPublishedForHostId === listing.hostId) {
      return true;
    }
    return listing.status === "published";
  });

  if (q) {
    candidates = candidates.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.locality.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.landmark.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
    );
  }

  if (params.city && params.city !== "all") {
    candidates = candidates.filter(
      (l) => l.city.toLowerCase() === params.city!.toLowerCase()
    );
  }

  if (params.spaceType && params.spaceType !== "all") {
    candidates = candidates.filter((l) => l.spaceType === params.spaceType);
  }

  if (params.vehicleType && params.vehicleType !== "all") {
    candidates = candidates.filter((l) =>
      l.vehicleTypes.includes(params.vehicleType as VehicleType)
    );
  }

  if (typeof params.maxHourlyPrice === "number" && params.maxHourlyPrice > 0) {
    candidates = candidates.filter(
      (l) => l.hourlyRateInr <= params.maxHourlyPrice!
    );
  }

  const enriched: EnrichedListing[] = candidates.map((listing) => {
    let distanceKm: number | undefined;
    if (
      typeof params.lat === "number" &&
      typeof params.lng === "number" &&
      !isNaN(params.lat) &&
      !isNaN(params.lng)
    ) {
      distanceKm = calculateDistanceKm(
        params.lat,
        params.lng,
        listing.latitude,
        listing.longitude
      );
    }

    let availability: { available: boolean; reason?: string } = {
      available: listing.status === "published",
    };
    let estimatedPrice: ReturnType<typeof calculatePriceBreakdown> | undefined;

    if (params.startTime && params.endTime) {
      availability = checkListingAvailability(
        listing,
        params.startTime,
        params.endTime,
        db.bookings,
        db.blockedPeriods,
        params.vehicleType && params.vehicleType !== "all"
          ? (params.vehicleType as VehicleType)
          : undefined
      );
      if (
        new Date(params.endTime).getTime() >
        new Date(params.startTime).getTime()
      ) {
        estimatedPrice = calculatePriceBreakdown(
          listing,
          params.startTime,
          params.endTime,
          db.config
        );
      }
    }

    return {
      ...listing,
      distanceKm,
      availability,
      estimatedPrice,
    };
  });

  let filtered = enriched;
  if (
    typeof params.maxDistanceKm === "number" &&
    params.maxDistanceKm > 0 &&
    typeof params.lat === "number"
  ) {
    filtered = filtered.filter(
      (l) => l.distanceKm === undefined || l.distanceKm <= params.maxDistanceKm!
    );
  }

  if (params.onlyAvailable && params.startTime && params.endTime) {
    filtered = filtered.filter((l) => l.availability.available);
  }

  const sortBy = params.sortBy || "featured";
  filtered.sort((a, b) => {
    if (sortBy === "price_asc") return a.hourlyRateInr - b.hourlyRateInr;
    if (sortBy === "price_desc") return b.hourlyRateInr - a.hourlyRateInr;
    if (sortBy === "rating") return b.ratingAvg - a.ratingAvg;
    if (sortBy === "distance") {
      return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
    }
    // featured default: available first, then featured, then rating
    if (a.availability.available !== b.availability.available) {
      return a.availability.available ? -1 : 1;
    }
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }
    return b.ratingAvg - a.ratingAvg;
  });

  return filtered;
}

export function getListingDetails(listingId: string) {
  const db = readDb();
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) return null;

  const blocks = db.blockedPeriods.filter((b) => b.listingId === listingId);
  const activeBookings = db.bookings
    .filter(
      (b) =>
        b.listingId === listingId &&
        (b.status === "confirmed" || b.status === "checked_in")
    )
    .map((b) => ({
      id: b.id,
      referenceCode: b.referenceCode,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
    }));
  const reviews = db.reviews
    .filter((r) => r.listingId === listingId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return {
    listing,
    blockedPeriods: blocks,
    reservedSlots: activeBookings,
    reviews,
    config: db.config,
  };
}

export interface CreateOrUpdateListingInput {
  title: string;
  subtitle?: string;
  description?: string;
  address?: string;
  locality?: string;
  city?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  spaceType?: SpaceType;
  status?: ListingStatus;
  vehicleTypes?: VehicleType[];
  dimensions?: SpaceDimensions;
  hourlyRateInr?: number;
  dailyRateInr?: number;
  monthlyRateInr?: number;
  isFeatured?: boolean;
  amenities?: string[];
  photoUrls?: string[];
  accessInstructions?: string;
  parkingRules?: string[];
  restrictions?: string;
  cancellationPolicy?: CancellationPolicy;
  minNoticeMinutes?: number;
  openingHours?: { open: string; close: string; is24Hours: boolean };
  availableDays?: number[];
}

export function createListing(
  actorUserId: string,
  input: CreateOrUpdateListingInput
): ParkingListing {
  const db = readDb();
  const host = db.users.find((u) => u.id === actorUserId);
  if (!host) {
    throw new Error("UNAUTHORIZED: Valid host account required.");
  }

  const targetStatus: ListingStatus = input.status || "published";
  const isDraft = targetStatus === "draft";

  if (!input.title || input.title.trim().length < 3) {
    throw new Error("Listing title must be at least 3 characters.");
  }

  if (!isDraft) {
    if (!input.address || !input.locality || !input.city) {
      throw new Error(
        "Address, locality, and city are required to publish a listing."
      );
    }
    if (
      typeof input.hourlyRateInr !== "number" ||
      input.hourlyRateInr <= 0 ||
      typeof input.dailyRateInr !== "number" ||
      input.dailyRateInr <= 0
    ) {
      throw new Error(
        "Valid positive hourly and daily rates (in INR) are required to publish."
      );
    }
    if (!input.vehicleTypes || input.vehicleTypes.length === 0) {
      throw new Error(
        "Select at least one compatible vehicle type before publishing."
      );
    }
  }

  const photoUrls =
    input.photoUrls && input.photoUrls.length > 0
      ? input.photoUrls
      : [
          "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1000&q=80",
        ];

  const now = new Date().toISOString();
  const newListing: ParkingListing = {
    id: `listing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    hostId: host.id,
    hostName: host.name,
    hostAvatar: host.avatarUrl,
    hostVerified: host.isVerified,
    title: input.title.trim(),
    subtitle:
      input.subtitle?.trim() ||
      `${input.spaceType || "covered"} space in ${input.locality || "Pune"}`,
    description:
      input.description?.trim() ||
      "Private residential/commercial parking space managed via ParkOrbit.",
    address: input.address?.trim() || "Draft Address",
    locality: input.locality?.trim() || "Koregaon Park",
    city: input.city?.trim() || "Pune",
    landmark: input.landmark?.trim() || "Near Main Road",
    latitude: typeof input.latitude === "number" ? input.latitude : 18.5362,
    longitude: typeof input.longitude === "number" ? input.longitude : 73.894,
    spaceType: input.spaceType || "covered",
    status: targetStatus,
    vehicleTypes:
      input.vehicleTypes && input.vehicleTypes.length > 0
        ? input.vehicleTypes
        : ["hatchback", "sedan"],
    dimensions: input.dimensions || {
      lengthFt: 17,
      widthFt: 8.5,
      heightClearanceFt: 8,
    },
    hourlyRateInr: Number(input.hourlyRateInr) || 60,
    dailyRateInr: Number(input.dailyRateInr) || 380,
    monthlyRateInr: input.monthlyRateInr
      ? Number(input.monthlyRateInr)
      : undefined,
    isFeatured: Boolean(input.isFeatured),
    amenities:
      input.amenities && input.amenities.length > 0
        ? input.amenities
        : ["CCTV Monitored", "Gated Entry"],
    photos: photoUrls.map((url, i) => ({
      id: `ph-${Date.now()}-${i}`,
      url,
      caption: `${input.title.trim()} view ${i + 1}`,
      isPrimary: i === 0,
    })),
    accessInstructions:
      input.accessInstructions?.trim() ||
      "Show your ParkOrbit Booking PIN at the entrance gate.",
    parkingRules:
      input.parkingRules && input.parkingRules.length > 0
        ? input.parkingRules
        : ["Park within designated bay lines"],
    restrictions: input.restrictions?.trim() || "Standard passenger vehicles only.",
    cancellationPolicy: input.cancellationPolicy || "flexible",
    minNoticeMinutes:
      typeof input.minNoticeMinutes === "number" ? input.minNoticeMinutes : 15,
    openingHours: input.openingHours || {
      open: "00:00",
      close: "23:59",
      is24Hours: true,
    },
    availableDays:
      input.availableDays && input.availableDays.length > 0
        ? input.availableDays
        : [0, 1, 2, 3, 4, 5, 6],
    ratingAvg: 5.0,
    reviewCount: 0,
    isDemo: false,
    createdAt: now,
    updatedAt: now,
  };

  db.listings.unshift(newListing);
  writeDb(db);
  return newListing;
}

export function updateListing(
  actorUserId: string,
  listingId: string,
  updates: Partial<CreateOrUpdateListingInput>
): ParkingListing {
  const db = readDb();
  const actor = db.users.find((u) => u.id === actorUserId);
  if (!actor) {
    throw new Error("UNAUTHORIZED: Login required.");
  }

  const idx = db.listings.findIndex((l) => l.id === listingId);
  if (idx === -1) {
    throw new Error("Listing not found.");
  }

  const existing = db.listings[idx];
  if (existing.hostId !== actorUserId && actor.role !== "admin") {
    throw new Error(
      "FORBIDDEN: You do not have permission to modify a listing you do not own."
    );
  }

  const nextStatus = updates.status ?? existing.status;
  const nextHourly =
    updates.hourlyRateInr !== undefined
      ? Number(updates.hourlyRateInr)
      : existing.hourlyRateInr;
  const nextDaily =
    updates.dailyRateInr !== undefined
      ? Number(updates.dailyRateInr)
      : existing.dailyRateInr;

  if (nextStatus === "published") {
    if (nextHourly <= 0 || nextDaily <= 0) {
      throw new Error(
        "Hourly and daily rates must be greater than 0 to publish a listing."
      );
    }
  }

  const updatedPhotos =
    updates.photoUrls && updates.photoUrls.length > 0
      ? updates.photoUrls.map((url, i) => ({
          id: `ph-${Date.now()}-${i}`,
          url,
          caption: `${updates.title || existing.title} view ${i + 1}`,
          isPrimary: i === 0,
        }))
      : existing.photos;

  const updated: ParkingListing = {
    ...existing,
    title: updates.title !== undefined ? updates.title.trim() : existing.title,
    subtitle:
      updates.subtitle !== undefined
        ? updates.subtitle.trim()
        : existing.subtitle,
    description:
      updates.description !== undefined
        ? updates.description.trim()
        : existing.description,
    address:
      updates.address !== undefined ? updates.address.trim() : existing.address,
    locality:
      updates.locality !== undefined
        ? updates.locality.trim()
        : existing.locality,
    city: updates.city !== undefined ? updates.city.trim() : existing.city,
    landmark:
      updates.landmark !== undefined
        ? updates.landmark.trim()
        : existing.landmark,
    latitude:
      updates.latitude !== undefined ? updates.latitude : existing.latitude,
    longitude:
      updates.longitude !== undefined ? updates.longitude : existing.longitude,
    spaceType: updates.spaceType ?? existing.spaceType,
    status: nextStatus,
    vehicleTypes: updates.vehicleTypes ?? existing.vehicleTypes,
    dimensions: updates.dimensions ?? existing.dimensions,
    hourlyRateInr: nextHourly,
    dailyRateInr: nextDaily,
    monthlyRateInr:
      updates.monthlyRateInr !== undefined
        ? Number(updates.monthlyRateInr)
        : existing.monthlyRateInr,
    isFeatured:
      updates.isFeatured !== undefined
        ? Boolean(updates.isFeatured)
        : existing.isFeatured,
    amenities: updates.amenities ?? existing.amenities,
    photos: updatedPhotos,
    accessInstructions:
      updates.accessInstructions !== undefined
        ? updates.accessInstructions.trim()
        : existing.accessInstructions,
    parkingRules: updates.parkingRules ?? existing.parkingRules,
    restrictions:
      updates.restrictions !== undefined
        ? updates.restrictions.trim()
        : existing.restrictions,
    cancellationPolicy:
      updates.cancellationPolicy ?? existing.cancellationPolicy,
    minNoticeMinutes: updates.minNoticeMinutes ?? existing.minNoticeMinutes,
    openingHours: updates.openingHours ?? existing.openingHours,
    availableDays: updates.availableDays ?? existing.availableDays,
    updatedAt: new Date().toISOString(),
  };

  db.listings[idx] = updated;
  writeDb(db);
  return updated;
}

export function addBlockedPeriod(
  actorUserId: string,
  listingId: string,
  input: { startTime: string; endTime: string; reason: string }
): BlockedPeriod {
  const db = readDb();
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) {
    throw new Error("Listing not found.");
  }
  if (listing.hostId !== actorUserId) {
    throw new Error(
      "FORBIDDEN: Only the listing host can block availability periods."
    );
  }
  if (
    new Date(input.endTime).getTime() <= new Date(input.startTime).getTime()
  ) {
    throw new Error("Block end time must be after start time.");
  }

  // Ensure no confirmed booking already exists in this slot
  const conflictingBooking = db.bookings.find(
    (b) =>
      b.listingId === listingId &&
      (b.status === "confirmed" || b.status === "checked_in") &&
      intervalsOverlap(
        input.startTime,
        input.endTime,
        b.startTime,
        b.endTime
      )
  );
  if (conflictingBooking) {
    throw new Error(
      `Cannot block period: overlaps with confirmed booking ${conflictingBooking.referenceCode}.`
    );
  }

  const block: BlockedPeriod = {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    listingId,
    startTime: input.startTime,
    endTime: input.endTime,
    reason: input.reason?.trim() || "Host unavailable",
    createdAt: new Date().toISOString(),
  };

  db.blockedPeriods.push(block);
  writeDb(db);
  return block;
}

export function removeBlockedPeriod(
  actorUserId: string,
  listingId: string,
  blockId: string
): void {
  const db = readDb();
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) {
    throw new Error("Listing not found.");
  }
  if (listing.hostId !== actorUserId) {
    throw new Error(
      "FORBIDDEN: Only the listing host can remove blocked periods."
    );
  }
  db.blockedPeriods = db.blockedPeriods.filter(
    (b) => !(b.id === blockId && b.listingId === listingId)
  );
  writeDb(db);
}

/* ---------------- BOOKINGS & PAYMENTS ---------------- */

export interface CreateBookingInput {
  listingId: string;
  startTime: string;
  endTime: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
  paymentMethod?: "upi_simulated" | "card_simulated";
  paymentMethodDetail?: string;
}

export function createBooking(
  driverUserId: string,
  input: CreateBookingInput
): { booking: Booking; payment: PaymentRecord } {
  const db = readDb();
  const driver = db.users.find((u) => u.id === driverUserId);
  if (!driver) {
    throw new Error("UNAUTHORIZED: Please sign in to reserve a parking space.");
  }

  const listing = db.listings.find((l) => l.id === input.listingId);
  if (!listing) {
    throw new Error("Parking listing not found.");
  }

  if (!input.vehiclePlate || input.vehiclePlate.trim().length < 4) {
    throw new Error("A valid vehicle registration number is required.");
  }

  // Server-side authoritative availability & overlap check
  const availability = checkListingAvailability(
    listing,
    input.startTime,
    input.endTime,
    db.bookings,
    db.blockedPeriods,
    input.vehicleType
  );
  if (!availability.available) {
    throw new Error(`CONFLICT: ${availability.reason}`);
  }

  // Server-side authoritative pricing calculation
  const pricing = calculatePriceBreakdown(
    listing,
    input.startTime,
    input.endTime,
    db.config
  );

  const refNum = Math.floor(100000 + Math.random() * 900000);
  const referenceCode = `PKO-${refNum}`;
  const checkinPin = String(Math.floor(1000 + Math.random() * 9000));
  const paymentRef = `SIM-${input.paymentMethod === "card_simulated" ? "CRD" : "UPI"}-${refNum}`;
  const now = new Date().toISOString();

  const booking: Booking = {
    id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    referenceCode,
    checkinPin,
    listingId: listing.id,
    listingTitle: listing.title,
    listingAddress: listing.address,
    listingLocality: listing.locality,
    listingCity: listing.city,
    listingPhotoUrl:
      listing.photos[0]?.url ||
      "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1000&q=80",
    listingSpaceType: listing.spaceType,
    cancellationPolicy: listing.cancellationPolicy,
    accessInstructions: listing.accessInstructions,
    driverId: driver.id,
    driverName: driver.name,
    driverEmail: driver.email,
    driverPhone: driver.phone,
    hostId: listing.hostId,
    hostName: listing.hostName,
    vehicleType: input.vehicleType,
    vehiclePlate: input.vehiclePlate.trim().toUpperCase(),
    startTime: input.startTime,
    endTime: input.endTime,
    durationHours: pricing.durationHours,
    pricingMode: pricing.pricingMode,
    baseSubtotalInr: pricing.baseSubtotalInr,
    platformCommissionPercent: pricing.platformCommissionPercent,
    driverServiceFeePercent: pricing.driverServiceFeePercent,
    driverServiceFeeInr: pricing.driverServiceFeeInr,
    platformHostCommissionInr: pricing.platformHostCommissionInr,
    totalDriverPaidInr: pricing.totalDriverPaidInr,
    netHostEarningsInr: pricing.netHostEarningsInr,
    status: "confirmed",
    refundAmountInr: 0,
    refundStatus: "none",
    payoutStatus: "pending_settlement",
    paymentMethod: input.paymentMethod || "upi_simulated",
    paymentReference: paymentRef,
    hasReview: false,
    isDemo: false,
    createdAt: now,
  };

  const payment: PaymentRecord = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    bookingId: booking.id,
    bookingReference: referenceCode,
    payerId: driver.id,
    hostId: listing.hostId,
    provider: input.paymentMethod || "upi_simulated",
    paymentMethodDetail:
      input.paymentMethodDetail?.trim() ||
      `${driver.upiId || "driver@okicici"} (Simulated Test Payment)`,
    amountInr: pricing.totalDriverPaidInr,
    refundedAmountInr: 0,
    currency: "INR",
    status: "succeeded_simulated",
    transactionRef: paymentRef,
    isSimulated: true,
    createdAt: now,
  };

  db.bookings.unshift(booking);
  db.payments.unshift(payment);
  writeDb(db);

  return { booking, payment };
}

export function cancelBooking(
  actorUserId: string,
  bookingId: string,
  reason?: string,
  cancelTimeIso?: string
): { booking: Booking; payment?: PaymentRecord; policyExplanation: string } {
  const db = readDb();
  const actor = db.users.find((u) => u.id === actorUserId);
  if (!actor) {
    throw new Error("UNAUTHORIZED: Login required.");
  }

  const bIdx = db.bookings.findIndex((b) => b.id === bookingId);
  if (bIdx === -1) {
    throw new Error("Booking not found.");
  }

  const booking = db.bookings[bIdx];
  if (
    booking.driverId !== actorUserId &&
    booking.hostId !== actorUserId &&
    actor.role !== "admin"
  ) {
    throw new Error(
      "FORBIDDEN: You do not have permission to cancel this booking."
    );
  }

  if (booking.status === "cancelled") {
    throw new Error("Booking is already cancelled.");
  }
  if (booking.status === "completed") {
    throw new Error("Completed bookings cannot be cancelled.");
  }

  // Host-initiated cancellations always refund 100% to driver
  const isHostCancel =
    actorUserId === booking.hostId && actorUserId !== booking.driverId;
  const refundCalc = isHostCancel
    ? {
        refundAmountInr: booking.totalDriverPaidInr,
        refundPercent: 100,
        policyExplanation:
          "Host-initiated cancellation: 100% full simulated refund issued to driver.",
      }
    : calculateCancellationRefund(
        booking,
        booking.cancellationPolicy,
        cancelTimeIso
      );

  const now = cancelTimeIso || new Date().toISOString();
  const updatedBooking: Booking = {
    ...booking,
    status: "cancelled",
    cancellationReason:
      reason?.trim() ||
      (isHostCancel ? "Cancelled by host" : "Cancelled by driver"),
    cancelledAt: now,
    refundAmountInr: refundCalc.refundAmountInr,
    refundStatus:
      refundCalc.refundAmountInr > 0 ? "processed_simulated" : "none",
    netHostEarningsInr:
      refundCalc.refundPercent === 100
        ? 0
        : Math.round(
            booking.netHostEarningsInr * (1 - refundCalc.refundPercent / 100)
          ),
  };

  db.bookings[bIdx] = updatedBooking;

  const pIdx = db.payments.findIndex((p) => p.bookingId === bookingId);
  let updatedPayment: PaymentRecord | undefined;
  if (pIdx !== -1) {
    updatedPayment = {
      ...db.payments[pIdx],
      refundedAmountInr: refundCalc.refundAmountInr,
      status:
        refundCalc.refundAmountInr === db.payments[pIdx].amountInr
          ? "refunded_simulated"
          : refundCalc.refundAmountInr > 0
            ? "partial_refund_simulated"
            : db.payments[pIdx].status,
    };
    db.payments[pIdx] = updatedPayment;
  }

  writeDb(db);
  return {
    booking: updatedBooking,
    payment: updatedPayment,
    policyExplanation: refundCalc.policyExplanation,
  };
}

export function checkinOrCompleteBooking(
  actorUserId: string,
  bookingId: string,
  action: "checkin" | "complete",
  checkinPin?: string
): Booking {
  const db = readDb();
  const bIdx = db.bookings.findIndex((b) => b.id === bookingId);
  if (bIdx === -1) {
    throw new Error("Booking not found.");
  }

  const booking = db.bookings[bIdx];
  const actor = db.users.find((u) => u.id === actorUserId);
  if (
    booking.driverId !== actorUserId &&
    booking.hostId !== actorUserId &&
    actor?.role !== "admin"
  ) {
    throw new Error(
      "FORBIDDEN: Only the booking driver or host can update check-in status."
    );
  }

  if (booking.status === "cancelled") {
    throw new Error("Cannot check in to a cancelled booking.");
  }

  if (action === "checkin") {
    if (checkinPin && checkinPin.trim() !== booking.checkinPin) {
      throw new Error("Invalid 4-digit Check-in Verification PIN.");
    }
    booking.status = "checked_in";
    booking.checkedInAt = new Date().toISOString();
  } else {
    booking.status = "completed";
    booking.payoutStatus = "estimated";
  }

  db.bookings[bIdx] = booking;
  writeDb(db);
  return booking;
}

/* ---------------- REVIEWS ---------------- */

export function createReview(
  driverUserId: string,
  input: { bookingId: string; rating: number; comment: string }
): Review {
  const db = readDb();
  const driver = db.users.find((u) => u.id === driverUserId);
  if (!driver) {
    throw new Error("UNAUTHORIZED: Login required.");
  }

  const bIdx = db.bookings.findIndex((b) => b.id === input.bookingId);
  if (bIdx === -1) {
    throw new Error("Booking not found.");
  }
  const booking = db.bookings[bIdx];

  if (booking.driverId !== driverUserId) {
    throw new Error("FORBIDDEN: Only the driver of this booking can review it.");
  }
  if (booking.status !== "completed" && booking.status !== "checked_in") {
    throw new Error(
      "Reviews can only be submitted for checked-in or completed bookings."
    );
  }
  if (booking.hasReview) {
    throw new Error("A review has already been submitted for this booking.");
  }
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5 stars.");
  }
  if (!input.comment || input.comment.trim().length < 5) {
    throw new Error("Please write a brief review comment (at least 5 characters).");
  }

  const review: Review = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    bookingId: booking.id,
    listingId: booking.listingId,
    driverId: driver.id,
    driverName: driver.name,
    driverAvatar: driver.avatarUrl,
    rating: Math.round(input.rating),
    comment: input.comment.trim(),
    isDemo: false,
    createdAt: new Date().toISOString(),
  };

  db.reviews.unshift(review);
  db.bookings[bIdx].hasReview = true;
  if (db.bookings[bIdx].status === "checked_in") {
    db.bookings[bIdx].status = "completed";
  }

  // Recompute listing ratingAvg and reviewCount
  const lIdx = db.listings.findIndex((l) => l.id === booking.listingId);
  if (lIdx !== -1) {
    const listingReviews = db.reviews.filter(
      (r) => r.listingId === booking.listingId
    );
    const sum = listingReviews.reduce((acc, r) => acc + r.rating, 0);
    db.listings[lIdx].reviewCount = listingReviews.length;
    db.listings[lIdx].ratingAvg =
      Math.round((sum / listingReviews.length) * 100) / 100;
  }

  writeDb(db);
  return review;
}

/* ---------------- TRUST & MODERATION REPORTS ---------------- */

export function createReport(
  reporterUserId: string,
  input: {
    targetType: "listing" | "booking" | "user";
    targetId: string;
    targetTitle: string;
    reasonCategory: ModerationReport["reasonCategory"];
    description: string;
  }
): ModerationReport {
  const db = readDb();
  const reporter = db.users.find((u) => u.id === reporterUserId);
  if (!reporter) {
    throw new Error("UNAUTHORIZED: Login required to submit a report.");
  }
  if (!input.description || input.description.trim().length < 5) {
    throw new Error("Please provide a clear description of the issue.");
  }

  const report: ModerationReport = {
    id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reporterId: reporter.id,
    reporterName: reporter.name,
    targetType: input.targetType,
    targetId: input.targetId,
    targetTitle: input.targetTitle,
    reasonCategory: input.reasonCategory,
    description: input.description.trim(),
    status: "open",
    createdAt: new Date().toISOString(),
  };

  db.reports.unshift(report);
  writeDb(db);
  return report;
}

export function resolveReportAsAdmin(
  actorUserId: string,
  reportId: string,
  input: {
    status: ModerationReport["status"];
    adminNotes?: string;
    flagListing?: boolean;
  }
): ModerationReport {
  const db = readDb();
  const actor = db.users.find((u) => u.id === actorUserId);
  if (!actor || actor.role !== "admin") {
    throw new Error("FORBIDDEN: Admin privileges required for moderation.");
  }

  const rIdx = db.reports.findIndex((r) => r.id === reportId);
  if (rIdx === -1) {
    throw new Error("Report not found.");
  }

  const report = db.reports[rIdx];
  report.status = input.status;
  report.adminNotes = input.adminNotes?.trim() || report.adminNotes;
  if (input.status === "resolved" || input.status === "dismissed") {
    report.resolvedAt = new Date().toISOString();
  }

  if (input.flagListing && report.targetType === "listing") {
    const lIdx = db.listings.findIndex((l) => l.id === report.targetId);
    if (lIdx !== -1) {
      db.listings[lIdx].status = "flagged";
    }
  }

  db.reports[rIdx] = report;
  writeDb(db);
  return report;
}

export function updatePlatformConfigAsAdmin(
  actorUserId: string,
  updates: Partial<
    Pick<
      PlatformConfig,
      | "commissionRatePercent"
      | "driverServiceFeePercent"
      | "featuredListingMonthlyInr"
      | "proHostSubscriptionInr"
    >
  >
): PlatformConfig {
  const db = readDb();
  const actor = db.users.find((u) => u.id === actorUserId);
  if (!actor || actor.role !== "admin") {
    throw new Error("FORBIDDEN: Admin privileges required.");
  }

  if (
    updates.commissionRatePercent !== undefined &&
    (updates.commissionRatePercent < 0 || updates.commissionRatePercent > 50)
  ) {
    throw new Error("Commission rate must be between 0% and 50%.");
  }

  db.config = {
    ...db.config,
    ...updates,
  };
  writeDb(db);
  return db.config;
}
