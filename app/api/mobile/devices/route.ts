import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

const EXPO_TOKEN = /^(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DeviceInput = {
  expoPushToken?: unknown;
  deviceId?: unknown;
  platform?: unknown;
  appVersion?: unknown;
  locale?: unknown;
};

function safeText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mobile_push_devices")
    .select("id,platform,app_version,locale,enabled,last_seen_at,created_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });
  if (error)
    return NextResponse.json(
      { error: "Mobile device registration is unavailable." },
      { status: 503 },
    );
  return NextResponse.json({ devices: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as DeviceInput | null;
  const expoPushToken = safeText(body?.expoPushToken, 256);
  const deviceId = safeText(body?.deviceId, 64);
  const appVersion = safeText(body?.appVersion, 32) || null;
  const locale = safeText(body?.locale, 8).toLowerCase();

  if (!EXPO_TOKEN.test(expoPushToken) || !UUID.test(deviceId))
    return NextResponse.json(
      { error: "Invalid mobile device registration." },
      { status: 400 },
    );
  if (body?.platform !== "ios" || !["en", "es"].includes(locale))
    return NextResponse.json(
      { error: "Unsupported mobile device." },
      { status: 400 },
    );

  const supabase = await createClient();
  const { error } = await supabase.from("mobile_push_devices").upsert(
    {
      user_id: user.id,
      device_id: deviceId,
      expo_push_token: expoPushToken,
      platform: "ios",
      app_version: appVersion,
      locale,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_id" },
  );
  if (error)
    return NextResponse.json(
      { error: "Mobile device registration is unavailable." },
      { status: 503 },
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as DeviceInput | null;
  const deviceId = safeText(body?.deviceId, 64);
  if (!UUID.test(deviceId))
    return NextResponse.json(
      { error: "Invalid device identifier." },
      { status: 400 },
    );
  const supabase = await createClient();
  const { error } = await supabase
    .from("mobile_push_devices")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("device_id", deviceId);
  if (error)
    return NextResponse.json(
      { error: "Device update failed." },
      { status: 503 },
    );
  return NextResponse.json({ ok: true });
}
