import { getCurrentUser } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(_request: Request, ctx: { params: Promise<{ conversationId: string }> }) {
  const user = await getCurrentUser(); if (!user) return new Response("Unauthorized", { status: 401 }); const { conversationId } = await ctx.params;
  const { data, error } = await createAdminClient().from("chat_runs").select("id,status,execution_id,user_message_id,last_error,updated_at").eq("conversation_id", conversationId).eq("user_id", user.id).order("updated_at", { ascending: false });
  if (error) throw error; return Response.json(data ?? []);
}
