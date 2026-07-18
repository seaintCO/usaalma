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
  original: string;
  detectedLanguage: CommunicationLanguageCode;
  correctedSource: string;
  corrected: string;
  translation: string;
  translated: string;
  sourceLanguage: CommunicationLanguageCode;
  targetLanguage: CommunicationLanguageCode;
  tone: CommunicationTone;
  warnings: string[];
  provider: "openai";
};

type ProviderPayload = Pick<
  CommunicationResult,
  "detectedLanguage" | "correctedSource" | "translation" | "targetLanguage"
> & {
  warnings?: string[];
};

type ProviderCall = (prompt: string) => Promise<string>;

export class CommunicationProviderUnavailableError extends Error {
  code = "openai_unconfigured";

  constructor(message = "OpenAI translation configuration is unavailable.") {
    super(message);
    this.name = "CommunicationProviderUnavailableError";
  }
}

export class CommunicationProviderError extends Error {
  code = "translation_provider_failed";
  status?: number;

  constructor(
    message = "Translation provider request failed.",
    status?: number,
  ) {
    super(message);
    this.name = "CommunicationProviderError";
    this.status = status;
  }
}

export class CommunicationValidationError extends Error {
  code = "translation_validation_failed";
  reasons: string[];

  constructor(reasons: string[]) {
    super("Translation output failed validation.");
    this.name = "CommunicationValidationError";
    this.reasons = reasons;
  }
}

const ENGLISH_RESIDUE = new Set([
  "hello",
  "hi",
  "how",
  "are",
  "you",
  "thanks",
  "thank",
  "please",
  "today",
  "tomorrow",
  "invoice",
  "estimate",
  "customer",
  "project",
  "payment",
  "deposit",
  "schedule",
  "repair",
  "installation",
  "materials",
]);

const SPANISH_RESIDUE = new Set([
  "hola",
  "como",
  "estas",
  "usted",
  "gracias",
  "favor",
  "manana",
  "mañana",
  "factura",
  "cliente",
  "proyecto",
  "pago",
  "deposito",
  "depósito",
  "reparacion",
  "reparación",
  "instalacion",
  "instalación",
  "materiales",
]);

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
    " hola ",
    " como ",
    " estas ",
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

function warningFor(text: string) {
  const warnings: string[] = [];
  if (/\bsoon|later|asap|cuando pueda|pronto|luego\b/i.test(text)) {
    warnings.push(
      "Ambiguous timing detected. Confirm the exact date or deadline before sending.",
    );
  }
  return warnings;
}

function parseProviderPayload(raw: string): ProviderPayload {
  try {
    const parsed = JSON.parse(raw) as Partial<ProviderPayload>;
    if (
      typeof parsed.correctedSource !== "string" ||
      typeof parsed.translation !== "string"
    ) {
      throw new Error("missing_required_translation_fields");
    }
    return {
      detectedLanguage: normalizeCommunicationLanguage(
        parsed.detectedLanguage,
        "en",
      ),
      correctedSource: parsed.correctedSource,
      translation: parsed.translation,
      targetLanguage: normalizeCommunicationLanguage(
        parsed.targetLanguage,
        "es",
      ),
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.filter((warning) => typeof warning === "string")
        : [],
    };
  } catch {
    throw new CommunicationValidationError(["invalid_provider_json"]);
  }
}

function wordSet(text: string) {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .match(/\b[\p{Letter}']+\b/gu) ?? [],
  );
}

function hasSourceResidue(
  original: string,
  translated: string,
  sourceLanguage: CommunicationLanguageCode,
  targetLanguage: CommunicationLanguageCode,
  protectedValues: string[],
) {
  if (sourceLanguage === targetLanguage) return false;
  const translatedWithoutProtected = protectedValues.reduce(
    (result, value) => result.split(value).join(" "),
    translated,
  );
  const originalWords = wordSet(original);
  const translatedWords = wordSet(translatedWithoutProtected);
  const residue =
    targetLanguage === "es" && sourceLanguage === "en"
      ? ENGLISH_RESIDUE
      : targetLanguage === "en" && sourceLanguage === "es"
        ? SPANISH_RESIDUE
        : new Set<string>();

  let matches = 0;
  for (const word of residue) {
    const normalized = word
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
    if (originalWords.has(normalized) && translatedWords.has(normalized)) {
      matches += 1;
    }
  }
  return matches >= 1;
}

function validateProviderPayload({
  originalText,
  payload,
  sourceLanguage,
  targetLanguage,
  protectedValues,
}: {
  originalText: string;
  payload: ProviderPayload;
  sourceLanguage: CommunicationLanguageCode;
  targetLanguage: CommunicationLanguageCode;
  protectedValues: string[];
}) {
  const reasons: string[] = [];
  const translation = payload.translation.trim();
  const correctedSource = payload.correctedSource.trim();

  if (!translation) reasons.push("empty_translation");
  if (!correctedSource) reasons.push("empty_corrected_source");
  if (payload.targetLanguage !== targetLanguage) {
    reasons.push("target_language_mismatch");
  }
  if (
    hasSourceResidue(
      originalText,
      translation,
      sourceLanguage,
      targetLanguage,
      protectedValues,
    )
  ) {
    reasons.push("source_language_contamination");
  }

  for (const value of protectedValues) {
    if (!translation.includes(value)) {
      reasons.push(`missing_protected_token:${value}`);
    }
  }

  if (reasons.length) {
    throw new CommunicationValidationError(reasons);
  }
}

function buildPrompt({
  input,
  protectedText,
  detectedLanguage,
  targetLanguage,
  tone,
  retryReason,
}: {
  input: CommunicationRequest;
  protectedText: string;
  detectedLanguage: CommunicationLanguageCode;
  targetLanguage: CommunicationLanguageCode;
  tone: CommunicationTone;
  retryReason?: string;
}) {
  return [
    "You are ALMA's bilingual business communication editor.",
    "Return only strict JSON with keys: detectedLanguage, correctedSource, translation, targetLanguage, warnings.",
    "Supported languages are en and es.",
    "The translation must be fully in the target language except protected placeholders, names, codes, URLs, emails, addresses, measurements, dates, currency, and quoted text.",
    "Never add promises, prices, dates, warranties, measurements, or facts.",
    "Preserve all __ALMA_TOKEN_n__ placeholders exactly.",
    "Preserve construction and trade terminology while translating surrounding language naturally.",
    "Warn about ambiguity instead of inventing missing facts.",
    retryReason
      ? `Previous output was rejected because: ${retryReason}. Retry with no source-language contamination.`
      : "",
    `Operation: ${input.operation}. Tone: ${tone}. Channel: ${input.channel ?? "chat"}.`,
    `Source language: ${detectedLanguage}. Target language: ${targetLanguage}.`,
    `Glossary: ${JSON.stringify(input.glossary ?? [])}`,
    `Text: ${protectedText}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new CommunicationProviderUnavailableError();
  }
  const client = new OpenAI({ apiKey });
  try {
    const response = await client.responses.create({
      model: process.env.ALMA_TRANSLATION_MODEL || OPENAI_MODELS.fast,
      input: prompt,
      temperature: 0,
    });
    return response.output_text;
  } catch (error) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: unknown }).status)
        : undefined;
    throw new CommunicationProviderError(
      "Translation provider request failed.",
      Number.isFinite(status) ? status : undefined,
    );
  }
}

export async function runCommunicationOperationWithProvider(
  input: CommunicationRequest,
  provider: ProviderCall,
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
  const protectedValues = tokens.map((token) => token.value);
  let retryReason: string | undefined;
  let lastValidationError: CommunicationValidationError | null = null;

  if (!originalText) {
    throw new CommunicationValidationError(["empty_text"]);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt = buildPrompt({
      input,
      protectedText,
      detectedLanguage,
      targetLanguage,
      tone,
      retryReason,
    });
    const raw = await provider(prompt);
    const parsed = parseProviderPayload(raw);
    const payload: ProviderPayload = {
      ...parsed,
      detectedLanguage: normalizeCommunicationLanguage(
        parsed.detectedLanguage,
        detectedLanguage,
      ),
      correctedSource: restoreBusinessTokens(
        cleanSpacing(parsed.correctedSource),
        tokens,
      ),
      translation: restoreBusinessTokens(
        cleanSpacing(parsed.translation),
        tokens,
      ),
      targetLanguage: normalizeCommunicationLanguage(
        parsed.targetLanguage,
        targetLanguage,
      ),
      warnings: parsed.warnings ?? [],
    };

    try {
      validateProviderPayload({
        originalText,
        payload,
        sourceLanguage: detectedLanguage,
        targetLanguage,
        protectedValues,
      });
      const warnings = Array.from(
        new Set(warningFor(originalText).concat(payload.warnings ?? [])),
      );
      return {
        operation: input.operation,
        originalText,
        original: originalText,
        detectedLanguage: payload.detectedLanguage,
        correctedSource: payload.correctedSource,
        corrected: payload.correctedSource,
        translation: payload.translation,
        translated: payload.translation,
        sourceLanguage: detectedLanguage,
        targetLanguage,
        tone,
        warnings,
        provider: "openai",
      };
    } catch (error) {
      if (error instanceof CommunicationValidationError) {
        lastValidationError = error;
        retryReason = error.reasons.join(", ");
        continue;
      }
      throw error;
    }
  }

  throw lastValidationError ?? new CommunicationValidationError(["unknown"]);
}

export async function runCommunicationOperation(
  input: CommunicationRequest,
): Promise<CommunicationResult> {
  return runCommunicationOperationWithProvider(input, callOpenAI);
}
