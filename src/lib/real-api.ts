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
    // Training is a profile-level flag in the live schema; reflect it in UI
    // eligibility instead of always treating verified students as untrained.
    const { data: trainingResources } = profile?.training_verified
      ? await db.from("resources").select("id").eq("requires_training", true)
      : { data: [] as { id: string }[] };
    return {
      id: user.id,
      email: user.email || "",
      name: profile?.full_name || user.email?.split("@")[0] || "Member",
      role: profile?.role === "owner" || profile?.role === "manager" || ownsResources ? "owner" : "student",
      trained_resource_ids: (trainingResources || []).map((resource) => resource.id),
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
  async updateStatus(id: string, status: BookingStatus, reason?: string): Promise<Booking> {
    if (!["approved","rejected","waitlisted","cancelled"].includes(status))
      throw new Error("This action is not yet supported in live mode.");
    const row = await request<DBBooking>(status === "cancelled" ? "/bookings/cancel" : "/bookings/review", {
      method: "POST", body: JSON.stringify(status === "cancelled" ? { booking_id: id } : { booking_id: id, decision: status, reason: reason || undefined })
    });
    return bookingFromDB(row);
  },
  async history(id: string): Promise<{events: BookingEvent[]; reports: ConditionReport[]}> {
    const data = await request<{
      events: {id: number; action: string; created_at: string; details: Record<string, unknown>}[];
      reports: {id:string;booking_id:string;stage:"checkout"|"return";notes:string;photo_url:string|null;created_at:string}[];
      incidents: {id:string;booking_id:string;kind:string;details:string;resolution:string|null;created_at:string}[];
    }>("/bookings/history?booking_id=" + encodeURIComponent(id));
    const events = data.events.map(e => ({
      id: String(e.id), booking_id: id, action: e.action,
      status: (["approved","rejected","waitlisted","checked_out","returned","cancelled"].includes(e.action)
        ? e.action : e.action === "checkout" ? "checked_out" : e.action === "return" ? "returned" : "requested") as BookingStatus,
      at: e.created_at, note: typeof e.details?.reason === "string" && e.details.reason.trim() ? `${e.action.replaceAll("_"," ")}: ${e.details.reason}` : typeof e.details?.resolution === "string" && e.details.resolution.trim() ? `Incident resolved: ${e.details.resolution}` : e.action.replaceAll("_"," ")
    }));
    const db = client();
    const reports: ConditionReport[] = [
      ...data.reports.map(r => ({
        id:r.id,booking_id:r.booking_id,kind:r.stage,notes:r.notes,photo_names:[],created_at:r.created_at
      })),
      ...data.incidents.map(r => ({
        id:r.id,booking_id:r.booking_id,kind:"incident" as const,
        notes:`${r.kind.toUpperCase()}: ${r.details}`,photo_names:[],created_at:r.created_at,resolution:r.resolution
      }))
    ];
    for (const report of data.reports) {
      if (!report.photo_url) continue;
      const { data: signed } = await db.storage.from("trustloop-conditions").createSignedUrl(report.photo_url, 3600);
      const matching = reports.find((item) => item.id === report.id);
      if (matching && signed?.signedUrl) matching.photo_names = [signed.signedUrl];
    }
    return { events, reports };
  },
  async resolveIncident(id: string, resolution: string): Promise<void> {
    await request("/bookings/resolve-incident", {method:"POST",body:JSON.stringify({incident_id:id,resolution})});
  },
  async handoverPass(id: string): Promise<string> {
    const db = client();
    const { data, error } = await db.rpc("get_handover_pass", { p_booking_id: id });
    if (error) throw new Error(error.message);
    return String(data);
  },
  async report(id: string, kind: ConditionReport["kind"], notes: string, photos: File[], code?: string, incidentKind: "damage" | "delay" | "conflict" | "other" = "other"): Promise<ConditionReport> {
    if (kind === "incident" && photos.length) throw new Error("Incident photo upload is not yet supported. Include details in the incident notes.");
    if (photos.length > 1) throw new Error("Upload one condition photo per handover.");
    if (kind !== "incident" && !code)
      throw new Error("Enter the student handover pass shown by the requester.");
    const now = new Date().toISOString();
    if (kind === "incident") {
      const result = await request<{id:string;created_at:string}>("/bookings/incident", {
        method:"POST", body:JSON.stringify({booking_id:id,kind:incidentKind,details:notes})
      });
      return {id:result.id,booking_id:id,kind,notes,photo_names:[],created_at:result.created_at};
    }
    let photoUrl: string | null = null;
    if (photos.length) {
      const photo = photos[0];
      if (!["image/jpeg","image/png","image/webp"].includes(photo.type) || photo.size > 5 * 1024 * 1024)
        throw new Error("Choose a JPEG, PNG or WebP image under 5 MB.");
      const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      photoUrl = `${id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await client().storage.from("trustloop-conditions")
        .upload(photoUrl, photo, { contentType: photo.type, upsert: false });
      if (uploadError) throw new Error("Condition photo upload failed: " + uploadError.message);
    }
    try {
      await request("/bookings/handover", {method:"POST",body:JSON.stringify({booking_id:id,stage:kind,notes,passcode:code,photo_url:photoUrl})});
    } catch (error) {
      if (photoUrl) await client().storage.from("trustloop-conditions").remove([photoUrl]).catch(() => {});
      throw error;
    }
    return {id:crypto.randomUUID(),booking_id:id,kind,notes,photo_names:photos.map(p => p.name),created_at:now};
  }
};
