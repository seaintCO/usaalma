export type VoiceAgentProfile = {
  id: string;
  workspace_id: string;
  external_agent_id: string;
  name: string;
  agent_type: "receptionist" | "assistant" | "transcriber";
  status: "draft" | "provisioning" | "active" | "paused" | "error";
  language: "en" | "es" | "bilingual";
  greeting: string;
  system_prompt: string;
  voice_id: string | null;
  disclosure_text: string;
  phone_number: string | null;
  human_transfer_phone: string | null;
  recording_enabled: boolean;
  auto_create_leads: boolean;
  last_synced_at: string | null;
  created_at: string;
};

export type VoiceCallRecord = {
  id: string;
  agent_profile_id: string;
  contact_id: string | null;
  provider_conversation_id: string;
  direction: "inbound" | "outbound" | "browser" | "unknown";
  caller_phone: string | null;
  called_phone: string | null;
  status: "initiated" | "connected" | "completed" | "failed" | "missed";
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript_text: string | null;
  summary: string | null;
  outcome: string | null;
  sentiment: string | null;
  recording_available: boolean;
  created_at: string;
};
