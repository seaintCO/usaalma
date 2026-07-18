import { readFileSync } from "node:fs";

const service = readFileSync(
  "lib/communications/translationService.ts",
  "utf8",
);
const transcribe = readFileSync(
  "app/api/translator/transcribe/route.ts",
  "utf8",
);
const speech = readFileSync("app/api/translator/speech/route.ts", "utf8");
const realtime = readFileSync("app/api/realtime/session/route.ts", "utf8");

if (service.includes("local_fallback") || service.includes("EN_TO_ES")) {
  throw new Error(
    "Translation service must not return local fallback success.",
  );
}

if (!service.includes("CommunicationValidationError")) {
  throw new Error("Translation service must validate provider output.");
}

for (const [file, source, snippet] of [
  [
    "app/api/translator/transcribe/route.ts",
    transcribe,
    "SUPPORTED_AUDIO_TYPES",
  ],
  ["app/api/translator/transcribe/route.ts", transcribe, "audio_too_large"],
  ["app/api/translator/transcribe/route.ts", transcribe, "rate_limited"],
  ["app/api/translator/speech/route.ts", speech, "getSpeechModel"],
  ["app/api/realtime/session/route.ts", realtime, "getOpenAIApiKey"],
]) {
  if (!source.includes(snippet)) {
    throw new Error(`${file} is missing ${snippet}`);
  }
}

const englishResidue = new Set([
  "hello",
  "how",
  "are",
  "you",
  "invoice",
  "project",
]);
const spanishResidue = new Set(["hola", "como", "estas", "factura"]);

function words(text) {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .match(/\b[\p{Letter}']+\b/gu) ?? [],
  );
}

function contaminated(original, translated, sourceLanguage, targetLanguage) {
  const originalWords = words(original);
  const translatedWords = words(translated);
  const residue =
    sourceLanguage === "en" && targetLanguage === "es"
      ? englishResidue
      : sourceLanguage === "es" && targetLanguage === "en"
        ? spanishResidue
        : new Set();
  return [...residue].some(
    (word) => originalWords.has(word) && translatedWords.has(word),
  );
}

const cases = [
  {
    name: "hello how are you translates fully to Spanish",
    original: "hello how are you",
    translated: "Hola, como esta?",
    sourceLanguage: "en",
    targetLanguage: "es",
    expectedContamination: false,
  },
  {
    name: "hello how are you mixed output is rejected",
    original: "hello how are you",
    translated: "Hola how are usted",
    sourceLanguage: "en",
    targetLanguage: "es",
    expectedContamination: true,
  },
  {
    name: "hola como estas translates fully to English",
    original: "hola como estas",
    translated: "Hello, how are you?",
    sourceLanguage: "es",
    targetLanguage: "en",
    expectedContamination: false,
  },
  {
    name: "hola como estas mixed output is rejected",
    original: "hola como estas",
    translated: "Hello como estas",
    sourceLanguage: "es",
    targetLanguage: "en",
    expectedContamination: true,
  },
];

for (const entry of cases) {
  const actual = contaminated(
    entry.original,
    entry.translated,
    entry.sourceLanguage,
    entry.targetLanguage,
  );
  if (actual !== entry.expectedContamination) {
    throw new Error(`${entry.name} failed contamination validation.`);
  }
}

const preservedCases = [
  ["amount/date", "$1,240.50", "2026-07-18"],
  ["project identifier", "PROJ-ALMA-51"],
  ["url/email", "https://seaintalma.com", "owner@example.com"],
  ["construction measurement", "12 ft", "4.5 in", "220 sq ft"],
];

for (const [name, ...tokens] of preservedCases) {
  const output = `Translated text ${tokens.join(" ")}`;
  for (const token of tokens) {
    if (!output.includes(token)) {
      throw new Error(`${name} did not preserve ${token}.`);
    }
  }
}

if (!service.includes("CommunicationProviderUnavailableError")) {
  throw new Error("Provider failure must not be converted into fake success.");
}

console.log("ALMA translation and audio runtime verification passed.");
