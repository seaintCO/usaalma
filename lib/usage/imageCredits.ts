import { createClient } from "@/lib/supabase/server";
import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";

function monthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function checkImageCredits(userId:string, amount = 1) {
  const supabase = await createClient();
  const sub = await SubscriptionRepository.get(userId);

  const plan = (sub?.plan || "free").toLowerCase();

  const { data:limitRow } = await supabase
    .from("alma_plan_limits")
    .select("monthly_images")
    .eq("plan", plan)
    .maybeSingle();

  const monthlyLimit = limitRow?.monthly_images ?? 5;

  const { data:events } = await supabase
    .from("alma_usage_events")
    .select("amount")
    .eq("user_id", userId)
    .eq("feature", "nocturai_image")
    .gte("created_at", monthStartIso());

  const used = (events || []).reduce((sum:any, row:any) => sum + Number(row.amount || 0), 0);
  const remaining = monthlyLimit - used;

  if (remaining < amount) {
    return {
      allowed:false,
      used,
      limit:monthlyLimit,
      remaining:Math.max(0, remaining),
      message:`You have used ${used}/${monthlyLimit} Nocturai images this month. Upgrade or wait until next month.`
    };
  }

  return {
    allowed:true,
    used,
    limit:monthlyLimit,
    remaining,
    plan
  };
}

export async function recordImageUsage(userId:string, amount = 1, metadata:any = {}) {
  const supabase = await createClient();

  await supabase.from("alma_usage_events").insert({
    user_id:userId,
    feature:"nocturai_image",
    amount,
    metadata
  });
}
