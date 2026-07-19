import { CodexCodingProvider } from "./providers/codexCoding.provider";
import { E2BPreviewProvider } from "./providers/e2bPreview.provider";
import { E2BWorkspaceProvider } from "./providers/e2bWorkspace.provider";

export type BuilderProviderFailureCode =
  | "BUILDER_ENGINE_NOT_CONFIGURED"
  | "BUILDER_WORKSPACE_PROVIDER_NOT_CONFIGURED"
  | "BUILDER_CODING_PROVIDER_NOT_CONFIGURED"
  | "BUILDER_GITHUB_PROVIDER_NOT_CONFIGURED"
  | "BUILDER_PROVIDER_RETRYABLE"
  | "BUILDER_PROVIDER_FAILED"
  | "BUILDER_APPROVAL_REQUIRED";

export type BuilderProviderResult<T> =
  | {
      status: "success";
      data: T;
    }
  | {
      status: "blocked";
      code: BuilderProviderFailureCode;
      summary: string;
    }
  | {
      status: "retryable_failure";
      code: BuilderProviderFailureCode;
      summary: string;
    }
  | {
      status: "permanent_failure";
      code: BuilderProviderFailureCode;
      summary: string;
    };

export type BuilderProviderProjectRef = {
  providerProjectId: string;
  providerWorkspaceId?: string;
  sandboxId?: string;
  sandboxDomain?: string;
};

export type BuilderProviderSessionRef = {
  providerSessionId: string;
  providerJobId?: string;
};

export type BuilderProviderPreviewRef = {
  previewUrl: string;
  previewHost: string;
  expiresAt?: string;
};

export type BuilderCommandName =
  | "install"
  | "typecheck"
  | "lint"
  | "test"
  | "build"
  | "start_preview"
  | "git_status"
  | "git_diff";

export interface WorkspaceProvider {
  provisionWorkspace(input: {
    projectId: string;
    userId: string;
    workspaceId: string | null;
    sessionId?: string | null;
  }): Promise<BuilderProviderResult<BuilderProviderProjectRef>>;
  runAllowedCommand?(input: {
    sandboxId: string;
    command: BuilderCommandName;
    cwd?: string;
  }): Promise<
    BuilderProviderResult<{ stdout: string; stderr: string; exitCode: number }>
  >;
  destroyWorkspace?(input: {
    sandboxId: string;
  }): Promise<BuilderProviderResult<{ destroyed: true }>>;
}

export interface CodingAgentProvider {
  startSession(input: {
    projectId: string;
    prompt: string;
    language: "en" | "es";
    workingDirectory?: string;
    starter?: string;
  }): Promise<BuilderProviderResult<BuilderProviderSessionRef>>;
}

export interface SourceControlProvider {
  prepareRepository(input: {
    projectId: string;
    title: string;
  }): Promise<
    BuilderProviderResult<{ repositoryId: string; repositoryUrl?: string }>
  >;
}

export interface PreviewProvider {
  publishPreview(input: {
    projectId: string;
    checkpointId?: string;
    sandboxId?: string;
  }): Promise<BuilderProviderResult<BuilderProviderPreviewRef>>;
}

export interface DeploymentProvider {
  createDeployment(input: {
    projectId: string;
    checkpointId: string;
  }): Promise<
    BuilderProviderResult<{ deploymentId: string; deploymentUrl: string }>
  >;
}

export interface BuilderJobProvider {
  enqueue(input: {
    projectId: string;
    sessionId?: string;
    jobType: string;
    idempotencyKey: string;
  }): Promise<BuilderProviderResult<{ jobId: string }>>;
}

export type BuilderProviders = {
  workspace: WorkspaceProvider;
  codingAgent: CodingAgentProvider;
  sourceControl: SourceControlProvider;
  preview: PreviewProvider;
  deployment: DeploymentProvider;
  jobs: BuilderJobProvider;
};

const unavailable = {
  status: "blocked",
  code: "BUILDER_ENGINE_NOT_CONFIGURED",
  summary:
    "The Builder foundation is ready, but no isolated Builder Engine provider is configured yet.",
} as const;

export class UnavailableBuilderProvider
  implements
    WorkspaceProvider,
    CodingAgentProvider,
    SourceControlProvider,
    PreviewProvider,
    DeploymentProvider,
    BuilderJobProvider
{
  async provisionWorkspace() {
    return unavailable satisfies BuilderProviderResult<BuilderProviderProjectRef>;
  }

  async startSession() {
    return unavailable satisfies BuilderProviderResult<BuilderProviderSessionRef>;
  }

  async prepareRepository() {
    return unavailable satisfies BuilderProviderResult<{
      repositoryId: string;
      repositoryUrl?: string;
    }>;
  }

  async publishPreview() {
    return unavailable satisfies BuilderProviderResult<BuilderProviderPreviewRef>;
  }

  async createDeployment() {
    return unavailable satisfies BuilderProviderResult<{
      deploymentId: string;
      deploymentUrl: string;
    }>;
  }

  async enqueue() {
    return unavailable satisfies BuilderProviderResult<{ jobId: string }>;
  }
}

export const BUILDER_APPROVAL_ACTIONS = [
  "builder.repository.create",
  "builder.workspace.provision",
  "builder.source.push",
  "builder.checkpoint.restore",
  "builder.preview.publish",
  "builder.deployment.create",
] as const;

export type BuilderApprovalAction = (typeof BUILDER_APPROVAL_ACTIONS)[number];

export function getBuilderProviders(): BuilderProviders {
  if (process.env.ALMA_BUILDER_ENGINE_ENABLED === "true") {
    const workspace = new E2BWorkspaceProvider();
    return {
      workspace,
      codingAgent: new CodexCodingProvider(),
      sourceControl: new UnavailableBuilderProvider(),
      preview: new E2BPreviewProvider(),
      deployment: new UnavailableBuilderProvider(),
      jobs: new UnavailableBuilderProvider(),
    };
  }
  const unavailableProvider = new UnavailableBuilderProvider();
  return {
    workspace: unavailableProvider,
    codingAgent: unavailableProvider,
    sourceControl: unavailableProvider,
    preview: unavailableProvider,
    deployment: unavailableProvider,
    jobs: unavailableProvider,
  };
}
