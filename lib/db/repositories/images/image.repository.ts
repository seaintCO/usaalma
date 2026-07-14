import { createClient } from "@/lib/supabase/server";

export type ImageAspectRatio = "square" | "landscape" | "portrait";
export type ImageQuality = "medium" | "high";
export type ImageRecordInput = { prompt: string; imageBase64?: string | null; status?: "source" | "generating" | "completed" | "failed"; sourceImageId?: string | null; executionId?: string | null; idempotencyKey?: string | null; aspectRatio?: ImageAspectRatio; quality?: ImageQuality; mimeType?: string };

export class ImageRepository {
  static async list(userId: string) { const supabase = await createClient(); const { data, error } = await supabase.from("generated_images").select("*").eq("user_id", userId).order("created_at", { ascending: false }); if (error) throw error; return data ?? []; }
  static async get(userId: string, id: string) { const supabase = await createClient(); const { data, error } = await supabase.from("generated_images").select("*").eq("id", id).eq("user_id", userId).maybeSingle(); if (error) throw error; return data; }
  static async findByIdempotency(userId: string, idempotencyKey?: string | null) { if (!idempotencyKey) return null; const supabase = await createClient(); const { data, error } = await supabase.from("generated_images").select("*").eq("user_id", userId).eq("idempotency_key", idempotencyKey).maybeSingle(); if (error) throw error; return data; }
  static async create(userId: string, input: ImageRecordInput) { const supabase = await createClient(); const { data, error } = await supabase.from("generated_images").insert({ user_id:userId, prompt:input.prompt, image_base64:input.imageBase64 ?? null, status:input.status ?? "completed", source_image_id:input.sourceImageId ?? null, execution_id:input.executionId ?? null, idempotency_key:input.idempotencyKey ?? null, aspect_ratio:input.aspectRatio ?? "square", quality:input.quality ?? "medium", mime_type:input.mimeType ?? "image/png" }).select().single(); if (error) throw error; return data; }
  static async complete(userId: string, id: string, imageBase64: string) { const supabase = await createClient(); const { data, error } = await supabase.from("generated_images").update({ image_base64:imageBase64,status:"completed" }).eq("id",id).eq("user_id",userId).select().single(); if(error) throw error; return data; }
  static async fail(userId: string, id: string) { const supabase = await createClient(); await supabase.from("generated_images").update({ status:"failed" }).eq("id",id).eq("user_id",userId); }
  static async delete(userId: string, id: string) { const supabase = await createClient(); const { error } = await supabase.from("generated_images").delete().eq("id",id).eq("user_id",userId); if(error) throw error; }
}
