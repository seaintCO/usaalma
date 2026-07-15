import { createClient } from "@/lib/supabase/server";

type ModuleRow = Record<string, unknown> & { module_key: string };
type InstalledModuleRow = { module_key: string; installed: boolean };

export class ModuleRepository {
  static async listInstalledKeys(userId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("installed_modules")
      .select("module_key")
      .eq("user_id", userId)
      .eq("installed", true);

    if (error) throw error;
    return (data ?? []).map(
      (module: { module_key: string }) => module.module_key,
    );
  }

  static async list(userId: string) {
    const supabase = await createClient();

    const { data: modules } = await supabase
      .from("modules")
      .select("*")
      .order("created_at");

    const { data: installed } = await supabase
      .from("installed_modules")
      .select("module_key, installed")
      .eq("user_id", userId);

    const installedKeys = new Set(
      (installed ?? [])
        .filter((module: InstalledModuleRow) => module.installed)
        .map((module: InstalledModuleRow) => module.module_key),
    );

    return (modules ?? []).map((module: ModuleRow) => ({
      ...module,
      installed: installedKeys.has(module.module_key),
    }));
  }

  static async install(userId: string, moduleKey: string) {
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
