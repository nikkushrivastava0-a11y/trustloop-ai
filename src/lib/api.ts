import { realApi } from "./real-api";
import { resources, seedBookings } from "./fixtures";
import { validateBooking, validateTransition } from "./domain";
import type {
  Booking,
  BookingInput,
  BookingStatus,
  BookingEvent,
  ConditionReport,
  Resource,
  User,
  Role,
} from "./types";
const base = process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? undefined : "/api";
export const isDemo = !base;
const key = "trustloop.demo.v1";
interface DemoStore {
  resources: Resource[];
  bookings: Booking[];
  events: BookingEvent[];
  reports: ConditionReport[];
  user: User | null;
}
function read(): DemoStore {
  const saved = localStorage.getItem(key);
  if (saved) return JSON.parse(saved);
  return {
    resources,
    bookings: seedBookings,
    events: seedBookings.map((b) => ({
      id: crypto.randomUUID(),
      booking_id: b.id,
      status: b.status,
      at: new Date().toISOString(),
      note: "Booking request submitted",
    })),
    reports: [],
    user: null,
  };
}
function save(data: DemoStore) {
  localStorage.setItem(key, JSON.stringify(data));
}
export const api = {
  async resources(): Promise<Resource[]> {
    return base ? realApi.resources() : read().resources;
  },
  async bookings(): Promise<Booking[]> {
    if (base) return realApi.bookings();
    const d = read();
    return d.user?.role === "owner"
      ? d.bookings
      : d.bookings.filter((b) => b.student_id === d.user?.id);
  },
  async resourceBookings(
    id: string,
  ): Promise<Pick<Booking, "id" | "starts_at" | "ends_at" | "status">[]> {
    return base
      ? realApi.resourceBookings(id)
      : read().bookings.filter(
          (b) =>
            b.resource_id === id &&
            ["approved", "checked_out"].includes(b.status),
        );
  },
  async session(): Promise<User | null> {
    return base ? realApi.session() : read().user;
  },
  async authenticate(
    mode: "login" | "signup",
    data: { name: string; email: string; password: string; role: Role },
  ): Promise<User> {
    if (base) return realApi.authenticate(mode, data);
    const d = read();
    const user: User = {
      id: data.role === "student" ? "demo-student" : "demo-owner",
      name:
        data.name || (data.role === "student" ? "Alex Morgan" : "Jordan Lee"),
      email: data.email,
      role: data.role,
      trained_resource_ids: [],
    };
    d.user = user;
    save(d);
    return user;
  },
  async logout() {
    if (base) return realApi.logout();
    const d = read();
    d.user = null;
    save(d);
  },
  async createBooking(input: BookingInput): Promise<Booking> {
    if (base) return realApi.createBooking(input);
    const d = read();
    const resource = d.resources.find((r) => r.id === input.resource_id);
    if (!resource) throw new Error("Resource not found.");
    validateBooking(input, resource, d.user, d.bookings);
    const booking: Booking = {
      ...input,
      id: `TL-${crypto.randomUUID().slice(0, 8)}`,
      purpose: input.purpose.trim(),
      status: "requested",
      student_id: d.user!.id,
      student_name: d.user!.name,
    };
    d.bookings.unshift(booking);
    d.events.push({
      id: crypto.randomUUID(),
      booking_id: booking.id,
      status: "requested",
      at: new Date().toISOString(),
      note: "Booking request submitted",
    });
    save(d);
    return booking;
  },
  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    if (base) return realApi.updateStatus(id, status);
    const d = read(),
      booking = d.bookings.find((b) => b.id === id);
    if (!booking) throw new Error("Booking not found.");
    if (
      status === "cancelled"
        ? booking.student_id !== d.user?.id
        : d.user?.role !== "owner"
    )
      throw new Error("You do not have permission for this action.");
    validateTransition(booking, status, d.bookings);
    booking.status = status;
    d.events.push({
      id: crypto.randomUUID(),
      booking_id: id,
      status,
      at: new Date().toISOString(),
      note: `Booking ${status.replaceAll("_", " ")}`,
    });
    save(d);
    return booking;
  },
  async addResource(input: Omit<Resource, "id">): Promise<Resource> {
    if (base) return realApi.addResource(input);
    const d = read();
    if (d.user?.role !== "owner") throw new Error("Owner access required.");
    const r = { ...input, id: crypto.randomUUID() };
    d.resources.push(r);
    save(d);
    return r;
  },
  async history(
    id: string,
  ): Promise<{ events: BookingEvent[]; reports: ConditionReport[] }> {
    if (base) return realApi.history(id);
    const d = read();
    return {
      events: d.events.filter((e) => e.booking_id === id),
      reports: d.reports.filter((r) => r.booking_id === id),
    };
  },
  async report(
    id: string,
    kind: ConditionReport["kind"],
    notes: string,
    photos: File[],
    code?: string,
  ): Promise<ConditionReport> {
    if (base) return realApi.report(id, kind, notes, photos, code);
    const d = read(),
      b = d.bookings.find((b) => b.id === id);
    if (!b) throw new Error("Booking not found.");
    if (!d.user || (d.user.role !== "owner" && b.student_id !== d.user.id))
      throw new Error("You do not have permission for this booking.");
    if (kind !== "incident") {
      if (code !== id)
        throw new Error("The handover code does not match this booking.");
      validateTransition(
        b,
        kind === "checkout" ? "checked_out" : "returned",
        d.bookings,
      );
    }
    if (!notes.trim()) throw new Error("Add a condition note.");
    const report: ConditionReport = {
      id: crypto.randomUUID(),
      booking_id: id,
      kind,
      notes,
      photo_names: photos.map((f) => f.name),
      created_at: new Date().toISOString(),
    };
    d.reports.push(report);
    if (kind !== "incident") {
      b.status = kind === "checkout" ? "checked_out" : "returned";
      d.events.push({
        id: crypto.randomUUID(),
        booking_id: id,
        status: b.status,
        at: report.created_at,
        note: notes,
      });
    }
    save(d);
    return report;
  },
};
