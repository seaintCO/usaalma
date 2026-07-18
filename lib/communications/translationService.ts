import OpenAI from "openai";
import { OPENAI_MODELS } from "@/lib/ai/models";
import {
  normalizeCommunicationLanguage,
  normalizeTone,
  oppositeLanguage,
  type CommunicationLanguageCode,
  type CommunicationOperation,
  type CommunicationTone,
} from "./languages";
import { protectBusinessTokens, restoreBusinessTokens } from "./preservation";

export type CommunicationGlossaryTerm = {
  source: string;
  target?: string | null;
  notes?: string | null;
};

export type CommunicationRequest = {
  operation: CommunicationOperation;
  text: string;
  sourceLanguage?: CommunicationLanguageCode | "auto";
  targetLanguage?: CommunicationLanguageCode;
  tone?: CommunicationTone;
  channel?: "email" | "whatsapp" | "chat" | "office" | "translator";
  glossary?: CommunicationGlossaryTerm[];
};

export type CommunicationResult = {
  operation: CommunicationOperation;
  originalText: string;
  detectedLanguage: CommunicationLanguageCode;
  correctedSource: string;
  translation: string;
  targetLanguage: CommunicationLanguageCode;
  tone: CommunicationTone;
  warnings: string[];
  provider: "openai" | "local_fallback";
};

const EN_TO_ES: Record<string, string> = {
  hello: "hola",
  hi: "hola",
  thanks: "gracias",
  thank: "gracias",
  you: "usted",
  please: "por favor",
  estimate: "estimado",
  invoice: "factura",
  project: "proyecto",
  job: "trabajo",
  customer: "cliente",
  tomorrow: "manana",
  today: "hoy",
  morning: "manana",
  afternoon: "tarde",
  payment: "pago",
  deposit: "deposito",
  schedule: "programar",
  call: "llamada",
  repair: "reparacion",
  installation: "instalacion",
  materials: "materiales",
};

const ES_TO_EN: Record<string, string> = {
  hola: "hello",
  gracias: "thank you",
  usted: "you",
  favor: "please",
  estimado: "estimate",
  factura: "invoice",
  proyecto: "project",
  trabajo: "job",
  cliente: "customer",
  manana: "tomorrow",
  hoy: "today",
  tarde: "afternoon",
  pago: "payment",
  deposito: "deposit",
  programar: "schedule",
  llamada: "call",
  reparacion: "repair",
  instalacion: "installation",
  materiales: "materials",
};

function detectLanguage(text: string): CommunicationLanguageCode {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const spanishSignals = [
    " el ",
    " la ",
    " los ",
    " las ",
    " para ",
    " gracias",
    " manana",
    " estimado",
    " factura",
    " cliente",
    " por favor",
    " necesito",
    " podemos",
  ];
  return spanishSignals.some((signal) => ` ${normalized} `.includes(signal))
    ? "es"
    : "en";
}

function cleanSpacing(text: string) {
  const compact = text
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
  if (!compact) return "";
  return compact.replace(/^./, (first) => first.toUpperCase());
}

function applyGlossary(text: string, glossary: CommunicationGlossaryTerm[]) {
  return glossary.reduce((result, term) => {
    if (!term.source || !term.target) return result;
    return result.replaceAll(term.source, term.target);
  }, text);
}

function localTranslate(
  text: string,
  targetLanguage: CommunicationLanguageCode,
  glossary: CommunicationGlossaryTerm[],
) {
  const dictionary = targetLanguage === "es" ? EN_TO_ES : ES_TO_EN;
  const translated = text.replace(/\b[\p{Letter}']+\b/gu, (word) => {
    const lower = word.toLowerCase();
    return dictionary[lower] ?? word;
  });
  return applyGlossary(translated, glossary);
}

function warningFor(text: string, provider: CommunicationResult["provider"]) {
  const warnings: string[] = [];
  if (/\bsoon|later|asap|cuando pueda|pronto|luego\b/i.test(text)) {
    warnings.push(
      "Ambiguous timing detected. Confirm the exact date or deadline before sending.",
    );
  }
  if (provider === "local_fallback") {
    warnings.push(
      "Provider translation is unavailable. Review the local fallback before sending externally.",
    );
  }
  return warnings;
}

function parseOpenAIResult(
  raw: string,
  fallback: CommunicationResult,
): CommunicationResult {
  try {
    const parsed = JSON.parse(raw) as Partial<CommunicationResult>;
    return {
      ...fallback,
      detectedLanguage: normalizeCommunicationLanguage(
        parsed.detectedLanguage,
        fallback.detectedLanguage,
      ),
      correctedSource:
        typeof parsed.correctedSource === "string"
          ? parsed.correctedSource
          : fallback.correctedSource,
      translation:
        typeof parsed.translation === "string"
          ? parsed.translation
          : fallback.translation,
      targetLanguage: normalizeCommunicationLanguage(
        parsed.targetLanguage,
        fallback.targetLanguage,
      ),
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.filter((warning) => typeof warning === "string")
        : fallback.warnings,
      provider: "openai",
    };
  } catch {
    return fallback;
  }
}

export async function runCommunicationOperation(
  input: CommunicationRequest,
): Promise<CommunicationResult> {
  const originalText = input.text.trim();
  const detectedLanguage =
    input.sourceLanguage && input.sourceLanguage !== "auto"
      ? input.sourceLanguage
      : detectLanguage(originalText);
  const targetLanguage =
    input.targetLanguage && input.targetLanguage !== detectedLanguage
      ? input.targetLanguage
      : oppositeLanguage(detectedLanguage);
  const tone = normalizeTone(input.tone);
  const { protectedText, tokens } = protectBusinessTokens(originalText);
  const correctedSource = cleanSpacing(originalText);
  const localTranslation = restoreBusinessTokens(
    localTranslate(protectedText, targetLanguage, input.glossary ?? []),
    tokens,
  );
  const fallback: CommunicationResult = {
    operation: input.operation,
    originalText,
    detectedLanguage,
    correctedSource,
    translation: cleanSpacing(localTranslation),
    targetLanguage,
    tone,
    warnings: warningFor(originalText, "local_fallback"),
    provider: "local_fallback",
  };

  if (!originalText || !process.env.OPENAI_API_KEY) return fallback;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = [
    "You are ALMA's bilingual business communication editor.",
    "Return strict JSON with keys: detectedLanguage, correctedSource, translation, targetLanguage, warnings.",
    "Supported languages are en and es.",
    "Preserve meaning. Never add promises, prices, dates, warranties, measurements, or facts.",
    "Preserve names, phone numbers, emails, URLs, invoice IDs, project IDs, dates, currency, measurements, addresses, and quoted text.",
    "Preserve construction and trade terminology. Warn about ambiguity.",
    `Operation: ${input.operation}. Tone: ${tone}. Channel: ${input.channel ?? "chat"}.`,
    `Source language: ${detectedLanguage}. Target language: ${targetLanguage}.`,
    `Glossary: ${JSON.stringify(input.glossary ?? [])}`,
    `Text: ${protectedText}`,
  ].join("\n");

  try {
    const response = await client.responses.create({
      model: process.env.ALMA_TRANSLATION_MODEL || OPENAI_MODELS.fast,
      input: prompt,
      temperature: 0,
    });
    const parsed = parseOpenAIResult(response.output_text, fallback);
    return {
      ...parsed,
      correctedSource: restoreBusinessTokens(parsed.correctedSource, tokens),
      translation: restoreBusinessTokens(parsed.translation, tokens),
      warnings: warningFor(originalText, "openai").concat(parsed.warnings),
      provider: "openai",
    };
  } catch {
    return fallback;
  }
}
