import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "mobile/App.tsx",
  "mobile/app.config.ts",
  "mobile/eas.json",
  "mobile/assets/icon.png",
  "mobile/assets/splash-icon.png",
  "mobile/store/metadata/en-US.json",
  "mobile/store/metadata/es-MX.json",
  "app/api/mobile/devices/route.ts",
  "app/.well-known/apple-app-site-association/route.ts",
  "supabase/migrations/20260731001000_alma_mobile_push_devices.sql",
];

const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length)
  throw new Error(`Missing mobile files: ${missing.join(", ")}`);

const config = readFileSync(join(root, "mobile/app.config.ts"), "utf8");
const app = readFileSync(join(root, "mobile/App.tsx"), "utf8");
const billing = readFileSync(join(root, "app/billing/page.tsx"), "utf8");
const voice = readFileSync(
  join(root, "components/voice-agents/VoiceAgentWorkspace.tsx"),
  "utf8",
);
const homepage = readFileSync(
  join(root, "components/marketing/PublicAlmaSandbox.tsx"),
  "utf8",
);

const contracts = [
  [config.includes("com.seaint.alma"), "bundle identifier"],
  [config.includes("https://www.seaintalma.com"), "production base URL"],
  [config.includes("NSCameraUsageDescription"), "camera permission"],
  [config.includes("NSMicrophoneUsageDescription"), "microphone permission"],
  [
    app.includes('applicationNameForUserAgent="ALMA-iOS/1.0"'),
    "native user agent",
  ],
  [app.includes("classifyNavigation"), "navigation allowlist"],
  [billing.includes("!isIosApp"), "native billing suppression"],
  [voice.includes("isIosApp"), "native managed-setup suppression"],
  [
    homepage.includes("!isIosApp") && homepage.includes('id="pricing"'),
    "native public-pricing suppression",
  ],
];

const failed = contracts.filter(([ok]) => !ok).map(([, label]) => label);
if (failed.length)
  throw new Error(`Mobile contracts failed: ${failed.join(", ")}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      bundleIdentifier: "com.seaint.alma",
      productionHost: "https://www.seaintalma.com",
      requiredFiles: required.length,
      contracts: contracts.map(([, label]) => label),
    },
    null,
    2,
  ),
);
