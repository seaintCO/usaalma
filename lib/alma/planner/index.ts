import { planAlmaAction, detectImageSize, buildImageFollowupPrompt } from "@/lib/alma/brain";
import type { AgentStepKind } from "@/lib/alma/types";

export function createAlmaPlan(message:string, workspace:any) {
  const plan = planAlmaAction(message, workspace?.almaContext);
  const imageSize = detectImageSize(message);

  const imagePrompt =
    plan.intent === "image_followup"
      ? buildImageFollowupPrompt(message, workspace?.almaContext)
      : message;

  return {
    ...plan,
    imageSize,
    imagePrompt,
    steps: [
      { label:"Receive request", status:"done", kind:"plan" as AgentStepKind },
      { label:"Load workspace", status:"done", kind:"plan" as AgentStepKind },
      { label:"Plan action", status:"done", kind:"plan" as AgentStepKind, tool:plan.tool, action:plan.action },
    ],
  };
}
