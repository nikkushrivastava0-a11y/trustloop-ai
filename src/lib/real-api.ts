import { createClient } from "@/lib/supabase/client";
import type { Booking, BookingInput, BookingStatus, BookingEvent, ConditionReport, Resource, User, Role } from "./types";

function client() { return createClient(); }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    credentials: "include",
    headers: {
      ...(options?.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const problem = payload as { error?: string; message?: string };
    throw new Error(problem.error || problem.message || "Request failed (" + response.status + ")");
  }
  return payload as T;
}

type DBResource = Omit<Resource, "rules"> & { rules: string; owner_id: string };
type DBBooking = Booking & { requester_id: string; resources?: {title: string; location: string; owner_id: string} | null };
function resourceFromDB(r: DBResource): Resource {
  return { ...r, rules: (r.rules || "").split("\n").map(s => s.trim()).filter(Boolean) };
}
function bookingFromDB(b: DBBooking): Booking {
  return { ...b, student_id: b.requester_id, student_name: undefined };
}

export const realApi = {
  async session(): Promise<User | null> {
    const db = client();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return null;
    const { data: profile } = await db.from("profiles")
      .select("full_name,role,training_verified").eq("id", user.id).maybeSingle();
    const { data: ownedResources } = await db.from("resources").select("id").eq("owner_id", user.id).limit(1);
    const ownsResources = (ownedResources?.length || 0) > 0;
    return {
      id: user.id,
      email: user.email || "",
      name: profile?.full_name || user.email?.split("@")[0] || "Member",
      role: profile?.role === "owner" || profile?.role === "manager" || ownsResources ? "owner" : "student",
      trained_resource_ids: [],
    };
  },
  async authenticate(mode: "login" | "signup", input: { name: string; email: string; password: string; role: Role }): Promise<User> {
    const db = client();
    if (mode === "signup") {
      const { data, error } = await db.auth.signUp({
        email: input.email, password: input.password,
        options: { data: { full_name: input.name } },
      });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error("Account created. Confirm your email before signing in.");
      // Owner access is granted by a verified institution manager, never self-assigned.
    } else {
      const { error } = await db.auth.signInWithPassword({ email: input.email, password: input.password });
      if (error) throw new Error(error.message);
    }
    const user = await realApi.session();
    if (!user) throw new Error("Could not establish a verified session.");
    return user;
  },
  async logout(): Promise<void> {
    const { error } = await client().auth.signOut();
    if (error) throw new Error(error.message);
  },
  async resources(): Promise<Resource[]> {
    const rows = await request<DBResource[]>("/resources");
    return rows.map(resourceFromDB);
  },
  async addResource(input: Omit<Resource, "id">): Promise<Resource> {
    const row = await request<DBResource>("/resources", {
      method: "POST", body: JSON.stringify({
        ...input, rules: input.rules.join("\n")
      })
    });
    return resourceFromDB(row);
  },
  async resourceBookings(id: string): Promise<Pick<Booking, "id" | "starts_at" | "ends_at" | "status">[]> {
    // Show only own/managed reservations. The backend checks other users' conflicts on approval.
    const rows = await realApi.bookings();
    return rows.filter(b => b.resource_id === id && ["approved","checked_out"].includes(b.status))
      .map(({id: bid,starts_at,ends_at,status}) => ({id: bid,starts_at,ends_at,status}));
  },
  async bookings(): Promise<Booking[]> {
    const rows = await request<DBBooking[]>("/bookings");
    return rows.map(bookingFromDB);
  },
  async createBooking(input: BookingInput): Promise<Booking> {
    const row = await request<DBBooking>("/bookings", { method: "POST", body: JSON.stringify(input) });
    return bookingFromDB(row);
  },
  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    if (!["approved","rejected","waitlisted"].includes(status))
      throw new Error("This action is not yet supported in live mode.");
    const row = await request<DBBooking>("/bookings/review", {
      method: "POST", body: JSON.stringify({ booking_id: id, decision: status })
    });
    return bookingFromDB(row);
  },
  async history(id: string): Promise<{events: BookingEvent[]; reports: ConditionReport[]}> {
    const data = await request<{
      events: {id: number; action: string; created_at: string; details: Record<string, unknown>}[];
      reports: {id:string;booking_id:string;stage:"checkout"|"return";notes:string;created_at:string}[];
      incidents: {id:string;booking_id:string;kind:string;details:string;created_at:string}[];
    }>("/bookings/history?booking_id=" + encodeURIComponent(id));
    const events = data.events.map(e => ({
      id: String(e.id), booking_id: id,
      status: (["approved","rejected","waitlisted","checked_out","returned","cancelled"].includes(e.action)
        ? e.action : e.action === "checkout" ? "checked_out" : e.action === "return" ? "returned" : "requested") as BookingStatus,
      at: e.created_at, note: e.action.replaceAll("_"," ")
    }));
    const reports: ConditionReport[] = [
      ...data.reports.map(r => ({
        id:r.id,booking_id:r.booking_id,kind:r.stage,notes:r.notes,photo_names:[],created_at:r.created_at
      })),
      ...data.incidents.map(r => ({
        id:r.id,booking_id:r.booking_id,kind:"incident" as const,
        notes:r.details,photo_names:[],created_at:r.created_at
      }))
    ];
    return { events, reports };
  },
  async report(id: string, kind: ConditionReport["kind"], notes: string, photos: File[], code?: string): Promise<ConditionReport> {
    if (photos.length) throw new Error("Photo uploads are not yet supported in live mode. Remove files and record detailed condition notes.");
    if (kind !== "incident" && code !== id)
      throw new Error("Enter the booking ID shown beside the QR code.");
    const now = new Date().toISOString();
    if (kind === "incident") {
      const result = await request<{id:string;created_at:string}>("/bookings/incident", {
        method:"POST", body:JSON.stringify({booking_id:id,kind:"other",details:notes})
      });
      return {id:result.id,booking_id:id,kind,notes,photo_names:[],created_at:result.created_at};
    }
    await request("/bookings/handover", {method:"POST",body:JSON.stringify({booking_id:id,stage:kind,notes})});
    return {id:crypto.randomUUID(),booking_id:id,kind,notes,photo_names:[],created_at:now};
  }
};
