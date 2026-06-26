import { createClient } from "@/lib/supabase/server";

export class OnboardingRepository {
  static async get(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("onboarding_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    return data;
  }

  static async save(userId:string, data:any) {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from("onboarding_profiles")
      .upsert({
        user_id:userId,
        business_name:data.businessName,
        business_type:data.businessType,
        goal:data.goal,
        completed:true,
      })
      .select()
      .single();

    if (error) throw error;

    return profile;
  }
}
