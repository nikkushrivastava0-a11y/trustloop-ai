import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: { booking_id?: string; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.booking_id || !/^[0-9a-f-]{36}$/i.test(body.booking_id)) return NextResponse.json({ error: "Valid booking ID required" }, { status: 400 });
  if (body.reason && body.reason.length > 500) return NextResponse.json({ error: "Reason too long" }, { status: 400 });
  const { data, error } = await db.rpc("cancel_booking", { p_booking_id: body.booking_id, p_reason: body.reason || null });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}
