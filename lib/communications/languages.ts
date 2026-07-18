export type CommunicationLanguageCode = "en" | "es";

export type CommunicationTone =
  "professional" | "friendly" | "direct" | "formal";

export type CommunicationOperation =
  | "detect_language"
  | "correct_grammar"
  | "translate_text"
  | "correct_and_translate"
  | "rewrite_for_tone"
  | "shorten_for_channel"
  | "generate_bilingual_reply"
  | "summarize_conversation"
  | "prepare_external_message";

export type CommunicationLanguage = {
  code: CommunicationLanguageCode;
  name: string;
  locale: string;
  voiceLocale: string;
};

export const COMMUNICATION_LANGUAGES: Record<
  CommunicationLanguageCode,
  CommunicationLanguage
> = {
  en: {
    code: "en",
    name: "English",
    locale: "en-US",
    voiceLocale: "en-US",
  },
  es: {
    code: "es",
    name: "Spanish",
    locale: "es-MX",
    voiceLocale: "es-MX",
  },
};

export const COMMUNICATION_TONES: CommunicationTone[] = [
  "professional",
  "friendly",
  "direct",
  "formal",
];

export function normalizeCommunicationLanguage(
  value: unknown,
  fallback: CommunicationLanguageCode,
): CommunicationLanguageCode {
  return value === "es" || value === "en" ? value : fallback;
}

export function oppositeLanguage(
  language: CommunicationLanguageCode,
): CommunicationLanguageCode {
  return language === "en" ? "es" : "en";
}

export function normalizeTone(value: unknown): CommunicationTone {
  return COMMUNICATION_TONES.includes(value as CommunicationTone)
    ? (value as CommunicationTone)
    : "professional";
}
