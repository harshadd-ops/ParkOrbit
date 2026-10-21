export type UserRole = "driver" | "host" | "admin" | "user";

export type SpaceType =
  | "covered"
  | "uncovered"
  | "driveway"
  | "dedicated_private"
  | "commercial_lot";

export type VehicleType =
  | "two_wheeler"
  | "hatchback"
  | "sedan"
  | "suv"
  | "ev";

export type ListingStatus = "published" | "draft" | "paused" | "flagged";

export type CancellationPolicy = "flexible" | "moderate" | "strict";

export type BookingStatus =
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled";

export type RefundStatus =
  | "none"
  | "pending_simulated"
  | "processed_simulated";

export type PayoutStatus = "pending_settlement" | "estimated";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  isVerified: boolean;
  avatarUrl: string;
  bio: string;
  upiId: string;
  defaultVehicleType?: VehicleType;
  defaultVehiclePlate?: string;
  isDemo: boolean;
  createdAt: string;
}

export interface ListingPhoto {
  id: string;
  url: string;
  caption: string;
  isPrimary: boolean;
}

export interface SpaceDimensions {
  lengthFt: number;
  widthFt: number;
  heightClearanceFt: number;
}

export interface OpeningHours {
  open: string; // "06:00"
  close: string; // "23:00"
  is24Hours: boolean;
}

export interface ParkingListing {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  hostVerified: boolean;
  title: string;
  subtitle: string;
  description: string;
  address: string;
  locality: string;
  city: string;
  landmark: string;
  latitude: number;
  longitude: number;
  spaceType: SpaceType;
  status: ListingStatus;
  vehicleTypes: VehicleType[];
  dimensions: SpaceDimensions;
  hourlyRateInr: number;
  dailyRateInr: number;
  monthlyRateInr?: number;
  isFeatured: boolean;
  amenities: string[];
  photos: ListingPhoto[];
  accessInstructions: string;
  parkingRules: string[];
  restrictions: string;
  cancellationPolicy: CancellationPolicy;
  minNoticeMinutes: number;
  openingHours: OpeningHours;
  availableDays: number[]; // 0 (Sun) - 6 (Sat)
  ratingAvg: number;
  reviewCount: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlockedPeriod {
  id: string;
  listingId: string;
  startTime: string; // ISO
  endTime: string; // ISO
  reason: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  referenceCode: string; // e.g. PKO-849201
  checkinPin: string; // e.g. 4829
  listingId: string;
  listingTitle: string;
  listingAddress: string;
  listingLocality: string;
  listingCity: string;
  listingPhotoUrl: string;
  listingSpaceType: SpaceType;
  cancellationPolicy: CancellationPolicy;
  accessInstructions: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  driverPhone: string;
  hostId: string;
  hostName: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
  startTime: string; // ISO
  endTime: string; // ISO
  durationHours: number;
  pricingMode: "hourly" | "daily" | "hybrid";
  baseSubtotalInr: number;
  platformCommissionPercent: number;
  driverServiceFeePercent: number;
  driverServiceFeeInr: number;
  platformHostCommissionInr: number;
  totalDriverPaidInr: number;
  netHostEarningsInr: number;
  status: BookingStatus;
  checkedInAt?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  refundAmountInr: number;
  refundStatus: RefundStatus;
  payoutStatus: PayoutStatus;
  paymentMethod: "upi_simulated" | "card_simulated";
  paymentReference: string;
  hasReview: boolean;
  isDemo: boolean;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  bookingReference: string;
  payerId: string;
  hostId: string;
  provider: "upi_simulated" | "card_simulated";
  paymentMethodDetail: string;
  amountInr: number;
  refundedAmountInr: number;
  currency: "INR";
  status:
    | "succeeded_simulated"
    | "refunded_simulated"
    | "partial_refund_simulated"
    | "failed";
  transactionRef: string;
  isSimulated: true;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  listingId: string;
  driverId: string;
  driverName: string;
  driverAvatar: string;
  rating: number;
  comment: string;
  isDemo: boolean;
  createdAt: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: "listing" | "booking" | "user";
  targetId: string;
  targetTitle: string;
  reasonCategory:
    | "inaccurate_location"
    | "safety_concern"
    | "access_issue"
    | "suspicious_listing"
    | "other";
  description: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface PlatformConfig {
  commissionRatePercent: number;
  driverServiceFeePercent: number;
  featuredListingMonthlyInr: number;
  proHostSubscriptionInr: number;
  paymentMode: "simulated_test";
  payoutMode: "estimated_pending";
}

export interface PriceBreakdown {
  durationHours: number;
  daysCount: number;
  remainingHours: number;
  pricingMode: "hourly" | "daily" | "hybrid";
  baseSubtotalInr: number;
  driverServiceFeePercent: number;
  driverServiceFeeInr: number;
  totalDriverPaidInr: number;
  platformCommissionPercent: number;
  platformHostCommissionInr: number;
  netHostEarningsInr: number;
  explanation: string;
}

export interface AvailabilityResult {
  available: boolean;
  reason?: string;
  conflictingBookingRef?: string;
  conflictingBlockReason?: string;
}

export interface UrbanHub {
  id: string;
  name: string;
  city: string;
  landmark: string;
  latitude: number;
  longitude: number;
  tag: string;
}

export interface DatabaseSchema {
  users: User[];
  listings: ParkingListing[];
  blockedPeriods: BlockedPeriod[];
  bookings: Booking[];
  payments: PaymentRecord[];
  reviews: Review[];
  reports: ModerationReport[];
  config: PlatformConfig;
}
