import { createClient } from "@/lib/supabase/server";

export class NoteRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });

    return data ?? [];
  }

  static async create(userId:string, title:string, content:string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id:userId, title, content })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
