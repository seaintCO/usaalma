import { createClient } from "@/lib/supabase/server";

export class WorkspaceRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending:false });

    return data ?? [];
  }

  static async create(userId:string, name:string, type:string = "business") {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("workspaces")
      .insert({
        owner_id:userId,
        name,
        type,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("workspace_members").insert({
      workspace_id:data.id,
      user_id:userId,
      role:"owner",
    });

    return data;
  }
}
