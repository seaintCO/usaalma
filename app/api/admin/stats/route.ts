import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const supabase = await createClient();

  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!admin) return NextResponse.json({ error:"Forbidden" }, { status:403 });

  const [
    conversations,
    messages,
    tasks,
    notes,
    contacts,
    invoices,
    modules,
    tools
  ] = await Promise.all([
    supabase.from("conversations").select("id", { count:"exact", head:true }),
    supabase.from("messages").select("id", { count:"exact", head:true }),
    supabase.from("tasks").select("id", { count:"exact", head:true }),
    supabase.from("notes").select("id", { count:"exact", head:true }),
    supabase.from("contacts").select("id", { count:"exact", head:true }),
    supabase.from("invoices").select("id", { count:"exact", head:true }),
    supabase.from("installed_modules").select("id", { count:"exact", head:true }),
    supabase.from("tool_runs").select("id", { count:"exact", head:true }),
  ]);

  return NextResponse.json({
    conversations: conversations.count ?? 0,
    messages: messages.count ?? 0,
    tasks: tasks.count ?? 0,
    notes: notes.count ?? 0,
    contacts: contacts.count ?? 0,
    invoices: invoices.count ?? 0,
    installedModules: modules.count ?? 0,
    toolRuns: tools.count ?? 0,
  });
}
