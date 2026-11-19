# Security

## Secrets
- `GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY` are read only on the server (`src/lib/env.ts`); they are never prefixed `NEXT_PUBLIC_` and never reach the browser bundle.
- In production on Cloud Run both keys come from **Google Secret Manager** (`--set-secrets`), not plain environment variables.
- Google calls send the key in the `X-Goog-Api-Key` header. The Maps Static API only accepts a `key` query parameter, so that call is made server-side through `/api/staticmap` and the URL never leaves the server.
- Any key text in an upstream error is redacted before it is logged or returned (`src/lib/google/http.ts`).
- `.env.local` is git-ignored, and `.gcloudignore` / `.dockerignore` keep it out of cloud builds.

## Input handling
- Every route validates its body or query with **zod** and rejects anything else with a 400 (`src/lib/http/route-helpers.ts`).
- Body size is capped before parsing: 2 KB for most routes, 8 KB for `/api/plan` and `/api/ask` (413 when exceeded).
- Households are limited to 8 people and schedules to 24 hours; overlapping or impossible days are rejected.
- Every browser call parses its response with zod (`src/client/schemas.ts`), so a malformed response can't crash the page.

## Rate limiting
Per-IP sliding windows: 60 requests per minute on API routes, 500 per minute on map tiles (`src/lib/security/rate-limit.ts`). Exceeding them returns 429 with `Retry-After`.

## Model safety
- **Prompt injection:** user text is wrapped in data delimiters, scanned for instruction-like patterns and neutralised (`src/lib/security/injection-guard.ts`), and the system instruction states that delimited text is data, not instructions.
- **Structured output only:** every Gemini call uses a response schema and is re-validated with zod; free text is never executed or trusted.
- **Grounding:** numbers in model text must match the computed plan (`src/lib/gemini/grounding.ts`); internal IDs are stripped before display.
- **Scope:** the Ask feature answers only from the family's plan and declines medical diagnosis and off-topic requests.

## Errors
Failures become `AppError` with a safe message and status (`src/lib/security/errors.ts`). Stack traces and provider messages are never sent to the client; the server logs only which upstream failed and its status.

## Privacy
- Coordinates are rounded to about 1 km before map requests, and cache keys are SHA-256 hashes, so raw locations aren't stored as keys.
- No accounts, database or tracking. Plans live only in the page; the language choice is the only thing kept in browser storage.

## HTTP headers
`next.config.ts` sets a Content-Security-Policy, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a strict Referrer-Policy, a Permissions-Policy (location only for this site) and Cross-Origin-Opener-Policy.

## Dependencies
`npm audit` shows no production advisories. The one remaining advisory is a development-only `picomatch` issue in the test tooling, which has no fix yet and is not shipped in the production image.

## Reporting
Please report security issues privately to csuyash2506@gmail.com rather than in a public issue.
