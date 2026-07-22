# Milestone 7 authenticated browser testing

The committed browser suite never contains credentials and does not bypass authentication. Public EN/ES tests always run against installed Microsoft Edge. Authenticated tests are included only when `.playwright-auth/user.json` exists; the directory is ignored by Git.

One-time setup for an approved non-production account:

1. Run `npm run milestone7.2:auth`; sign-in capture starts its own browser against port 3101 as before.
2. Sign in interactively with the approved non-production account. Do not paste credentials into source files or terminal arguments.
3. After the dashboard opens, close the Playwright window. Storage state is saved only to `.playwright-auth/user.json`.
4. Run read-only/public checks with `npm run milestone7.2:test`. Playwright now owns the Next.js web-server lifecycle through `webServer`, so its process tree is closed by the runner instead of a detached global-setup teardown.
5. Run mutation coverage only against approved non-production data: set `ALMA_E2E_MUTATIONS_CONFIRM=local-test-data` for that command.

Delete `.playwright-auth/user.json` to revoke the local test session. Never commit or share it.
