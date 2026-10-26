import type { CancellationPolicy, SpaceType, VehicleType } from "./types";

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  covered: "Covered bay",
  uncovered: "Open spot",
  driveway: "Private driveway",
  dedicated_private: "Dedicated slot",
  commercial_lot: "Commercial lot",
};

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  two_wheeler: "Two-wheeler",
  hatchback: "Hatchback",
  sedan: "Sedan",
  suv: "SUV",
  ev: "EV",
};

export const POLICY_LABELS: Record<CancellationPolicy, { title: string; detail: string }> = {
  flexible: {
    title: "Flexible cancellation",
    detail: "Full refund up to 2 hours before you arrive.",
  },
  moderate: {
    title: "Moderate cancellation",
    detail: "Full refund up to 24 hours before you arrive.",
  },
  strict: {
    title: "Strict cancellation",
    detail: "Full refund up to 48 hours before you arrive.",
  },
};
