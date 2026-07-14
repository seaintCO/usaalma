import { getCurrentUser } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getCurrentUser(); if (!user) return new Response("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  const { data: conversations, error } = await admin.from("conversations").select("id,last_message_at").eq("user_id", user.id);
  if (error) throw error;
  const ids = (conversations ?? []).map((c) => c.id);
  const [{ data: runs }, { data: reads }, { data: assistantMessages }] = await Promise.all([
    admin.from("chat_runs").select("conversation_id,status,updated_at").eq("user_id", user.id).in("conversation_id", ids).order("updated_at", { ascending: false }),
    admin.from("conversation_user_state").select("conversation_id,last_read_at").eq("user_id", user.id).in("conversation_id", ids),
    admin.from("messages").select("conversation_id,created_at,updated_at").eq("user_id", user.id).eq("role", "assistant").in("conversation_id", ids).order("created_at", { ascending: false }),
  ]);
  const readMap = new Map((reads ?? []).map((row) => [row.conversation_id, row.last_read_at]));
  return Response.json((conversations ?? []).map((conversation) => {
    const latest = (runs ?? []).find((run) => run.conversation_id === conversation.id);
    const lastReadAt = readMap.get(conversation.id) ?? null;
    const active = latest?.status === "queued" || latest?.status === "running";
    const failed = latest?.status === "failed";
    const assistant = (assistantMessages ?? []).find((message) => message.conversation_id === conversation.id);
    const latestAt = assistant?.updated_at ?? assistant?.created_at ?? (latest?.status === "completed" ? latest.updated_at : null) ?? conversation.last_message_at;
    return { conversationId: conversation.id, latestRunStatus: latest?.status ?? null, active, failed, unread: Boolean(latestAt && (!lastReadAt || new Date(latestAt) > new Date(lastReadAt))), lastMessageAt: conversation.last_message_at ?? null, lastReadAt };
  }));
}
