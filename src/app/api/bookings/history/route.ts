import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("booking_id");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({ error: "Valid booking_id required" }, { status: 400 });
  const { data: booking } = await db.from("bookings").select("id").eq("id", id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found or access denied" }, { status: 404 });
  const [events, reports, incidents] = await Promise.all([
    db.from("audit_logs").select("id,actor_id,action,details,created_at").eq("booking_id", id).order("created_at"),
    db.from("condition_reports").select("id,author_id,stage,notes,photo_url,created_at").eq("booking_id", id).order("created_at"),
    db.from("incidents").select("id,reporter_id,kind,details,resolution,created_at").eq("booking_id", id).order("created_at")
  ]);
  const error = events.error || reports.error || incidents.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: events.data, reports: reports.data, incidents: incidents.data });
}
