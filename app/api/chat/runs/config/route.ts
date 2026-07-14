import { getCurrentUser } from "@/lib/auth/user";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  return Response.json({ durableChatEnabled: process.env.ALMA_DURABLE_CHAT_ENABLED === "true" });
}
