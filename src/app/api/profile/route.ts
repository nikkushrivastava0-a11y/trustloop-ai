import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await db.from("profiles")
    .select("id,full_name,role,institution,training_verified,created_at")
    .eq("id", user.id).single();
  return error ? NextResponse.json({ error: error.message }, { status: 404 }) : NextResponse.json(data);
}
