(function (root, factory) {
  const domain = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = domain;
  }
  root.BookingDomain = domain;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
  const OPENING_MINUTE = 8 * 60;
  const CLOSING_MINUTE = 21 * 60;

  function minutesSinceMidnight(value) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      return null;
    }
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function isCalendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }

  function overlaps(first, second) {
    const firstStart = minutesSinceMidnight(first.start);
    const firstEnd = minutesSinceMidnight(first.end);
    const secondStart = minutesSinceMidnight(second.start);
    const secondEnd = minutesSinceMidnight(second.end);
    return firstStart !== null
      && firstEnd !== null
      && secondStart !== null
      && secondEnd !== null
      && firstStart < secondEnd
      && secondStart < firstEnd;
  }

  function validateBooking(candidate, bookings, rooms, today) {
    const errors = [];
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const start = minutesSinceMidnight(candidate.start);
    const end = minutesSinceMidnight(candidate.end);

    if (!name || name.length > 80) {
      errors.push("invalid-name");
    }
    if (!rooms.some((room) => room.id === candidate.roomId)) {
      errors.push("invalid-room");
    }
    if (!isCalendarDate(candidate.date)) {
      errors.push("invalid-date");
    } else if (candidate.date < today) {
      errors.push("past-date");
    }
    if (start === null || end === null || start >= end) {
      errors.push("invalid-time");
    } else if (start < OPENING_MINUTE || end > CLOSING_MINUTE) {
      errors.push("outside-hours");
    }
    if (start !== null && end !== null && start < end && isCalendarDate(candidate.date)) {
      const hasConflict = bookings.some((booking) => booking.status !== "cancelled"
        && booking.roomId === candidate.roomId
        && booking.date === candidate.date
        && overlaps(booking, candidate));
      if (hasConflict) {
        errors.push("room-conflict");
      }
    }

    return { valid: errors.length === 0, errors, name };
  }

  return { isCalendarDate, minutesSinceMidnight, overlaps, validateBooking };
});
