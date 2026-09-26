import { randomBytes } from "node:crypto";

export const ACTIVE_STATUSES = [
  "PENDING_APPROVAL",
  "AWAITING_PAYMENT",
  "PAYMENT_REVIEW",
  "CONFIRMED",
] as const;

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

export function bookingReference(date: string) {
  return `MJ-${date.replaceAll("-", "")}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function minutes(time: string) {
  const [hours, mins] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + mins;
}

export function isPastSlot(date: string, today: string, start: string, currentTime: string) {
  return date === today && minutes(start) <= minutes(currentTime);
}

export function validateRange(start: string, end: string, opening: string, closing: string, interval: number) {
  const from = minutes(start);
  const to = minutes(end);
  const open = minutes(opening);
  const close = minutes(closing);
  return from >= open && to <= close && to > from && (from - open) % interval === 0 && (to - open) % interval === 0;
}

export function rupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export function shortTime(time: string) {
  return time.slice(0, 5);
}
