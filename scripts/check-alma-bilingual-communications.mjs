import { readFileSync } from "node:fs";

const requiredFiles = [
  "lib/communications/languages.ts",
  "lib/communications/preservation.ts",
  "lib/communications/translationService.ts",
  "components/communications/BilingualComposer.tsx",
  "app/api/communications/translate/route.ts",
  "supabase/migrations/20260718005000_alma_bilingual_communications.sql",
];

const requiredSnippets = [
  ["lib/communications/translationService.ts", "protectBusinessTokens"],
  ["lib/communications/translationService.ts", "OPENAI_MODELS.fast"],
  ["lib/communications/preservation.ts", "ALMA_TOKEN"],
  ["components/communications/BilingualComposer.tsx", "Fix and translate"],
  [
    "app/api/communications/translate/route.ts",
    "EntitlementService.checkModuleAccess",
  ],
  [
    "supabase/migrations/20260718005000_alma_bilingual_communications.sql",
    "communication_glossary_terms",
  ],
  [
    "supabase/migrations/20260718005000_alma_bilingual_communications.sql",
    "communication_translation_jobs",
  ],
];

for (const file of requiredFiles) {
  readFileSync(file, "utf8");
}

for (const [file, snippet] of requiredSnippets) {
  const source = readFileSync(file, "utf8");
  if (!source.includes(snippet)) {
    throw new Error(`${file} is missing ${snippet}`);
  }
}

const bundleRisk = readFileSync(
  "components/communications/BilingualComposer.tsx",
  "utf8",
);
if (
  bundleRisk.includes("OPENAI_API_KEY") ||
  bundleRisk.includes("APP_ENCRYPTION_KEY")
) {
  throw new Error(
    "Client bilingual composer must not reference server secrets.",
  );
}

console.log("ALMA bilingual communications verification passed.");
