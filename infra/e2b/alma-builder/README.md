# ALMA Builder E2B Template

This template is the ALMA-owned sandbox baseline for Builder generated apps.
It is intentionally narrow: a non-root Node workspace at `/workspace/project` with
only the tools needed to install, validate, build, preview, and run a pinned
non-interactive Codex CLI against starter Next.js projects.

## Build

```bash
npm run builder:e2b:template:build
```

The build command requires `E2B_API_KEY`. It performs a real E2B template build,
so do not run it without explicit approval.

## Local Preflight

```bash
npm run builder:e2b:template:preflight
```

The preflight command does not contact E2B. It verifies that the template
context resolves through `fileURLToPath` to a native absolute path, confirms
`smoke-check.sh` and required template files are readable inside that context,
checks Windows and POSIX path containment behavior, and validates the readiness
file contract before any cloud build can be started.

## Local Smoke

```bash
npm run builder:e2b:template:smoke
```

The smoke command does not contact E2B. It renders the local template definition
and checks that it uses the expected workdir, non-root user, safe startup guard,
and no ALMA controller secrets.

## Runtime Contract

- Workdir: `/workspace/project`
- User: `user`
- Ready file: `/tmp/alma-builder-ready`
- Start command intentionally touches the ready file and then sleeps forever so
  E2B can attach to the long-running sandbox.
- Preview port: `3000`
- Codex CLI: `@openai/codex@0.144.6`
- No ALMA application source is copied into the template.
- No Supabase, GitHub, E2B, OpenAI, Codex, Stripe, OAuth, or service-role
  secrets are embedded in the template.
- Generated app commands must run through the allowlisted workspace provider.

## Current Blocker

Engine 1.2 runs `codex exec` inside this E2B sandbox with a project-local
configuration, a short-lived ALMA Builder Gateway token, and
`--cd /workspace/project`. Permanent OpenAI, E2B, Supabase, GitHub, Stripe, and
OAuth credentials are not copied into the sandbox.

Network limitation: the current E2B SDK exposes sandbox network configuration,
but this repository does not prove a provider-level egress denylist in local
validation. Production use must confirm E2B network controls for the Builder
Gateway, package registry, and required E2B infrastructure before live builds.
