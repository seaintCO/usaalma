# ALMA Builder E2B Template

This template is the ALMA-owned sandbox baseline for Builder generated apps.
It is intentionally narrow: a non-root Node workspace at `/home/user/app` with
only the tools needed to install, validate, build, and preview starter Next.js
projects.

## Build

```bash
npm run builder:e2b:template:build
```

The build command requires `E2B_API_KEY`. It performs a real E2B template build,
so do not run it without explicit approval.

## Local Smoke

```bash
npm run builder:e2b:template:smoke
```

The smoke command does not contact E2B. It renders the local template definition
and checks that it uses the expected workdir, non-root user, safe startup guard,
and no ALMA controller secrets.

## Runtime Contract

- Workdir: `/home/user/app`
- User: `user`
- Preview port: `3000`
- No ALMA application source is copied into the template.
- No Supabase, GitHub, E2B, OpenAI, Codex, Stripe, OAuth, or service-role
  secrets are embedded in the template.
- Generated app commands must run through the allowlisted workspace provider.

## Current Blocker

This template does not solve the Codex filesystem boundary by itself. Engine 1.1
keeps the worker fail-closed until Codex file reads and writes are proven to
target this E2B workspace, not the local ALMA worker filesystem.
