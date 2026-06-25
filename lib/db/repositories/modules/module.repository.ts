import { createClient } from "@/lib/supabase/server";

export class ModuleRepository {
  static async list(userId:string) {
    const supabase = await createClient();

    const { data: modules } = await supabase
      .from("modules")
      .select("*")
      .order("created_at");

    const { data: installed } = await supabase
      .from("installed_modules")
      .select("module_key, installed")
      .eq("user_id", userId);

    const installedKeys = new Set((installed ?? []).filter((m:any) => m.installed).map((m:any) => m.module_key));

    return (modules ?? []).map((m:any) => ({
      ...m,
      installed: installedKeys.has(m.module_key),
    }));
  }

  static async install(userId:string, moduleKey:string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("installed_modules")
      .upsert({
        user_id: userId,
        module_key: moduleKey,
        installed: true,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
