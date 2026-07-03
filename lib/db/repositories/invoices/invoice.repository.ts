import { createClient } from "@/lib/supabase/server";

export class InvoiceRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false });

    return data ?? [];
  }

  static async create(userId:string, invoice:any) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        user_id:userId,
        client_name:invoice.clientName,
        amount:invoice.amount,
        status:invoice.status ?? "borrador",
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
