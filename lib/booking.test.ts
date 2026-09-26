import assert from "node:assert/strict";
import test from "node:test";
import { isPastSlot, normalizePhone, validateRange } from "./booking.ts";

test("normalizes Indonesian WhatsApp numbers", () => {
  assert.equal(normalizePhone("0812 3456-789"), "628123456789");
  assert.equal(normalizePhone("+62 812 3456 789"), "628123456789");
});

test("accepts only positive aligned ranges inside opening hours", () => {
  assert.equal(validateRange("14:00", "17:00", "10:00", "22:00", 60), true);
  assert.equal(validateRange("09:00", "11:00", "10:00", "22:00", 60), false);
  assert.equal(validateRange("14:30", "16:00", "10:00", "22:00", 60), false);
  assert.equal(validateRange("14:30", "15:30", "10:00", "22:00", 60), false);
  assert.equal(validateRange("14:00", "14:00", "10:00", "22:00", 60), false);
});

test("marks only today's elapsed start times as past", () => {
  assert.equal(isPastSlot("2026-09-26", "2026-09-26", "14:00", "14:30"), true);
  assert.equal(isPastSlot("2026-09-26", "2026-09-26", "15:00", "14:30"), false);
  assert.equal(isPastSlot("2026-09-27", "2026-09-26", "10:00", "14:30"), false);
});
