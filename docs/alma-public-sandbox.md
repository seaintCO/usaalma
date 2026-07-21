# ALMA public sandbox

The public `/` route renders one canonical `PublicAlmaSandbox`. It is a responsive, keyboard-accessible, bilingual product demonstration with Office, Communications, Planner, Creator, and Builder workflows.

The state machine runs only in browser memory. It makes no API request, persists no customer record, invokes no AI provider, executes no generated code, and performs no external action. Approval, message, and preview states explicitly describe demonstrations rather than completed real-world actions. Replay, clear, workflow selection, command entry, and reduced-motion behavior are deterministic.

Locale changes use the canonical ALMA locale hook, cookie, local-storage compatibility key, and cross-page event. Pricing links preserve only allowlisted canonical plan and `/billing` continuation values.

Public plan names map to existing internal identifiers:

- Essential → `starter`
- Autonomous → `business`

The sandbox grants no entitlement. Real access is determined from the authenticated subscription through `EntitlementService`.
