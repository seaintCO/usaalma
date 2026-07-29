"use client";

import AlmaShell from "@/components/alma-shell/AlmaShell";
import VoiceAgentWorkspace from "@/components/voice-agents/VoiceAgentWorkspace";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

export default function VoiceAgentsPage() {
  const { locale, setLocale } = useAlmaLocale();
  return (
    <AlmaShell
      language={locale}
      activeWorkspace="voice_agents"
      title={locale === "es" ? "Agentes de voz" : "Voice agents"}
      onLanguageChange={setLocale}
    >
      <VoiceAgentWorkspace language={locale} />
    </AlmaShell>
  );
}
