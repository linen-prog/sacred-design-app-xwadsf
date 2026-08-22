# Backend Test Suite

## Running tests

```bash
NODE_ENV=test bun test
```

## Required environment variables

| Variable | Required for tests | Notes |
|---|---|---|
| `NODE_ENV` | **Yes** | Must NOT be `production`. Use `test` or `development`. |
| `TEST_BASE_URL` | No | Defaults to `http://localhost:3001`. Override to point at a running test server. |

## How authentication works in tests

Tests authenticate using the Better Auth session token returned by `POST /api/auth/sign-up/email` (the `token` field in the response). The `signUpTestUser()` helper in `helpers.ts` extracts this token and passes it as a `Bearer` token in subsequent requests. The server looks the token up in the Better Auth session table and validates that it hasn't expired.

## CI auth gate

`scripts/check-test-auth-gate.sh` is the CI guard against auth bypasses. It probes `GET /api/archetypes/me` three ways (no credentials, a made-up token, and a UUID-shaped token) and exits 1 unless all three return 401. Run it against a production-like server before deploying.
