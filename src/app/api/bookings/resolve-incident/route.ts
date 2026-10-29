import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const incidentId = body.incident_id;
  const resolution = typeof body.resolution === "string" ? body.resolution.trim() : "";
  if (typeof incidentId !== "string" || !uuid.test(incidentId) ||
      resolution.length < 5 || resolution.length > 2000) {
    return NextResponse.json({ error: "Valid incident and 5–2000 character resolution required" }, { status: 400 });
  }

  // RLS restricts updates to the resource owner; database trigger makes reports immutable
  // and writes an auditable resolution event. Do not use a service-role client here.
  const { data, error } = await db.from("incidents").update({ resolution })
    .eq("id", incidentId).is("resolution", null)
    .select("id,booking_id,resolution").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not record resolution" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Incident not found, already resolved, or access denied" }, { status: 403 });
  return NextResponse.json(data);
}
