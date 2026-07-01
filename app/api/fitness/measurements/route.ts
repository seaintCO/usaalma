import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("fitness_measurements")
    .select("*")
    .eq("user_id", user.id)
    .order("measurement_date", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ measurements: data || [] });
}

export async function POST(req: Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();
  const supabase = await createClient();

  const { data, error: dbError } = await supabase
    .from("fitness_measurements")
    .insert({
      user_id: user.id,
      weight: body.weight || null,
      waist: body.waist || null,
      chest: body.chest || null,
      arms: body.arms || null,
      legs: body.legs || null,
      body_fat: body.body_fat || null,
      notes: body.notes || "",
      measurement_date: body.measurement_date || new Date().toISOString().slice(0,10),
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true, measurement: data });
}
