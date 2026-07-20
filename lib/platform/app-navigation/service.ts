import "server-only";

import { createClient } from "@/lib/supabase/server";
import { EntitlementService } from "@/lib/platform/entitlements/service";
import { resolveAlmaModuleKey } from "@/lib/platform/modules/registry";
import { resolveTenantWorkspace } from "@/lib/platform/workspace/tenantResolver";
import type { AppNavigationPreference, PinnedApp } from "./types";

export class AppNavigationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AppNavigationError";
  }
}

export class AppNavigationService {
  static async list(input: { userId: string; workspaceId?: string | null }) {
    const tenant = await resolveTenantWorkspace(input);
    const supabase = await createClient();
    let query = supabase
      .from("app_navigation_preferences")
      .select("*")
      .eq("user_id", input.userId)
      .eq("pinned", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    query = tenant.workspaceId
      ? query.eq("workspace_id", tenant.workspaceId)
      : query.is("workspace_id", null);
    const { data, error } = await query;
    if (error) throw error;
    const preferences = (data ?? []) as AppNavigationPreference[];
    const apps: PinnedApp[] = preferences.flatMap((preference) => {
      const definition = resolveAlmaModuleKey(preference.module_id);
      return definition?.route
        ? [
            {
              moduleId: definition.key,
              name: definition.name,
              route: definition.route,
              displayOrder: preference.display_order,
            },
          ]
        : [];
    });
    return { preferences, apps };
  }

  static async setPinned(input: {
    userId: string;
    workspaceId?: string | null;
    moduleId: string;
    pinned: boolean;
  }) {
    const tenant = await resolveTenantWorkspace(input);
    const definition = resolveAlmaModuleKey(input.moduleId);
    if (!definition || !definition.route)
      throw new AppNavigationError(
        "Unknown or non-navigable app.",
        "invalid_module",
      );
    const entitlement = await EntitlementService.checkModuleAccess(
      input.userId,
      definition.key,
    );
    if (!entitlement || entitlement.accessStatus !== "included") {
      throw new AppNavigationError(
        "This app is not available for the current plan.",
        "entitlement_required",
        403,
      );
    }
    const supabase = await createClient();
    let existingQuery = supabase
      .from("app_navigation_preferences")
      .select("id,display_order")
      .eq("user_id", input.userId)
      .eq("module_id", definition.key);
    existingQuery = tenant.workspaceId
      ? existingQuery.eq("workspace_id", tenant.workspaceId)
      : existingQuery.is("workspace_id", null);
    const { data: existing, error: existingError } =
      await existingQuery.maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      const { error } = await supabase
        .from("app_navigation_preferences")
        .update({ pinned: input.pinned })
        .eq("id", existing.id)
        .eq("user_id", input.userId);
      if (error) throw error;
    } else {
      let countQuery = supabase
        .from("app_navigation_preferences")
        .select("id", { count: "exact", head: true })
        .eq("user_id", input.userId)
        .eq("pinned", true);
      countQuery = tenant.workspaceId
        ? countQuery.eq("workspace_id", tenant.workspaceId)
        : countQuery.is("workspace_id", null);
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      const { error } = await supabase
        .from("app_navigation_preferences")
        .insert({
          user_id: input.userId,
          workspace_id: tenant.workspaceId,
          module_id: definition.key,
          pinned: input.pinned,
          display_order: Math.min(count ?? 0, 1000),
        });
      if (error) throw error;
    }
    return AppNavigationService.list(input);
  }
}
