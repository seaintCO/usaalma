import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [
  [
    "dashboard does not render the mobile bottom navigation",
    !read("app/dashboard/page.tsx").includes("AlmaMobileBottomNav"),
  ],
  [
    "shared shell does not render the mobile bottom navigation",
    !read("components/alma-shell/AlmaShell.tsx").includes(
      "AlmaMobileBottomNav",
    ),
  ],
  [
    "native wrapper does not render a browser-style bottom bar",
    !read("mobile/App.tsx").includes("styles.browserBar"),
  ],
  [
    "public homepage includes the interactive phone preview",
    read("components/marketing/PublicAlmaSandbox.tsx").includes(
      "function PhoneDemo",
    ),
  ],
  [
    "public preview stays deterministic and makes no provider call",
    read("components/marketing/PublicAlmaSandbox.tsx").includes(
      "No account, provider call, or record change.",
    ),
  ],
  [
    "dashboard uses progressive disclosure",
    read("components/dashboard-home/OperatingDashboard.tsx").includes(
      "showDetails",
    ),
  ],
  [
    "side navigation keeps specialist tools under More",
    read("components/alma-shell/WorkspaceNavigation.tsx").includes(
      "<details",
    ),
  ],
  [
    "chat starts with business-first suggestions",
    read("components/dashboard-chat/ChatWorkspace.tsx").includes(
      "Who needs a follow-up?",
    ),
  ],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
}
if (failed.length) process.exit(1);

