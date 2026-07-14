# Backend Test Suite

## Running tests

```bash
TEST_AUTH_ENABLED=true NODE_ENV=test bun test
```

## Required environment variables

| Variable | Required for tests | Notes |
|---|---|---|
| `TEST_AUTH_ENABLED` | **Yes** | Must be `true`. Without it, `POST /api/test-register-token` is not registered and all authenticated test cases will fail with 404. |
| `NODE_ENV` | **Yes** | Must NOT be `production`. The test-auth gate requires `NODE_ENV !== 'production'`. Use `test` or `development`. |
| `TEST_BASE_URL` | No | Defaults to `http://localhost:3001`. Override to point at a running test server. |

## Security note

`TEST_AUTH_ENABLED=true` enables an endpoint that mints bearer tokens for arbitrary user IDs with no credentials. It is gated in code to only register when `NODE_ENV !== 'production'`, but **never set this variable in staging or production environments**. The CI pipeline must verify this (see `scripts/check-test-auth-gate.sh`).

## What happens if `TEST_AUTH_ENABLED` is not set

The test helper (`helpers.ts`) calls `POST /api/test-register-token` to authenticate test users. If the endpoint is not registered (because `TEST_AUTH_ENABLED` is unset or false), that call returns 404 and the helper logs a warning — it does not throw. Subsequent authenticated API calls will then fail with 401, causing test assertions to fail explicitly rather than silently passing.
