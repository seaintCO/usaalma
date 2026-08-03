import { readFile } from "node:fs/promises";

const files = {
  shell: await readFile("components/alma-shell/AlmaShell.tsx", "utf8"),
  styles: await readFile("app/globals.css", "utf8"),
  crm: await readFile("app/crm/page.tsx", "utf8"),
  contactRepo: await readFile(
    "lib/db/repositories/crm/contact.repository.ts",
    "utf8",
  ),
  home: await readFile(
    "components/dashboard-home/OperatingDashboard.tsx",
    "utf8",
  ),
};

const checks = [
  ["shared shell uses premium root", files.shell.includes("alma-premium-root")],
  [
    "workspace canvas owns the atmospheric background",
    files.styles.includes(".alma-workspace-canvas"),
  ],
  ["glass card system exists", files.styles.includes(".alma-glass-card")],
  [
    "customer profiles persist through CRM API",
    files.crm.includes("/api/crm/contacts/${selected.id}"),
  ],
  ["customer activity persists", files.crm.includes('"/api/crm/activities"')],
  [
    "customer follow-ups create tasks",
    files.crm.includes('"/api/crm/follow-up"'),
  ],
  [
    "pipeline stages persist",
    files.crm.includes("/api/crm/opportunities/${entry.id}"),
  ],
  [
    "customer brief does not call an AI endpoint",
    !files.crm.includes("/api/chat") && !files.crm.includes("/api/openai"),
  ],
  ["contact creation preserves notes", files.contactRepo.includes("notes:")],
  [
    "contact creation preserves job title",
    files.contactRepo.includes("job_title:"),
  ],
  [
    "home exposes interactive command actions",
    files.home.includes("Command center"),
  ],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks)
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
