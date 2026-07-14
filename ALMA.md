# ALMA

ALMA is not another chatbot. ALMA is the operating system for user-owned autonomous AI agents.

The chat interface is one way to interact with an agent. It is not the product boundary. ALMA agents are intended to operate across conversations, scheduled work, connected services, voice, activity history, and user-controlled approvals.

## Product contract

Each user can eventually create and configure one or more agents. Every agent is user-owned and may have:

- Identity, custom name, personality, and instructions.
- Personal memory and durable goals.
- English, Spanish, or automatic bilingual behavior.
- An ElevenLabs voice.
- Connected services and tools.
- Permissions, approval controls, and a defined autonomy level.
- Recurring tasks and scheduled work.
- Execution history, activity logs, verification, and reflection.

English, Spanish, and automatic bilingual behavior are core product requirements. Voice is not a separate intelligence system: ElevenLabs output must use the same central agent brain, instructions, language policy, memory, permissions, and execution context as chat.

## Design lock

The current rendered design is locked unless explicitly approved. Do not redesign pages or alter existing colors, fonts, typography, spacing, animations, navigation, responsive behavior, components, layouts, or Tailwind styling while evolving ALMA's backend and orchestration capabilities.

## Implementation principle

Extend the canonical ALMA orchestration path. Do not create competing planners, memory stores, execution engines, tool registries, or agent systems. Preserve existing behavior through compatibility adapters while the architecture is consolidated.
