import { createClient } from "@/lib/supabase/server";

export class ReceptionistRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("receptionists")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });

    return data ?? [];
  }

  static async create(userId:string, data:any) {
    const supabase = await createClient();

    const { data: receptionist, error } = await supabase
      .from("receptionists")
      .insert({
        user_id:userId,
        business_name:data.businessName,
        business_type:data.businessType ?? "",
        phone_number:data.phoneNumber ?? "",
        voice_name:data.voiceName ?? "default",
        greeting:data.greeting ?? "",
        language:data.language ?? "es",
        status:"draft",
      })
      .select()
      .single();

    if (error) throw error;

    return receptionist;
  }
}
