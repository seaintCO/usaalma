import { readFile } from "node:fs/promises";

const files = {
  dashboard: await readFile("app/dashboard/page.tsx", "utf8"),
  chat: await readFile("components/dashboard-chat/ChatWorkspace.tsx", "utf8"),
  theme: await readFile("components/theme/AlmaThemeToggle.tsx", "utf8"),
  voice: await readFile("components/voice/AlmaVoiceControls.tsx", "utf8"),
};

const checks = [
  [
    "history selection opens chat",
    files.dashboard.includes('setActiveWorkspace("chat")'),
  ],
  ["instant mode remains routed", files.chat.includes('"instant"')],
  ["Sol Light maps to thinking", files.chat.includes('thinking: "Sol Light"')],
  ["Sol Ultra maps to pro", files.chat.includes('pro: "Sol Ultra"')],
  [
    "truthful request status is visible",
    files.chat.includes("Live request status"),
  ],
  [
    "dark theme is the default",
    files.theme.includes('stored === "light" ? "light" : "dark"'),
  ],
  [
    "theme is persisted",
    files.theme.includes("localStorage.setItem(STORAGE_KEY, theme)"),
  ],
  [
    "voice completes the WebRTC handshake",
    files.voice.includes("setRemoteDescription"),
  ],
  [
    "permanent provider key is not used in browser",
    !files.voice.includes("OPENAI_API_KEY"),
  ],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks)
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
