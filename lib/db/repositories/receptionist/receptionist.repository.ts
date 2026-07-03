import { createClient } from "@/lib/supabase/server";
import { buildReceptionistPrompt } from "@/lib/receptionist/prompt";

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

    const systemPrompt = buildReceptionistPrompt(data);

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
        system_prompt:systemPrompt,
        instructions:{
          language:data.language ?? "es",
          businessType:data.businessType ?? "",
          greeting:data.greeting ?? "",
        },
      })
      .select()
      .single();

    if (error) throw error;

    return receptionist;
  }
}

