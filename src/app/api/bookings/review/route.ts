import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.booking_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.booking_id) ||
      !["approved", "rejected", "waitlisted"].includes(String(body.decision)))
    return NextResponse.json({ error: "Valid booking_id and decision required" }, { status: 400 });
  const { data, error } = await db.rpc("review_booking", {
    p_booking_id: body.booking_id,
    p_decision: body.decision,
    p_reason: typeof body.reason === "string" ? body.reason.slice(0, 500) : null,
  });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}
