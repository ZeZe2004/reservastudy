"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateBooking, overlaps } = require("../src/booking-domain.js");

const rooms = [{ id: "room-a" }, { id: "room-b" }];
const today = "2026-10-14";
const existing = [
  { id: "one", roomId: "room-a", date: today, start: "10:00", end: "11:00", status: "booked" }
];
const candidate = {
  roomId: "room-a",
  name: "José",
  date: today,
  start: "11:00",
  end: "12:00"
};

test("accepts a valid reservation and trims the student's name", () => {
  const result = validateBooking({ ...candidate, name: "  José  " }, existing, rooms, today);
  assert.equal(result.valid, true);
  assert.equal(result.name, "José");
  assert.deepEqual(result.errors, []);
});

test("rejects overlapping reservations for the same room and date", () => {
  const result = validateBooking({ ...candidate, start: "10:30", end: "11:30" }, existing, rooms, today);
  assert.equal(result.errors.includes("room-conflict"), true);
});

test("allows overlapping times in a different room", () => {
  const result = validateBooking({ ...candidate, roomId: "room-b", start: "10:30", end: "11:30" }, existing, rooms, today);
  assert.equal(result.valid, true);
});

test("allows adjacent reservations because the intervals do not overlap", () => {
  assert.equal(overlaps(
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" }
  ), false);
});

test("rejects invalid dates, unknown rooms and past dates", () => {
  assert.equal(validateBooking({ ...candidate, date: "2026-02-30" }, [], rooms, today).errors.includes("invalid-date"), true);
  assert.equal(validateBooking({ ...candidate, roomId: "unknown" }, [], rooms, today).errors.includes("invalid-room"), true);
  assert.equal(validateBooking({ ...candidate, date: "2026-10-13" }, [], rooms, today).errors.includes("past-date"), true);
});

test("rejects missing names, reversed times and hours outside opening times", () => {
  assert.equal(validateBooking({ ...candidate, name: " " }, [], rooms, today).errors.includes("invalid-name"), true);
  assert.equal(validateBooking({ ...candidate, start: "12:00", end: "11:00" }, [], rooms, today).errors.includes("invalid-time"), true);
  assert.equal(validateBooking({ ...candidate, start: "07:00" }, [], rooms, today).errors.includes("outside-hours"), true);
});

test("ignores cancelled reservations when checking conflicts", () => {
  const cancelled = [{ ...existing[0], status: "cancelled" }];
  assert.equal(validateBooking({ ...candidate, start: "10:30", end: "11:30" }, cancelled, rooms, today).valid, true);
});
