import { createClient } from "@/lib/supabase/server";

export async function checkAiRateLimit({
  userId,
  ip,
  feature,
  dailyLimit = 5,
  cooldownSeconds = 45
}: {
  userId?: string | null;
  ip?: string | null;
  feature: string;
  dailyLimit?: number;
  cooldownSeconds?: number;
}) {
  const supabase = await createClient();

  const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sinceCooldown = new Date(Date.now() - cooldownSeconds * 1000).toISOString();

  let query = supabase
    .from("ai_usage_limits")
    .select("id, used_at", { count:"exact" })
    .eq("feature", feature)
    .gte("used_at", sinceDay);

  if (userId) query = query.eq("user_id", userId);
  else if (ip) query = query.eq("ip", ip);
  else return { allowed:false, reason:"Missing identity." };

  const { data, count, error } = await query.order("used_at", { ascending:false }).limit(1);

  if (error) {
    console.error("Rate limit check failed:", error);
    return { allowed:false, reason:"Rate limit check failed." };
  }

  if ((count || 0) >= dailyLimit) {
    return { allowed:false, reason:`Daily limit reached. Try again tomorrow.` };
  }

  const lastUsed = data?.[0]?.used_at ? new Date(data[0].used_at).getTime() : 0;

  if (lastUsed && Date.now() - lastUsed < cooldownSeconds * 1000) {
    return { allowed:false, reason:`Please wait ${cooldownSeconds} seconds before generating again.` };
  }

  await supabase.from("ai_usage_limits").insert({
    user_id:userId || null,
    ip:ip || null,
    feature
  });

  return { allowed:true };
}
