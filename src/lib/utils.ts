import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** ISO start/end for a booking window from date ("2026-10-24"), time ("10:00") and a duration. */
export function buildTimeWindow(date: string, time: string, durationHours: number) {
  let start = new Date(`${date}T${time}:00`);
  if (isNaN(start.getTime())) start = new Date(Date.now() + 24 * 3600 * 1000);
  const end = new Date(start.getTime() + durationHours * 3600 * 1000);
  return { startTimeIso: start.toISOString(), endTimeIso: end.toISOString() };
}

export function tomorrowDateString(): string {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const DURATION_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 3, label: "3 hours" },
  { value: 4, label: "4 hours" },
  { value: 8, label: "Full day" },
  { value: 12, label: "Overnight" },
  { value: 24, label: "24 hours" },
];
