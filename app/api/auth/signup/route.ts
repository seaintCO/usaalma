import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const fullName = String(body.fullName || "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ""}/login`,
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (data.user) {
    await supabase.from("profiles").upsert({
      id:data.user.id,
      email,
      full_name:fullName,
      updated_at:new Date().toISOString(),
    });

    await supabase.from("subscriptions").upsert({
      user_id:data.user.id,
      plan:"free",
      status:"inactive",
      updated_at:new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: true, user: data.user });
}
