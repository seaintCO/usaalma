import { createClient } from "@/lib/supabase/server";

export class MessageRepository {
  static async findUserByIdempotency(input: {
    userId: string;
    idempotencyKey: string;
    conversationId?: string | null;
  }) {
    const supabase = await createClient();
    let query = supabase
      .from("messages")
      .select("*")
      .eq("user_id", input.userId)
      .eq("role", "user")
      .eq("idempotency_key", input.idempotencyKey)
      .order("created_at", { ascending: false })
      .limit(1);
    if (input.conversationId)
      query = query.eq("conversation_id", input.conversationId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

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

    if (role === "user" && options.idempotencyKey) {
      const existing = await this.findUserByIdempotency({
        userId,
        conversationId,
        idempotencyKey: options.idempotencyKey,
      });
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
      if (role === "user" && options.idempotencyKey) {
        const existing = await this.findUserByIdempotency({
          userId,
          conversationId,
          idempotencyKey: options.idempotencyKey,
        });
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
