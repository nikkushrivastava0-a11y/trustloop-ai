import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateBooking,
  validateTransition,
  overlaps,
  eligible,
} from "../src/lib/domain.ts";
import type {
  Booking,
  BookingInput,
  Resource,
  User,
} from "../src/lib/types.ts";
const student: User = {
  id: "s",
  name: "Student",
  email: "s@campus.edu",
  role: "student",
  trained_resource_ids: [],
};
const resource: Resource = {
  id: "camera",
  title: "Camera",
  category: "Photo",
  description: "Camera kit",
  location: "Lab",
  rules: [],
  available: true,
  requires_training: false,
};
const input: BookingInput = {
  resource_id: "camera",
  starts_at: "2035-01-02T10:00:00Z",
  ends_at: "2035-01-02T12:00:00Z",
  purpose: "Campus documentary filming",
};
const booking: Booking = { ...input, id: "one", status: "requested" };
test("valid future student request passes", () =>
  assert.doesNotThrow(() => validateBooking(input, resource, student, [])));
test("past dates, reversed dates, untrained and unavailable resources are rejected", () => {
  assert.throws(
    () =>
      validateBooking(
        { ...input, starts_at: "2020-01-01" },
        resource,
        student,
        [],
      ),
    /future/,
  );
  assert.throws(
    () =>
      validateBooking(
        { ...input, ends_at: input.starts_at },
        resource,
        student,
        [],
      ),
    /end time/,
  );
  assert.throws(
    () =>
      validateBooking(
        input,
        { ...resource, requires_training: true },
        student,
        [],
      ),
    /training/,
  );
  assert.throws(
    () =>
      validateBooking(input, { ...resource, available: false }, student, []),
    /unavailable/,
  );
  assert.equal(
    eligible(
      { ...resource, requires_training: true },
      { ...student, trained_resource_ids: ["camera"] },
    ),
    true,
  );
});
test("approved bookings block overlapping requests but adjacent slots are valid", () => {
  const approved: Booking = { ...booking, status: "approved" };
  assert.throws(
    () => validateBooking(input, resource, student, [approved]),
    /overlaps/,
  );
  assert.equal(
    overlaps(input, {
      starts_at: input.ends_at,
      ends_at: "2035-01-02T13:00:00Z",
    }),
    false,
  );
  assert.doesNotThrow(() =>
    validateBooking(input, resource, student, [
      { ...approved, resource_id: "other" },
    ]),
  );
});
test("owner cannot double approve a slot; waitlisting remains allowed", () => {
  const approved: Booking = { ...booking, id: "two", status: "approved" };
  assert.throws(
    () => validateTransition(booking, "approved", [booking, approved]),
    /already occupies/,
  );
  assert.doesNotThrow(() =>
    validateTransition(booking, "waitlisted", [booking, approved]),
  );
});
test("handover lifecycle and terminal statuses are enforced", () => {
  assert.throws(
    () => validateTransition(booking, "returned", []),
    /Cannot change/,
  );
  assert.doesNotThrow(() =>
    validateTransition({ ...booking, status: "approved" }, "checked_out", []),
  );
  assert.doesNotThrow(() =>
    validateTransition({ ...booking, status: "checked_out" }, "returned", []),
  );
  assert.throws(
    () =>
      validateTransition({ ...booking, status: "returned" }, "approved", []),
    /Cannot change/,
  );
});
