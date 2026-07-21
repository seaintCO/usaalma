import type { AlmaMode } from "./types";

export type SelectableAlmaMode = Exclude<AlmaMode, "research_pro">;

const configured = (key: string, fallback: string) =>
  process.env[key]?.trim() || fallback;

export function modeConfiguration(mode: AlmaMode) {
  if (mode === "instant")
    return {
      mode,
      model: configured("ALMA_INSTANT_MODEL", "gpt-5.6-luna"),
      reasoning: "low" as const,
    };
  if (mode === "thinking")
    return {
      mode,
      model: configured("ALMA_THINKING_MODEL", "gpt-5.6-terra"),
      reasoning: "medium" as const,
    };
  if (mode === "pro")
    return {
      mode,
      model: configured("ALMA_PRO_MODEL", "gpt-5.6-sol"),
      reasoning: "high" as const,
    };
  return {
    mode,
    model: configured("ALMA_RESEARCH_PRO_MODEL", "gpt-5.5-pro"),
    reasoning: "high" as const,
  };
}

export function parseClientMode(value: unknown): SelectableAlmaMode | null {
  return value === "instant" || value === "thinking" || value === "pro"
    ? value
    : null;
}

export function resolveAlmaMode(value: unknown): SelectableAlmaMode {
  return parseClientMode(value) ?? "instant";
}
