# Milestone 7 authenticated browser testing

The committed browser suite never contains credentials and does not bypass authentication. Public EN/ES tests always run against installed Microsoft Edge. Authenticated tests are included only when `.playwright-auth/user.json` exists; the directory is ignored by Git.

One-time setup for an approved non-production account:

1. Start ALMA locally on port 3101: `npm run dev -- --hostname 127.0.0.1 --port 3101`.
2. In another terminal run `npm run milestone7.2:auth`.
3. Sign in interactively with the approved non-production account. Do not paste credentials into source files or terminal arguments.
4. After the dashboard opens, close the Playwright window. Storage state is saved only to `.playwright-auth/user.json`.
5. Run read-only/public checks with `npm run milestone7.2:test`.
6. Run mutation coverage only against approved non-production data: set `ALMA_E2E_MUTATIONS_CONFIRM=local-test-data` for that command.

Delete `.playwright-auth/user.json` to revoke the local test session. Never commit or share it.
