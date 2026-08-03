import { createClient } from "@/lib/supabase/server";

export class ContactRepository {
  static async list(userId: string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return data ?? [];
  }

  static async create(userId: string, contact: Record<string, unknown>) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        user_id: userId,
        name: String(contact.name ?? "").trim(),
        email: typeof contact.email === "string" ? contact.email.trim() : "",
        phone: typeof contact.phone === "string" ? contact.phone.trim() : "",
        company:
          typeof contact.company === "string" ? contact.company.trim() : "",
        company_id:
          typeof contact.company_id === "string" && contact.company_id
            ? contact.company_id
            : null,
        job_title:
          typeof contact.job_title === "string"
            ? contact.job_title.trim()
            : null,
        notes: typeof contact.notes === "string" ? contact.notes.trim() : null,
        status:
          typeof contact.status === "string" ? contact.status : "prospect",
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
