import { createClient } from "@/lib/supabase/server";

export class WorkspaceInviteRepository {
  static async invite(workspaceId:string, email:string, role:string = "member") {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("workspace_invites")
      .insert({
        workspace_id:workspaceId,
        invited_email:email,
        role,
        status:"pending",
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
