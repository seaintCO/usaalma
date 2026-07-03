import { createClient } from "@/lib/supabase/server";

export class TaskRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });

    return data ?? [];
  }

  static async create(userId:string, title:string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tasks")
      .insert({ user_id:userId, title })
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  static async toggle(userId:string, id:string, completed:boolean) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tasks")
      .update({ completed })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
