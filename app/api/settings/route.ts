import { ALLOWED_IMAGE_MODELS, ALLOWED_TEXT_MODELS } from "@/lib/ai/models";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const defaults = {
  timezone: "America/Chicago",
  theme: "light",
  preferredAiModel: "gpt-4.1-mini",
  preferredImageModel: "gpt-image-2",
  notificationEmailEnabled: true,
  notificationInAppEnabled: true,
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  const supabase = await createClient();
  const [
    { data: profile, error: profileError },
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("email,preferred_language,alma_mode")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("alma_user_settings")
      .select(
        "timezone,theme,preferred_ai_model,preferred_image_model,notification_email_enabled,notification_in_app_enabled",
      )
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);
  if (profileError || settingsError)
    return NextResponse.json(
      { ok: false, error: "settings_unavailable" },
      { status: 503 },
    );
  return NextResponse.json({
    ok: true,
    profile: {
      email: profile?.email ?? user.email ?? "",
      language: profile?.preferred_language ?? "auto",
      almaMode: profile?.alma_mode ?? "auto",
    },
    settings: {
      timezone: settings?.timezone ?? defaults.timezone,
      theme: settings?.theme ?? defaults.theme,
      preferredAiModel: ALLOWED_TEXT_MODELS.has(
        settings?.preferred_ai_model ?? "",
      )
        ? settings!.preferred_ai_model
        : defaults.preferredAiModel,
      preferredImageModel: ALLOWED_IMAGE_MODELS.has(
        settings?.preferred_image_model ?? "",
      )
        ? settings!.preferred_image_model
        : defaults.preferredImageModel,
      notificationEmailEnabled:
        settings?.notification_email_enabled ??
        defaults.notificationEmailEnabled,
      notificationInAppEnabled:
        settings?.notification_in_app_enabled ??
        defaults.notificationInAppEnabled,
    },
    modelChoices: {
      text: [...ALLOWED_TEXT_MODELS],
      image: [...ALLOWED_IMAGE_MODELS],
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  const body = await request.json().catch(() => ({}));
  const language = ["auto", "en", "es"].includes(body.language)
    ? body.language
    : undefined;
  const almaMode = ["auto", "fast", "deep"].includes(body.almaMode)
    ? body.almaMode
    : undefined;
  const timezone =
    typeof body.timezone === "string" && body.timezone.length <= 80
      ? body.timezone
      : undefined;
  const theme = ["light", "dark", "system"].includes(body.theme)
    ? body.theme
    : undefined;
  const preferredAiModel = ALLOWED_TEXT_MODELS.has(body.preferredAiModel)
    ? body.preferredAiModel
    : undefined;
  const preferredImageModel = ALLOWED_IMAGE_MODELS.has(body.preferredImageModel)
    ? body.preferredImageModel
    : undefined;
  const notificationEmailEnabled =
    typeof body.notificationEmailEnabled === "boolean"
      ? body.notificationEmailEnabled
      : undefined;
  const notificationInAppEnabled =
    typeof body.notificationInAppEnabled === "boolean"
      ? body.notificationInAppEnabled
      : undefined;
  const supabase = await createClient();
  if (language || almaMode) {
    const { error } = await supabase
      .from("profiles")
      .update({
        ...(language ? { preferred_language: language } : {}),
        ...(almaMode ? { alma_mode: almaMode } : {}),
      })
      .eq("id", user.id);
    if (error)
      return NextResponse.json(
        { ok: false, error: "profile_update_failed" },
        { status: 503 },
      );
  }
  const payload = {
    user_id: user.id,
    ...(timezone ? { timezone } : {}),
    ...(theme ? { theme } : {}),
    ...(preferredAiModel ? { preferred_ai_model: preferredAiModel } : {}),
    ...(preferredImageModel
      ? { preferred_image_model: preferredImageModel }
      : {}),
    ...(notificationEmailEnabled !== undefined
      ? { notification_email_enabled: notificationEmailEnabled }
      : {}),
    ...(notificationInAppEnabled !== undefined
      ? { notification_in_app_enabled: notificationInAppEnabled }
      : {}),
  };
  const { data: existing } = await supabase
    .from("alma_user_settings")
    .select("user_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const { error } = existing
    ? await supabase
        .from("alma_user_settings")
        .update(payload)
        .eq("user_id", user.id)
    : await supabase.from("alma_user_settings").insert(payload);
  if (error)
    return NextResponse.json(
      { ok: false, error: "settings_update_failed" },
      { status: 503 },
    );
  return GET();
}
