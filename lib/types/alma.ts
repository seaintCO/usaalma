export interface AlmaRequest{

userId:string;

message:string;

conversationId?:string;

memory:any;

}

export type {
  AgentActivityLevel,
  AgentActivityLog,
  AgentApproval,
  AgentApprovalStatus,
  AgentAutonomyLevel,
  AgentExecutionStatus,
  AgentExecution,
  AgentExecutionStep,
  AgentExecutionTrigger,
  AgentLanguageMode,
  AgentPermissionEffect,
  AgentPermission,
  AgentStatus,
  AgentStepKind,
  AgentStepStatus,
  AlmaAgent,
  AgentMemory,
  AgentTask,
} from "@/lib/alma/types";
