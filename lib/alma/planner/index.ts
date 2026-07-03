import { planAlmaAction, detectImageSize, buildImageFollowupPrompt } from "@/lib/alma/brain";

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
      { label:"Receive request", status:"done" },
      { label:"Load workspace", status:"done" },
      { label:"Plan action", status:"done", tool:plan.tool, action:plan.action },
    ],
  };
}
