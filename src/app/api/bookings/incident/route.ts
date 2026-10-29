import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const id = body.booking_id;
  const kind = body.kind;
  const details = body.details;
  if (typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !["damage", "delay", "conflict", "other"].includes(String(kind)) ||
      typeof details !== "string" || details.trim().length < 5 || details.length > 3000)
    return NextResponse.json({ error: "Valid booking_id, kind and details required" }, { status: 400 });
  const { data, error } = await db.rpc("file_booking_incident", {
    p_booking_id: id, p_kind: kind, p_details: details.trim()
  });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data, { status: 201 });
}
