import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

const camera = read("components/dashboard-chat/LiveCameraSession.tsx");
const chat = read("components/dashboard-chat/ChatWorkspace.tsx");
const nav = read("components/alma-shell/AlmaMobileBottomNav.tsx");
const route = read("app/api/files/analyze/route.ts");
const prompt = read("lib/ai/files/imageAnalysisPrompt.ts");
const mobile = read("mobile/App.tsx");

const contracts = [
  [
    camera.includes("navigator.mediaDevices?.getUserMedia"),
    "camera permission boundary",
  ],
  [camera.includes("audio: false"), "no ambient audio capture"],
  [
    camera.includes("AUTO_OBSERVE_INTERVAL_MS = 8_000"),
    "bounded observation interval",
  ],
  [
    camera.includes("MAX_AUTO_OBSERVATIONS = 10"),
    "session observation ceiling",
  ],
  [
    camera.includes('canvas.toBlob(resolve, "image/jpeg", 0.78)'),
    "compressed transient frames",
  ],
  [
    camera.includes('form.append("source", "live_camera")'),
    "live camera source marker",
  ],
  [
    camera.includes("getTracks().forEach((track) => track.stop())"),
    "camera cleanup",
  ],
  [
    camera.includes('document.addEventListener("visibilitychange"'),
    "background privacy pause",
  ],
  [
    chat.includes('data-alma-live-camera="true"'),
    "discoverable live camera control",
  ],
  [
    chat.includes("min-h-20") && chat.includes("shrink-0 border-t"),
    "mobile composer sizing",
  ],
  [
    !nav.includes('className="fixed inset-x-0 bottom-0'),
    "non-overlapping mobile navigation",
  ],
  [
    nav.includes("shrink-0") && nav.includes("safe-area-inset-bottom"),
    "safe-area navigation",
  ],
  [route.includes('source === "live_camera"'), "server live camera validation"],
  [route.includes("MAX_LIVE_CAMERA_BYTES"), "server frame size ceiling"],
  [
    route.includes('automaticObservation ? "low" : "high"'),
    "cost-aware vision detail",
  ],
  [prompt.includes("current Live Camera frame"), "live observation grounding"],
  [mobile.includes('label="Live Camera"'), "native Live Camera shortcut"],
  [
    mobile.includes(
      'mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"',
    ),
    "native media permission policy",
  ],
];

const failed = contracts.filter(([ok]) => !ok).map(([, label]) => label);
if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      feature: "ALMA Live Camera",
      contracts: contracts.map(([, label]) => label),
      privacy: "on-device preview; transient compressed frame analysis",
      autoObserve: { intervalSeconds: 8, maxObservationsPerSession: 10 },
    },
    null,
    2,
  ),
);
