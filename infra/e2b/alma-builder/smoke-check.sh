#!/usr/bin/env bash
set -euo pipefail

test "$(id -un)" = "user"
test -d /workspace/project
test -w /workspace/project
node --version
npm --version
git --version
codex --version

for name in OPENAI_API_KEY CODEX_API_KEY E2B_API_KEY SUPABASE_SERVICE_ROLE_KEY GITHUB_APP_PRIVATE_KEY; do
  if printenv "$name" >/dev/null 2>&1; then
    echo "secret environment variable is present: $name" >&2
    exit 1
  fi
done

echo "alma-builder-template-smoke ok"
