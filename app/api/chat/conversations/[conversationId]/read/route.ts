import { getCurrentUser } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
export async function POST(_request: Request, ctx: { params: Promise<{ conversationId: string }> }) {
  const user = await getCurrentUser(); if (!user) return new Response("Unauthorized", { status: 401 }); const { conversationId } = await ctx.params;
  const admin = createAdminClient(); const { data: conversation } = await admin.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
  if (!conversation) return new Response("Not found", { status: 404 });
  const { error } = await admin.from("conversation_user_state").upsert({ conversation_id: conversationId, user_id: user.id, last_read_at: new Date().toISOString() }, { onConflict: "conversation_id,user_id" });
  if (error) throw error; return Response.json({ conversationId, lastReadAt: new Date().toISOString() });
}
