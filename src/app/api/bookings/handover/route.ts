import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (typeof body.booking_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.booking_id) ||
      !["checkout", "return"].includes(String(body.stage)) ||
      typeof body.notes !== "string" || body.notes.trim().length < 3 ||
      body.notes.length > 2000 ||
      (body.photo_url !== undefined && (typeof body.photo_url !== "string" || body.photo_url.length > 1000))) {
    return NextResponse.json({ error: "Invalid booking, stage or condition notes" }, { status: 400 });
  }
  const { data, error } = await db.rpc("record_handover", {
    p_booking_id: body.booking_id,
    p_stage: body.stage,
    p_notes: body.notes.trim(),
    p_photo_url: typeof body.photo_url === "string" ? body.photo_url : null
  });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}
