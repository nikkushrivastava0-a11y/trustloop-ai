import type {
  Booking,
  BookingInput,
  BookingStatus,
  Resource,
  User,
} from "./types";
export const transitions: Record<BookingStatus, BookingStatus[]> = {
  requested: ["approved", "rejected", "waitlisted", "cancelled"],
  approved: ["checked_out", "cancelled"],
  rejected: [],
  waitlisted: ["approved", "rejected", "cancelled"],
  checked_out: ["returned"],
  returned: [],
  cancelled: [],
};
export function eligible(resource: Resource, user: User | null) {
  return (
    !!user &&
    (!resource.requires_training ||
      user.trained_resource_ids.includes(resource.id))
  );
}
export function overlaps(
  a: Pick<Booking, "starts_at" | "ends_at">,
  b: Pick<Booking, "starts_at" | "ends_at">,
) {
  return (
    Date.parse(a.starts_at) < Date.parse(b.ends_at) &&
    Date.parse(b.starts_at) < Date.parse(a.ends_at)
  );
}
export function validateBooking(
  input: BookingInput,
  resource: Resource,
  user: User | null,
  bookings: Booking[],
  now = Date.now(),
) {
  if (!user || user.role !== "student")
    throw new Error("Sign in as a student to request equipment.");
  if (!resource.available)
    throw new Error("This resource is currently unavailable.");
  if (!eligible(resource, user))
    throw new Error(
      "Complete the required training before booking this resource.",
    );
  const start = Date.parse(input.starts_at),
    end = Date.parse(input.ends_at);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start <= now ||
    end <= start
  )
    throw new Error("Choose a future start time and an end time after it.");
  if (input.purpose.trim().length < 10)
    throw new Error("Tell us about your project in at least 10 characters.");
  if (
    bookings.some(
      (b) =>
        b.resource_id === input.resource_id &&
        ["approved", "checked_out"].includes(b.status) &&
        overlaps(input, b),
    )
  )
    throw new Error(
      "This time overlaps an approved booking. Please choose another slot.",
    );
}
export function validateTransition(
  booking: Booking,
  status: BookingStatus,
  all: Booking[],
) {
  if (!transitions[booking.status].includes(status))
    throw new Error(
      `Cannot change ${booking.status} to ${status}. Refresh and try again.`,
    );
  if (
    status === "approved" &&
    all.some(
      (b) =>
        b.id !== booking.id &&
        b.resource_id === booking.resource_id &&
        ["approved", "checked_out"].includes(b.status) &&
        overlaps(booking, b),
    )
  )
    throw new Error(
      "An approved booking already occupies this time. Waitlist this request instead.",
    );
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
