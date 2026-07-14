import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ClaimedRun = {
  id: string;
  execution_id: string;
  claim_token: string;
  attempts: number;
  max_attempts: number;
};

type Outcome = "no_job" | "completed" | "retry_scheduled" | "failed";

const PROCESS_TIMEOUT_MS = 45_000;

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const safeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Worker processing failed";
  return message
    .replace(/(bearer\s+)[^\s]+/gi, "$1[REDACTED]")
    .replace(/(api[_-]?key|token|secret|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .slice(0, 240);
};

const isRetryableStatus = (status: number) => status === 408 || status === 429 || status >= 500;

Deno.serve(async (request) => {
  let claimedRun: ClaimedRun | null = null;
  let terminalTransitioned = false;
  let supabase: ReturnType<typeof createClient> | null = null;

  const result = (outcome: Outcome) => Response.json({
    outcome,
    ...(claimedRun ? { runId: claimedRun.id, executionId: claimedRun.execution_id } : {}),
  });

  const finishFailure = async (retryable: boolean, error: unknown) => {
    if (!claimedRun || terminalTransitioned || !supabase) return "failed" as const;
    const canRetry = retryable && claimedRun.attempts < claimedRun.max_attempts;
    const { data, error: rpcError } = await supabase.rpc("fail_chat_run", {
      p_id: claimedRun.id,
      p_token: claimedRun.claim_token,
      p_error: safeError(error),
      p_retry: canRetry,
    });
    if (rpcError || data !== true) {
      console.error("Unable to finalize claimed chat run", { runId: claimedRun.id, retryable: canRetry });
      return "failed" as const;
    }
    terminalTransitioned = true;
    return canRetry ? "retry_scheduled" as const : "failed" as const;
  };

  try {
    if (request.headers.get("x-chat-run-worker-secret") !== required("CHAT_RUN_WORKER_SECRET")) {
      return new Response("Unauthorized", { status: 401 });
    }
    supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.rpc("claim_chat_run");
    if (error) throw error;
    if (!data) return result("no_job");
    claimedRun = data as ClaimedRun;

    if (!claimedRun.id || !claimedRun.execution_id || !claimedRun.claim_token || !claimedRun.max_attempts) {
      return result(await finishFailure(false, new Error("Claimed run is missing required worker fields")));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROCESS_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${required("ALMA_APP_URL").replace(/\/$/, "")}/api/internal/chat-runs/process`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-chat-run-worker-secret": required("CHAT_RUN_WORKER_SECRET") },
        body: JSON.stringify({ run: claimedRun }),
        signal: controller.signal,
      });
    } catch (error) {
      return result(await finishFailure(true, error));
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return result(await finishFailure(isRetryableStatus(response.status), new Error(`Processor returned HTTP ${response.status}`)));
    }

    let processorResult: { ok?: boolean };
    try {
      processorResult = await response.json();
    } catch {
      return result(await finishFailure(true, new Error("Processor returned malformed JSON")));
    }
    if (processorResult?.ok !== true) {
      return result(await finishFailure(false, new Error("Processor reported a terminal failure")));
    }

    const { data: completed, error: completeError } = await supabase.rpc("complete_chat_run", {
      p_id: claimedRun.id,
      p_token: claimedRun.claim_token,
    });
    if (completeError || completed !== true) {
      return result(await finishFailure(true, completeError ?? new Error("Completion claim token was rejected")));
    }
    terminalTransitioned = true;
    return result("completed");
  } catch (error) {
    return result(await finishFailure(true, error));
  } finally {
    // A claimed run must have an explicit terminal/retry RPC attempt. The
    // fallback is intentionally claim-token guarded so it cannot touch a run
    // another worker reclaimed after a lease expiry.
    if (claimedRun && !terminalTransitioned) {
      await finishFailure(true, new Error("Worker exited before finalizing claimed run"));
    }
  }
});
