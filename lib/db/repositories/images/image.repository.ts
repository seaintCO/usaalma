import { createClient } from "@/lib/supabase/server";

export class ImageRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("generated_images")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });

    return data ?? [];
  }

  static async create(userId:string, prompt:string, imageBase64:string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("generated_images")
      .insert({
        user_id:userId,
        prompt,
        image_base64:imageBase64,
        status:"completed",
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
