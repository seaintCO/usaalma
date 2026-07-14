import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

Deno.serve(async (request) => {
  try {
    if (request.headers.get("x-chat-run-worker-secret") !== required("CHAT_RUN_WORKER_SECRET")) {
      return new Response("Unauthorized", { status: 401 });
    }
    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: run, error } = await supabase.rpc("claim_chat_run");
    if (error) throw error;
    if (!run) return Response.json({ status: "idle" });
    const response = await fetch(`${required("ALMA_APP_URL").replace(/\/$/, "")}/api/internal/chat-runs/process`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-chat-run-worker-secret": required("CHAT_RUN_WORKER_SECRET") },
      body: JSON.stringify({ run }),
    });
    if (!response.ok) {
      await supabase.rpc("fail_chat_run", { p_id: run.id, p_token: run.claim_token, p_error: await response.text(), p_retry: true });
      return Response.json({ status: "retryable", runId: run.id }, { status: 502 });
    }
    return Response.json({ status: "processed", runId: run.id, result: await response.json() });
  } catch (error) {
    return Response.json({ status: "error", error: error instanceof Error ? error.message : "Worker error" }, { status: 500 });
  }
});
