export type TranslationLanguage = "en" | "es";
export type TranslationSpeaker = "english" | "spanish";
export type TranslationDirectionKey = "en_to_es" | "es_to_en";

export type TranslationDirection = {
  key: TranslationDirectionKey;
  speaker: TranslationSpeaker;
  sourceLanguage: TranslationLanguage;
  targetLanguage: TranslationLanguage;
  sourceLabel: string;
  targetLabel: string;
};

export const TRANSLATION_DIRECTIONS: Record<
  TranslationDirectionKey,
  TranslationDirection
> = {
  en_to_es: {
    key: "en_to_es",
    speaker: "english",
    sourceLanguage: "en",
    targetLanguage: "es",
    sourceLabel: "English",
    targetLabel: "Spanish",
  },
  es_to_en: {
    key: "es_to_en",
    speaker: "spanish",
    sourceLanguage: "es",
    targetLanguage: "en",
    sourceLabel: "Spanish",
    targetLabel: "English",
  },
};

export const TRANSLATION_DIRECTION_LIST = [
  TRANSLATION_DIRECTIONS.en_to_es,
  TRANSLATION_DIRECTIONS.es_to_en,
] as const;

export function directionForSpeaker(
  speaker: TranslationSpeaker,
): TranslationDirection {
  return speaker === "english"
    ? TRANSLATION_DIRECTIONS.en_to_es
    : TRANSLATION_DIRECTIONS.es_to_en;
}

export function oppositeSpeaker(
  speaker: TranslationSpeaker,
): TranslationSpeaker {
  return speaker === "english" ? "spanish" : "english";
}

export function appendTranscriptDelta(current: string, delta: string) {
  if (!delta.trim()) return current;
  const next = current ? delta : delta.trimStart();
  if (!current) return next;
  if (current.endsWith(next)) return current;
  if (next.startsWith(current)) return next;
  return `${current}${next}`;
}
