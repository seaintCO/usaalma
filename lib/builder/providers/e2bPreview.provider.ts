import { Sandbox } from "e2b";
import { BUILDER_ENGINE_LIMITS } from "@/lib/builder/limits";
import { validateBuilderPreviewUrl } from "@/lib/builder/preview";
import type {
  BuilderProviderPreviewRef,
  BuilderProviderResult,
  PreviewProvider,
} from "@/lib/builder/providers";

export class E2BPreviewProvider implements PreviewProvider {
  async publishPreview(input: {
    projectId: string;
    sandboxId?: string;
  }): Promise<BuilderProviderResult<BuilderProviderPreviewRef>> {
    if (!process.env.E2B_API_KEY) {
      return {
        status: "blocked",
        code: "BUILDER_WORKSPACE_PROVIDER_NOT_CONFIGURED",
        summary: "Builder preview provider is not configured.",
      };
    }
    if (!input.sandboxId) {
      return {
        status: "permanent_failure",
        code: "BUILDER_PROVIDER_FAILED",
        summary: "No active sandbox is available for preview.",
      };
    }
    try {
      const sandbox = await Sandbox.connect(input.sandboxId, {
        apiKey: process.env.E2B_API_KEY,
      });
      const host = sandbox.getHost(BUILDER_ENGINE_LIMITS.previewPort);
      const previewUrl = host.startsWith("http") ? host : `https://${host}`;
      const safe = validateBuilderPreviewUrl(previewUrl);
      if (!safe) {
        return {
          status: "permanent_failure",
          code: "BUILDER_PROVIDER_FAILED",
          summary: "Builder preview URL failed allowlist validation.",
        };
      }
      const health = await fetch(safe.url, { method: "GET" });
      if (!health.ok) {
        return {
          status: "retryable_failure",
          code: "BUILDER_PROVIDER_RETRYABLE",
          summary: "Builder preview did not pass health check.",
        };
      }
      return {
        status: "success",
        data: {
          previewUrl: safe.url,
          previewHost: safe.host,
          expiresAt: new Date(
            Date.now() + BUILDER_ENGINE_LIMITS.maxSessionDurationMs,
          ).toISOString(),
        },
      };
    } catch {
      return {
        status: "retryable_failure",
        code: "BUILDER_PROVIDER_RETRYABLE",
        summary: "Builder preview could not be published.",
      };
    }
  }
}
