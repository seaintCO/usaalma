import { createClient } from "@/lib/supabase/server";

export type AlmaWorkspaceScope = "personal" | "workspace";

export type AlmaWorkspaceRole = "owner" | "member";

export type AlmaTenantContext = {
  userId: string;
  tenantId: string;
  workspaceId: string | null;
  scope: AlmaWorkspaceScope;
  role: AlmaWorkspaceRole;
  source: "personal_fallback" | "workspace_owner" | "workspace_member";
  workspace?: {
    id: string;
    name: string | null;
    type: string | null;
  };
};

export class AlmaWorkspaceAccessError extends Error {
  constructor(
    message: string,
    public readonly code:
      "missing_user" | "workspace_not_found" | "workspace_forbidden",
  ) {
    super(message);
    this.name = "AlmaWorkspaceAccessError";
  }
}

type WorkspaceRow = {
  id: string;
  owner_id?: string | null;
  name?: string | null;
  type?: string | null;
};

type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role?: string | null;
  workspaces?: WorkspaceRow | WorkspaceRow[] | null;
};

function personalTenant(userId: string): AlmaTenantContext {
  return {
    userId,
    tenantId: `user:${userId}`,
    workspaceId: null,
    scope: "personal",
    role: "owner",
    source: "personal_fallback",
  };
}

function normalizeWorkspace(row: WorkspaceRow | null | undefined) {
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name ?? null,
    type: row.type ?? null,
  };
}

function firstWorkspace(
  value: WorkspaceMemberRow["workspaces"],
): WorkspaceRow | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function resolveTenantWorkspace(input: {
  userId: string;
  workspaceId?: string | null;
}): Promise<AlmaTenantContext> {
  const userId = input.userId?.trim();
  if (!userId) {
    throw new AlmaWorkspaceAccessError(
      "A signed-in user is required to resolve an ALMA workspace.",
      "missing_user",
    );
  }

  if (!input.workspaceId) {
    return personalTenant(userId);
  }

  const supabase = await createClient();
  const { data: ownerWorkspace, error: ownerError } = await supabase
    .from("workspaces")
    .select("id,name,type,owner_id")
    .eq("id", input.workspaceId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownerError) throw ownerError;

  if (ownerWorkspace) {
    const workspace = normalizeWorkspace(ownerWorkspace);
    return {
      userId,
      tenantId: `workspace:${ownerWorkspace.id}`,
      workspaceId: ownerWorkspace.id,
      scope: "workspace",
      role: "owner",
      source: "workspace_owner",
      ...(workspace ? { workspace } : {}),
    };
  }

  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id,user_id,role,workspaces(id,name,type,owner_id)")
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) throw memberError;

  if (!membership) {
    throw new AlmaWorkspaceAccessError(
      "Workspace not found for this user.",
      "workspace_not_found",
    );
  }

  const workspace = normalizeWorkspace(firstWorkspace(membership.workspaces));
  if (!workspace) {
    throw new AlmaWorkspaceAccessError(
      "Workspace membership is not attached to a workspace.",
      "workspace_forbidden",
    );
  }

  return {
    userId,
    tenantId: `workspace:${membership.workspace_id}`,
    workspaceId: membership.workspace_id,
    scope: "workspace",
    role: membership.role === "owner" ? "owner" : "member",
    source: "workspace_member",
    workspace,
  };
}
