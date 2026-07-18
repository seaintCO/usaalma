import { readFileSync } from "node:fs";

const checks = [
  {
    file: "lib/platform/workspaceRoutes.ts",
    required: [
      'approvals: "/approvals"',
      'files: "/files"',
      'apps: "/dashboard/apps"',
      'connections: "/connections"',
    ],
  },
  {
    file: "components/alma-shell/WorkspaceNavigation.tsx",
    required: [
      'itemKey="home"',
      'itemKey="chat"',
      'itemKey="approvals"',
      'itemKey="files"',
      'itemKey="apps"',
      'itemKey="connections"',
    ],
    forbidden: ["Core", "Business", "AI"],
  },
  {
    file: "components/alma-shell/AlmaMobileBottomNav.tsx",
    required: [
      'activeWorkspace === "home"',
      'activeWorkspace === "chat"',
      'activeWorkspace === "approvals"',
      'activeWorkspace === "apps"',
      'activeWorkspace === "settings"',
    ],
  },
  {
    file: "app/approvals/page.tsx",
    required: [
      'fetch("/api/approvals"',
      "fetch(`/api/approvals/${approval.id}`",
      "Approve and execute",
      "Audit history",
    ],
  },
  {
    file: "lib/platform/actions/actionExecutorRegistry.ts",
    required: ['"gmail.send"', "sendConnectedEmail", "validate"],
  },
  {
    file: "lib/platform/actions/executionBoundary.ts",
    required: [
      "executeApprovedAction",
      "getActionExecutor",
      'nextStatus: "executing"',
      'nextStatus: "completed"',
      'nextStatus: "failed"',
    ],
  },
];

let failed = false;

for (const check of checks) {
  const source = readFileSync(check.file, "utf8");
  for (const needle of check.required ?? []) {
    if (!source.includes(needle)) {
      console.error(`${check.file}: missing ${needle}`);
      failed = true;
    }
  }
  for (const needle of check.forbidden ?? []) {
    if (source.includes(needle)) {
      console.error(`${check.file}: forbidden ${needle}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);

console.log("assistant shell approval center checks passed");
