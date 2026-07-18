import { planIncludesModule } from "@/lib/platform/entitlements/service";
import {
  listAlmaModules,
  resolveAlmaModuleKey,
} from "@/lib/platform/modules/registry";

export function allowedModulesForPlan(plan: string) {
  return listAlmaModules()
    .filter(
      (module) =>
        module.releaseStatus !== "coming_soon" &&
        planIncludesModule(plan, module),
    )
    .flatMap((module) => [
      module.installKey ?? module.entitlementKey,
      module.key,
      ...(module.legacyKeys ?? []),
    ]);
}

export function moduleAllowed(plan: string, moduleKey: string) {
  const definition = resolveAlmaModuleKey(moduleKey);
  return Boolean(
    definition &&
    definition.releaseStatus !== "coming_soon" &&
    planIncludesModule(plan, definition),
  );
}
