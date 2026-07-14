import { AgentRepository } from "@/lib/db/repositories/agents/agent.repository";
import { AgentMemoryRepository } from "@/lib/db/repositories/agents/agentMemory.repository";
import { AgentExecutionRepository } from "@/lib/db/repositories/agents/agentExecution.repository";
import { AgentActivityRepository } from "@/lib/db/repositories/agents/agentActivity.repository";
import type { AgentExecutionInput, AlmaAgent } from "@/lib/alma/types";

export class AgentService {
  static async getOrCreateDefault(userId: string): Promise<AlmaAgent> {
    return AgentRepository.getOrCreateDefault(userId);
  }

  static async mirrorMemory(userId: string, category: string, key: string, value: string, importance = 5) {
    const agent = await this.getOrCreateDefault(userId);
    return AgentMemoryRepository.save({ agentId: agent.id, userId, category, key, value, importance });
  }

  static async startExecution(input: Omit<AgentExecutionInput, "agentId">) {
    const agent = await this.getOrCreateDefault(input.userId);
    const execution = await AgentExecutionRepository.create({ ...input, agentId: agent.id });
    await AgentActivityRepository.create({ agentId: agent.id, userId: input.userId, executionId: execution.id, eventType: "execution_started", summary: input.goal || "ALMA started an execution.", metadata: { triggerType: input.triggerType, intent: input.intent ?? null } });
    return { agent, execution };
  }

  static async completeExecution(input: { agentId: string; executionId: string; userId: string; success: boolean; summary: string; result?: Record<string, unknown>; error?: string | null }) {
    await AgentExecutionRepository.complete(input.executionId, input.success ? "completed" : "failed", input.result ?? {}, input.error);
    await AgentActivityRepository.create({ agentId: input.agentId, userId: input.userId, executionId: input.executionId, level: input.success ? "success" : "error", eventType: input.success ? "execution_completed" : "execution_failed", summary: input.summary, metadata: input.result ?? {} });
  }

  static async recordStep(input: { executionId: string; sequence: number; kind: "plan" | "tool" | "approval" | "verification" | "reflection"; toolName?: string; success?: boolean; input?: Record<string, unknown>; output?: Record<string, unknown>; error?: string | null }) {
    return AgentExecutionRepository.addStep({
      executionId: input.executionId,
      sequence: input.sequence,
      kind: input.kind,
      toolName: input.toolName,
      status: input.success === false ? "failed" : "completed",
      input: input.input,
      output: input.output,
      error: input.error,
    });
  }

  static async claimStep(input: { executionId: string; sequence: number; kind: "plan" | "tool" | "approval" | "verification" | "reflection"; toolName?: string; input?: Record<string, unknown> }) {
    return AgentExecutionRepository.claimStep(input);
  }

  static async finishStep(input: { stepId: string; success: boolean; output?: Record<string, unknown>; error?: string | null }) {
    return AgentExecutionRepository.finishStep(input.stepId, input.success ? "completed" : "failed", input.output, input.error);
  }
}
