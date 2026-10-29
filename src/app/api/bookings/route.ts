import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await db.from("bookings").select("*, resources(title, location, owner_id)").order("created_at", { ascending: false }).limit(100);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data);
}

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const resource_id = body.resource_id;
  const starts_at = body.starts_at;
  const ends_at = body.ends_at;
  const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
  if (purpose.length < 10 || purpose.length > 1000)
    return NextResponse.json({ error: "Describe the purpose in 10–1000 characters" }, { status: 400 });
  if (typeof resource_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource_id) || typeof starts_at !== "string" || typeof ends_at !== "string")
    return NextResponse.json({ error: "Valid resource_id, starts_at, ends_at required" }, { status: 400 });
  const start = Date.parse(starts_at), end = Date.parse(ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < Date.now() || end <= start || end - start > 7 * 86400000)
    return NextResponse.json({ error: "Invalid booking window (maximum 7 days)" }, { status: 400 });
  const { data, error } = await db.from("bookings").insert({
    requester_id: user.id, resource_id,
    starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString(),
    purpose,
  }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data, { status: 201 });
}
