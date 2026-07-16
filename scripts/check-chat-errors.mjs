import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source = await readFile("lib/alma/chat/chatErrorHandling.ts", "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});

const dir = await mkdtemp(join(tmpdir(), "alma-chat-errors-"));
const modulePath = join(dir, "chatErrorHandling.mjs");

try {
  await writeFile(modulePath, transpiled.outputText, "utf8");
  const {
    createChatSubmissionKey,
    getChatErrorCopy,
    isRecoverableChatError,
    normalizeChatError,
  } = await import(`file://${modulePath.replaceAll("\\", "/")}`);

  assert.equal(
    normalizeChatError({ context: "legacy_stream", online: false }),
    "offline",
  );
  assert.equal(
    normalizeChatError({ context: "legacy_stream", status: 401 }),
    "auth_expired",
  );
  assert.equal(
    normalizeChatError({ context: "legacy_stream", timedOut: true }),
    "timeout",
  );
  assert.equal(
    normalizeChatError({ context: "legacy_stream", status: 429 }),
    "rate_limited",
  );
  assert.equal(
    normalizeChatError({ context: "legacy_stream", status: 500 }),
    "server_unavailable",
  );
  assert.equal(
    normalizeChatError({ context: "legacy_stream", invalidResponse: true }),
    "invalid_response",
  );
  assert.equal(
    normalizeChatError({ context: "durable_enqueue", status: 503 }),
    "durable_enqueue_failed",
  );
  assert.equal(
    normalizeChatError({ context: "durable_worker", workerFailed: true }),
    "durable_worker_failed",
  );
  assert.equal(
    normalizeChatError({ context: "durable_poll", status: 503 }),
    "server_unavailable",
  );
  assert.equal(isRecoverableChatError("auth_expired"), false);
  assert.equal(isRecoverableChatError("offline"), true);

  const en = getChatErrorCopy("timeout", "en");
  const es = getChatErrorCopy("timeout", "es");
  assert.ok(en.title && en.message && en.retryLabel);
  assert.ok(es.title && es.message && es.retryLabel);

  const stableKey = createChatSubmissionKey();
  const retry = {
    idempotencyKey: stableKey,
    prompt: "Show me my tasks",
    draftId: `assistant-${stableKey}`,
  };
  assert.equal(retry.idempotencyKey, stableKey);
  assert.equal(retry.draftId, `assistant-${stableKey}`);

  const messages = [
    { id: `user-${stableKey}`, role: "user" },
    { id: `assistant-${stableKey}`, role: "assistant" },
  ];
  const retryMessages = messages.map((message) =>
    message.id === `assistant-${stableKey}`
      ? { ...message, status: "streaming" }
      : message,
  );
  assert.equal(
    retryMessages.filter((message) => message.id === `user-${stableKey}`)
      .length,
    1,
  );
  assert.equal(
    retryMessages.filter((message) => message.id === `assistant-${stableKey}`)
      .length,
    1,
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
