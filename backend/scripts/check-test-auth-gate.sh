#!/usr/bin/env bash
# CI safeguard: verifies that protected endpoints reject unauthenticated requests.
# Probes GET /api/archetypes/me three ways — no credentials, a made-up token,
# and a user-id-shaped UUID token — and exits 1 unless all three return 401.
# An unreachable server (curl exit status 000) is also treated as a failure.
#
# Usage: ./backend/scripts/check-test-auth-gate.sh [BASE_URL]
# Default BASE_URL: http://localhost:3001

set -euo pipefail

BASE_URL="${1:-http://localhost:3001}"
ENDPOINT="${BASE_URL}/api/archetypes/me"
PASS=true

check() {
  local label="$1"
  local extra_args=("${@:2}")

  # Capture both the HTTP status and the curl exit code
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "${extra_args[@]}" \
    "${ENDPOINT}" 2>/dev/null) || true

  if [ "${HTTP_STATUS}" = "000" ]; then
    echo "❌ FAIL [${label}]: server unreachable (curl returned 000)"
    PASS=false
  elif [ "${HTTP_STATUS}" = "401" ]; then
    echo "✅ PASS [${label}]: got 401 as expected"
  else
    echo "❌ FAIL [${label}]: expected 401, got ${HTTP_STATUS}"
    PASS=false
  fi
}

echo "Checking auth gate at: ${ENDPOINT}"
echo ""

# 1. No credentials at all
check "no credentials"

# 2. Made-up Bearer token
check "made-up token" \
  -H "Authorization: Bearer not-a-real-token-abc123"

# 3. User-id-shaped UUID (the old bypass pattern)
check "UUID token" \
  -H "Authorization: Bearer $(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo '00000000-0000-0000-0000-000000000000')"

echo ""
if [ "${PASS}" = "true" ]; then
  echo "✅ All checks passed — auth gate is active."
  exit 0
else
  echo "❌ One or more checks failed — auth bypass may be present."
  exit 1
fi
