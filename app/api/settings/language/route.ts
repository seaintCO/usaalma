import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ALMA_LOCALE_COOKIE, isAlmaLocale } from "@/lib/i18n/locale";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ language: "en" });

  const { data } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    language: isAlmaLocale(data?.preferred_language)
      ? data.preferred_language
      : "en",
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { language } = await req.json();

  if (!isAlmaLocale(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  await supabase.from("profiles").upsert({
    id: user.id,
    preferred_language: language,
    updated_at: new Date().toISOString(),
  });

  const response = NextResponse.json({ success: true, language });
  response.cookies.set(ALMA_LOCALE_COOKIE, language, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
