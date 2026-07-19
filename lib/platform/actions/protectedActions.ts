import { BUILDER_APPROVAL_ACTIONS } from "@/lib/builder/providers";
import type {
  AlmaActionRisk,
  AlmaApprovalPolicy,
} from "@/lib/platform/modules/registry";

export type ProtectedActionDefinition = {
  key: string;
  domain: string;
  name: string;
  description: string;
  riskLevel: AlmaActionRisk;
  approvalPolicy: AlmaApprovalPolicy;
  executable: boolean;
};

export const PROTECTED_ACTION_DEFINITIONS: readonly ProtectedActionDefinition[] =
  [
    {
      key: "builder.repository.create",
      domain: "builder",
      name: "Create source repository",
      description:
        "Prepare a source-control repository for a Builder project after owner approval.",
      riskLevel: "protected",
      approvalPolicy: "always_protected",
      executable: false,
    },
    {
      key: "builder.workspace.provision",
      domain: "builder",
      name: "Provision isolated workspace",
      description:
        "Create an isolated Builder workspace where future generated code can be produced outside ALMA.",
      riskLevel: "protected",
      approvalPolicy: "always_protected",
      executable: false,
    },
    {
      key: "builder.source.push",
      domain: "builder",
      name: "Push source changes",
      description:
        "Push Builder-generated source changes to a connected source-control provider.",
      riskLevel: "protected",
      approvalPolicy: "always_protected",
      executable: false,
    },
    {
      key: "builder.checkpoint.restore",
      domain: "builder",
      name: "Restore checkpoint",
      description:
        "Restore a prior Builder checkpoint. This can discard newer workspace state.",
      riskLevel: "protected",
      approvalPolicy: "always_protected",
      executable: false,
    },
    {
      key: "builder.preview.publish",
      domain: "builder",
      name: "Publish preview",
      description:
        "Publish a private preview URL for a Builder checkpoint after validation.",
      riskLevel: "protected",
      approvalPolicy: "always_protected",
      executable: false,
    },
    {
      key: "builder.deployment.create",
      domain: "builder",
      name: "Create deployment",
      description:
        "Deploy an approved Builder checkpoint to a configured deployment provider.",
      riskLevel: "protected",
      approvalPolicy: "always_protected",
      executable: false,
    },
  ] as const;

for (const actionKey of BUILDER_APPROVAL_ACTIONS) {
  if (
    !PROTECTED_ACTION_DEFINITIONS.some(
      (definition) => definition.key === actionKey,
    )
  ) {
    throw new Error(
      `Missing protected Builder action definition: ${actionKey}`,
    );
  }
}

export function getProtectedActionDefinition(actionKey: string) {
  return (
    PROTECTED_ACTION_DEFINITIONS.find(
      (definition) => definition.key === actionKey,
    ) ?? null
  );
}
