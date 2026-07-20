import JSZip from "jszip";
import { FileType, type Sandbox } from "e2b";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createBuilderManifest,
  isBuilderPathExcluded,
  normalizeBuilderRelativePath,
  sha256Bytes,
  type BuilderManifestFile,
} from "./fileManifest";
import {
  BUILDER_ARTIFACT_BUCKET,
  BUILDER_RUNTIME_LIMITS,
  BUILDER_SANDBOX_PROJECT_DIR,
} from "./runtime";

export class BuilderArtifactHandoffError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "artifact_manifest_failed"
      | "artifact_too_large"
      | "artifact_storage_failed",
  ) {
    super(message);
    this.name = "BuilderArtifactHandoffError";
  }
}

export async function createBuilderSourceArtifact(input: {
  sandbox: Sandbox;
  userId: string;
  workspaceId: string | null;
  projectId: string;
  sessionId: string | null;
  jobId: string;
}) {
  const entries = await input.sandbox.files.list(BUILDER_SANDBOX_PROJECT_DIR, {
    depth: 32,
    user: "user",
  });
  const files: BuilderManifestFile[] = [];
  const zip = new JSZip();
  let totalBytes = 0;

  for (const entry of entries) {
    if (entry.type !== FileType.FILE) continue;
    const relativePath = normalizeBuilderRelativePath(
      entry.path.replace(`${BUILDER_SANDBOX_PROJECT_DIR}/`, ""),
    );
    if (isBuilderPathExcluded(relativePath)) continue;
    if (files.length + 1 > BUILDER_RUNTIME_LIMITS.maxArtifactFiles) {
      throw new BuilderArtifactHandoffError(
        "Builder artifact file count exceeded.",
        "artifact_too_large",
      );
    }
    const bytes = Buffer.from(
      await input.sandbox.files.read(entry.path, {
        format: "bytes",
        user: "user",
      }),
    );
    totalBytes += bytes.byteLength;
    if (totalBytes > BUILDER_RUNTIME_LIMITS.maxArtifactBytes) {
      throw new BuilderArtifactHandoffError(
        "Builder artifact byte limit exceeded.",
        "artifact_too_large",
      );
    }
    const checksumSha256 = sha256Bytes(bytes);
    files.push({
      relativePath,
      sizeBytes: bytes.byteLength,
      checksumSha256,
    });
    zip.file(relativePath, bytes);
  }

  const manifest = createBuilderManifest(files);
  zip.file(".alma-builder-artifact-manifest.json", JSON.stringify(manifest));
  const archive = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  const archiveChecksum = sha256Bytes(archive);
  const storagePath = `${input.userId}/${input.projectId}/${input.jobId}/source-${archiveChecksum.slice(0, 16)}.zip`;
  const { error } = await createAdminClient()
    .storage.from(BUILDER_ARTIFACT_BUCKET)
    .upload(storagePath, archive, {
      contentType: "application/zip",
      upsert: false,
    });
  if (error) {
    throw new BuilderArtifactHandoffError(
      "Builder artifact storage failed.",
      "artifact_storage_failed",
    );
  }
  return {
    storageBucket: BUILDER_ARTIFACT_BUCKET,
    storagePath,
    sizeBytes: archive.byteLength,
    checksumSha256: archiveChecksum,
    manifest,
  };
}
