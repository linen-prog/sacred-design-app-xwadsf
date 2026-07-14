#!/usr/bin/env bash
# CI safeguard: verifies that POST /api/test-register-token returns 404
# when the server is running with NODE_ENV=production and TEST_AUTH_ENABLED unset.
#
# Usage: ./backend/scripts/check-test-auth-gate.sh [BASE_URL]
# Default BASE_URL: http://localhost:3001
#
# Exit codes:
#   0 — endpoint correctly returns 404 (gate is working)
#   1 — endpoint returned something other than 404 (gate has regressed — FAIL BUILD)
#
# Note: run `chmod +x backend/scripts/check-test-auth-gate.sh` after checkout.

set -euo pipefail

BASE_URL="${1:-http://localhost:3001}"
ENDPOINT="${BASE_URL}/api/test-register-token"

echo "Checking test-auth gate at: ${ENDPOINT}"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"token":"ci-probe-token","userId":"ci-probe-user"}')

echo "Response status: ${HTTP_STATUS}"

if [ "${HTTP_STATUS}" = "404" ]; then
  echo "✅ PASS: endpoint correctly returns 404 — test-auth gate is active."
  exit 0
else
  echo "❌ FAIL: endpoint returned ${HTTP_STATUS} instead of 404."
  echo "   This means POST /api/test-register-token is reachable in a production-like build."
  echo "   Check that TEST_AUTH_ENABLED is unset and NODE_ENV=production."
  exit 1
fi
