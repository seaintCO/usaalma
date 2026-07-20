import http from "node:http";
import { randomUUID } from "node:crypto";
import { BuilderEngineRepository } from "@/lib/builder/engineRepository";
import {
  BuilderGatewayTokenError,
  verifyBuilderGatewayTokenForRequest,
} from "@/lib/builder/gatewayTokens";
import { redactBuilderSecrets } from "@/lib/builder/redaction";
import { BUILDER_RUNTIME_LIMITS } from "@/lib/builder/runtime";
import {
  assertBuilderRuntimeConfig,
  builderRuntimeHealthBody,
} from "@/lib/builder/runtimeConfig";

const port = Number(process.env.ALMA_BUILDER_GATEWAY_PORT ?? 8787);
const allowedModel = process.env.ALMA_BUILDER_CODEX_MODEL;
const openAiKey = process.env.OPENAI_API_KEY;
let startupReady = false;

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > BUILDER_RUNTIME_LIMITS.maxGatewayRequestBytes) {
      throw new Error("builder_gateway_request_too_large");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function bearerToken(req: http.IncomingMessage) {
  const authorization = req.headers.authorization ?? "";
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

const server = http.createServer(async (req, res) => {
  const requestId = randomUUID();
  try {
    if (req.method === "GET" && req.url === "/healthz") {
      return json(res, 200, {
        ok: true,
        service: "alma-builder-gateway",
        ready: startupReady,
      });
    }
    if (req.method === "GET" && req.url === "/readyz") {
      const body = builderRuntimeHealthBody("gateway");
      return json(res, body.ok ? 200 : 503, body);
    }
    if (req.method !== "POST" || req.url !== "/v1/responses") {
      return json(res, 404, {
        error: {
          code: "builder_gateway_endpoint_not_allowed",
          requestId,
        },
      });
    }
    if (!openAiKey || !allowedModel) {
      return json(res, 503, {
        error: {
          code: "builder_gateway_not_configured",
          requestId,
        },
      });
    }
    const bodyText = await readBody(req);
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    const requestedModel =
      typeof body.model === "string" ? body.model : allowedModel;
    if (requestedModel !== allowedModel) {
      return json(res, 403, {
        error: {
          code: "builder_gateway_model_not_allowed",
          requestId,
        },
      });
    }
    const verified = await verifyBuilderGatewayTokenForRequest({
      token: bearerToken(req),
      requestedModel,
    });
    if (
      verified.record.request_count >=
      BUILDER_RUNTIME_LIMITS.maxGatewayRequestsPerToken
    ) {
      return json(res, 429, {
        error: {
          code: "builder_gateway_quota_exceeded",
          requestId,
        },
      });
    }
    await BuilderEngineRepository.incrementGatewayTokenUsage({
      tokenId: verified.claims.jti,
    });
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "responses=v1",
      },
      body: JSON.stringify({ ...body, model: allowedModel }),
    });
    res.writeHead(upstream.status, {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
      "X-ALMA-Builder-Request-Id": requestId,
    });
    if (!upstream.body) {
      return res.end();
    }
    const reader = upstream.body.getReader();
    let sent = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      sent += value.byteLength;
      if (sent > BUILDER_RUNTIME_LIMITS.maxGatewayOutputBytes) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    const code =
      error instanceof BuilderGatewayTokenError
        ? error.code
        : "builder_gateway_failed";
    json(res, code === "builder_gateway_not_configured" ? 503 : 403, {
      error: {
        code,
        requestId,
        message: redactBuilderSecrets(
          error instanceof Error ? error.message : "Builder Gateway failed.",
          240,
        ),
      },
    });
  }
});

try {
  assertBuilderRuntimeConfig("gateway");
  startupReady = true;
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      service: "alma-builder-gateway",
      code:
        error instanceof Error && "code" in error
          ? error.code
          : "BUILDER_RUNTIME_CONFIG_INVALID",
      message: error instanceof Error ? error.message : "Gateway failed.",
      validation:
        error instanceof Error && "validation" in error
          ? error.validation
          : builderRuntimeHealthBody("gateway"),
    }),
  );
  process.exit(1);
}

server.listen(port, () => {
  console.log(
    JSON.stringify({
      ok: true,
      service: "alma-builder-gateway",
      port,
    }),
  );
});
