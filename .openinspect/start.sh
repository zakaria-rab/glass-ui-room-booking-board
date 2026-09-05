#!/usr/bin/env bash
# Open Inspect runs this hook with a 120s budget (START_TIMEOUT_SECONDS) and
# expects it to EXIT 0. On timeout it kills the whole process group and fails
# session startup, so the dev server must be detached, not exec'd.
set -euo pipefail

cd "$(dirname "$0")/.."

# glass-ui-app1 runs on 3001; the shell (glass-ui-framework) owns 3000.
nohup pnpm dev > /tmp/glass-ui-app1-dev.log 2>&1 < /dev/null &

for _ in $(seq 1 60); do
  if curl -sf -o /dev/null http://127.0.0.1:3001; then
    echo "dev server up on :3001"
    exit 0
  fi
  sleep 1
done

echo "dev server did not answer on :3001 within 60s; last log lines:"
tail -50 /tmp/glass-ui-app1-dev.log || true
exit 1
