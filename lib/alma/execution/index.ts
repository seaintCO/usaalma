import { generateImageTool } from "@/lib/tools/images/generateImageTool";
import { upsertAlmaContext, logAlmaExecution } from "@/lib/alma/context";
import { AgentService } from "@/lib/services/agents/agent.service";

export async function executeAlmaPlan(input:any) {
  const { userId, conversationId, message, plan } = input;

  if (plan.intent === "image_generation" || plan.intent === "image_followup") {
    const result:any = await generateImageTool(userId, plan.imagePrompt, plan.imageSize);

    await upsertAlmaContext(userId, conversationId, {
      last_intent: plan.intent,
      last_prompt: message,
      last_image_prompt: plan.imagePrompt,
      last_image_size: plan.imageSize,
      metadata: {
        tool: "creative",
        mode: plan.intent,
      },
    });

    await logAlmaExecution({
      userId,
      conversationId,
      intent: plan.intent,
      status: result?.success ? "completed" : "failed",
      steps: [
        ...plan.steps,
        { label:"Execute creative tool", status: result?.success ? "done" : "failed" },
        { label:"Save context", status:"done" },
      ],
      result: { success: result?.success },
      error: result?.success ? null : result?.message || result?.error || "Image generation failed",
    });

    if (input.executionId) {
      try {
        await AgentService.recordStep({
          executionId: input.executionId,
          sequence: plan.steps.length + 1,
          kind: "tool",
          toolName: "generate_image",
          success: Boolean(result?.success),
          output: { success: Boolean(result?.success) },
          error: result?.success ? null : result?.message || result?.error || "Image generation failed",
        });
      } catch {
        // Agent execution telemetry must not change the visible image result.
      }
    }

    return {
      type:"image",
      success: !!result?.success,
      outputBase64: result?.image?.outputBase64,
      message: result?.message || result?.error || "Image generated.",
    };
  }

  return {
    type:"chat",
    success:false,
    message:null,
  };
}
