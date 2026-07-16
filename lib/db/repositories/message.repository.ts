import { createClient } from "@/lib/supabase/server";

export class MessageRepository {
  static async findAssistantForExecution(executionId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("execution_id", executionId)
      .eq("role", "assistant")
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async create(
    conversationId: string,

    userId: string,

    role: string,

    content: string,

    options: {
      executionId?: string | null;
      idempotencyKey?: string | null;
      status?: "draft" | "streaming" | "final" | "failed";
    } = {},
  ) {
    const supabase = await createClient();

    if (role === "assistant" && options.executionId) {
      const existing = await this.findAssistantForExecution(
        options.executionId,
      );
      if (existing) return existing;
    }

    const { data, error } = await supabase

      .from("messages")

      .insert({
        conversation_id: conversationId,

        user_id: userId,

        role,

        content,

        execution_id: options.executionId ?? null,

        idempotency_key: options.idempotencyKey ?? null,

        status: options.status ?? "final",
      })

      .select()

      .maybeSingle();

    if (error) {
      if (role === "assistant" && options.executionId) {
        const existing = await this.findAssistantForExecution(
          options.executionId,
        );
        if (existing) return existing;
      }
      throw error;
    }

    return data;
  }

  static async list(conversationId: string) {
    const supabase = await createClient();

    const { data } = await supabase

      .from("messages")

      .select("*")

      .eq("conversation_id", conversationId)

      .order("created_at");

    return data ?? [];
  }
}
