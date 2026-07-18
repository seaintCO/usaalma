import { ModuleRepository } from "@/lib/db/repositories/modules/module.repository";
import { resolveAlmaModuleKey } from "@/lib/platform/modules/registry";

type InstalledModuleRow = {
  installed?: boolean | null;
  module_key?: string | null;
};

export async function getInstalledModuleKeys(userId: string) {
  const modules = (await ModuleRepository.list(userId)) as InstalledModuleRow[];
  return modules
    .filter((module) => module.installed && module.module_key)
    .map((module) => String(module.module_key));
}

export function userHasModule(installed: string[], moduleKey: string) {
  if (installed.includes(moduleKey)) return true;
  const definition = resolveAlmaModuleKey(moduleKey);
  if (!definition) return false;
  const accepted = new Set(
    [
      definition.key,
      definition.entitlementKey,
      definition.installKey,
      ...(definition.legacyKeys ?? []),
    ].filter(Boolean),
  );
  return installed.some((key) => accepted.has(key));
}
