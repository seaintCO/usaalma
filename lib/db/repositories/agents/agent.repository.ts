import { createClient } from "@/lib/supabase/server";
import type { AlmaAgent } from "@/lib/alma/types";

const defaultAgent = {
  name: "ALMA",
  slug: "alma",
  personality: "Clear, practical, elegant, and helpful.",
  system_instructions: "You are ALMA, a user-owned autonomous AI agent. Help the user operate their life and business safely.",
  language_mode: "auto",
  autonomy_level: "supervised",
  metadata: { seeded: true },
};

export class AgentRepository {
  static async getDefault(userId: string): Promise<AlmaAgent | null> {
    const supabase = await createClient();
    const { data } = await supabase.from("agents").select("*").eq("user_id", userId).eq("slug", "alma").maybeSingle();
    return data as AlmaAgent | null;
  }

  static async getOrCreateDefault(userId: string): Promise<AlmaAgent> {
    const existing = await this.getDefault(userId);
    if (existing) return existing;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agents")
      .upsert({ user_id: userId, ...defaultAgent }, { onConflict: "user_id,slug" })
      .select()
      .single();
    if (error) throw error;
    return data as AlmaAgent;
  }
}
