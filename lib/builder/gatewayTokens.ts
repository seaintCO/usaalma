import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { BuilderEngineRepository } from "./engineRepository";
import {
  BUILDER_GATEWAY_DEFAULT_AUDIENCE,
  BUILDER_GATEWAY_ISSUER,
} from "./runtime";
import type { BuilderJob } from "./types";

type GatewayTokenClaims = {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
  jobId: string;
  userId: string;
  workspaceId: string | null;
  projectId: string;
  sessionId: string | null;
  sandboxId: string;
  model: string;
};

export type IssuedBuilderGatewayToken = {
  token: string;
  tokenId: string;
  expiresAt: string;
  claims: GatewayTokenClaims;
};

export class BuilderGatewayTokenError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "builder_gateway_not_configured"
      | "builder_gateway_invalid_token"
      | "builder_gateway_expired_token"
      | "builder_gateway_revoked_token"
      | "builder_gateway_scope_mismatch"
      | "builder_gateway_quota_exceeded",
  ) {
    super(message);
    this.name = "BuilderGatewayTokenError";
  }
}

function base64url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function signingKey() {
  const key = process.env.ALMA_BUILDER_GATEWAY_SIGNING_KEY;
  if (!key || key.length < 32) {
    throw new BuilderGatewayTokenError(
      "Builder Gateway signing key is not configured.",
      "builder_gateway_not_configured",
    );
  }
  return key;
}

export function hashBuilderGatewayToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sign(header: string, payload: string) {
  return createHmac("sha256", signingKey())
    .update(`${header}.${payload}`)
    .digest("base64url");
}

export function createSignedBuilderGatewayToken(claims: GatewayTokenClaims) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify(claims));
  return `${header}.${payload}.${sign(header, payload)}`;
}

export function decodeAndVerifyBuilderGatewayToken(token: string) {
  const [header, payload, signature] = token.split(".");
  if (
    !header ||
    !payload ||
    !signature ||
    sign(header, payload) !== signature
  ) {
    throw new BuilderGatewayTokenError(
      "Invalid Builder Gateway token.",
      "builder_gateway_invalid_token",
    );
  }
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as GatewayTokenClaims;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (claims.iss !== BUILDER_GATEWAY_ISSUER) {
    throw new BuilderGatewayTokenError(
      "Invalid Builder Gateway issuer.",
      "builder_gateway_invalid_token",
    );
  }
  if (
    claims.aud !==
    (process.env.ALMA_BUILDER_GATEWAY_AUDIENCE ??
      BUILDER_GATEWAY_DEFAULT_AUDIENCE)
  ) {
    throw new BuilderGatewayTokenError(
      "Invalid Builder Gateway audience.",
      "builder_gateway_invalid_token",
    );
  }
  if (claims.exp <= nowSeconds) {
    throw new BuilderGatewayTokenError(
      "Builder Gateway token expired.",
      "builder_gateway_expired_token",
    );
  }
  return claims;
}

export async function issueBuilderGatewayToken(input: {
  job: BuilderJob;
  sandboxId: string;
  model: string;
  ttlSeconds: number;
}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const claims: GatewayTokenClaims = {
    iss: BUILDER_GATEWAY_ISSUER,
    aud:
      process.env.ALMA_BUILDER_GATEWAY_AUDIENCE ??
      BUILDER_GATEWAY_DEFAULT_AUDIENCE,
    exp: nowSeconds + input.ttlSeconds,
    iat: nowSeconds,
    jti: randomUUID(),
    jobId: input.job.id,
    userId: input.job.user_id,
    workspaceId: input.job.workspace_id,
    projectId: input.job.project_id,
    sessionId: input.job.session_id,
    sandboxId: input.sandboxId,
    model: input.model,
  };
  const token = `${createSignedBuilderGatewayToken(claims)}.${randomBytes(16).toString("base64url")}`;
  const expiresAt = new Date(claims.exp * 1000).toISOString();
  await BuilderEngineRepository.createGatewayToken({
    tokenHash: hashBuilderGatewayToken(token),
    tokenId: claims.jti,
    job: input.job,
    sandboxId: input.sandboxId,
    model: input.model,
    audience: claims.aud,
    issuer: claims.iss,
    expiresAt,
  });
  return { token, tokenId: claims.jti, expiresAt, claims };
}

export async function verifyBuilderGatewayTokenForRequest(input: {
  token: string;
  requestedModel: string;
}) {
  const unsigned = input.token.split(".").slice(0, 3).join(".");
  const claims = decodeAndVerifyBuilderGatewayToken(unsigned);
  if (claims.model !== input.requestedModel) {
    throw new BuilderGatewayTokenError(
      "Builder Gateway model is not allowed.",
      "builder_gateway_scope_mismatch",
    );
  }
  const record = await BuilderEngineRepository.getGatewayToken({
    tokenHash: hashBuilderGatewayToken(input.token),
    tokenId: claims.jti,
  });
  if (!record || record.revoked_at) {
    throw new BuilderGatewayTokenError(
      "Builder Gateway token is revoked.",
      "builder_gateway_revoked_token",
    );
  }
  if (new Date(record.expires_at).getTime() <= Date.now()) {
    throw new BuilderGatewayTokenError(
      "Builder Gateway token expired.",
      "builder_gateway_expired_token",
    );
  }
  if (
    record.job_id !== claims.jobId ||
    record.project_id !== claims.projectId ||
    record.session_id !== claims.sessionId ||
    record.sandbox_id !== claims.sandboxId
  ) {
    throw new BuilderGatewayTokenError(
      "Builder Gateway token scope mismatch.",
      "builder_gateway_scope_mismatch",
    );
  }
  const job = await BuilderEngineRepository.getActiveLeasedJob(claims.jobId);
  if (!job || job.project_id !== claims.projectId) {
    throw new BuilderGatewayTokenError(
      "Builder job is not active.",
      "builder_gateway_scope_mismatch",
    );
  }
  return { claims, record };
}
