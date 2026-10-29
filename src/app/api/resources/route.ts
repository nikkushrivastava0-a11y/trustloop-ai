import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await db.from("resources").select("*").order("created_at", { ascending: false }).limit(100);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data);
}

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  // Explicit server-side owner gate. The resource RLS policy is a second boundary.
  // Existing institution demo owners may have been provisioned with inventory.
  const [{ data: profile }, { data: existingInventory }] = await Promise.all([
    db.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    db.from("resources").select("id").eq("owner_id", user.id).limit(1),
  ]);
  if (profile?.role !== "owner" && profile?.role !== "manager" && !existingInventory?.length)
    return NextResponse.json({ error: "Verified resource owner access required" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  if (!title || !category || !location || title.length > 150 || category.length > 80 || location.length > 200)
    return NextResponse.json({ error: "Valid title, category and location required" }, { status: 400 });
  const { data, error } = await db.from("resources").insert({
    owner_id: user.id, title, category, location,
    description: typeof body.description === "string" ? body.description.slice(0, 3000) : "",
    rules: typeof body.rules === "string" ? body.rules.slice(0, 3000) : "",
    requires_training: body.requires_training === true,
  }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data, { status: 201 });
}
