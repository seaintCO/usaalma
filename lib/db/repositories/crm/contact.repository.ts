import { createClient } from "@/lib/supabase/server";

export class ContactRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });

    return data ?? [];
  }

  static async create(userId:string, contact:any) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        user_id:userId,
        name:contact.name,
        email:contact.email ?? "",
        phone:contact.phone ?? "",
        company:contact.company ?? "",
        status:contact.status ?? "prospecto",
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
