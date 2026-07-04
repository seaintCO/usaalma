import { createClient } from "@/lib/supabase/server";

export class CreativeAssetRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("creative_assets")
      .select("*")
      .eq("user_id", userId).is("deleted_at", null).order("created_at", { ascending:false });

    return data ?? [];
  }

  static async create(userId:string, asset:any) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("creative_assets")
      .insert({
        user_id:userId,
        type:asset.type ?? "image",
        category:asset.category ?? "general",
        title:asset.title ?? "Untitled Creation",
        prompt:asset.prompt,
        optimized_prompt:asset.optimizedPrompt ?? asset.prompt,
        input_base64:asset.inputBase64 ?? null,
        output_base64:asset.outputBase64 ?? null,
        output_url:asset.outputUrl ?? null,
        provider:asset.provider ?? "openai",
        status:asset.status ?? "completed",
        metadata:asset.metadata ?? {},
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}

