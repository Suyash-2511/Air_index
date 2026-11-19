# Code quality

How Saans is organised, and the rules the code follows. Every rule below is enforced by a tool or a test, not by convention alone.

## Structure

```
src/
  app/             Next.js routes. API routes are thin: limit → parse → validate → call lib → respond
  lib/             Pure domain logic. No React, no next/* imports
    exposure/      Dose engine: breathing rates, infiltration, schedule validation
    interventions/ Change catalogue, transforms, ranking, client-side recombination
    routine/       "Your routine for today" builder and Google Calendar links
    air/           Google Air Quality client, response mapper, unit conversion, CPCB AQI
    indoor/        Purifier (CADR) sizing and indoor air hacks
    commute/       Mode comparison: inhaled dose and CO₂ per trip
    gemini/        Gemini client, prompts, grounding checks, intake repair
    http/          Shared route helpers (client IP, rate limit, body size, JSON errors)
    format/        One place for time and number formatting
    security/      Errors, injection guard, rate limiter
    i18n/          English and Hindi dictionaries
  components/      UI grouped by area: steps, plan, household, landing, indoor, commute, community, ui
  hooks/           useCountUp, useBrowserLocation, useLocationSearch, useLocale
  client/          Browser API calls, each response parsed with zod (client/schemas.ts)
tests/             Mirrors src/ one-to-one
```

## Rules and how they are enforced

| Rule | Enforced by |
|---|---|
| TypeScript `strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` | `tsconfig.json`, `npm run typecheck` |
| No `any`, no unused code | ESLint (`eslint.config.mjs`), `--max-warnings 0` |
| Files stay small: every file in `src/` and `tests/` is under 180 lines | ESLint `max-lines` |
| Business logic has no UI dependencies | `src/lib` imports nothing from React or `next/*` |
| Every external response is validated | zod schemas in `lib/air/mapper.ts`, `lib/gemini/*`, `client/schemas.ts` |
| Model output never sets a number | Doses, savings and AQI are computed in `lib/`; `lib/gemini/grounding.ts` rejects model text whose numbers don't match |
| Shared formatting and HTTP code are written once | `lib/format/*`, `lib/http/route-helpers.ts` |
| Consistent formatting | `.editorconfig`, CI on every push |

## Conventions

- Every exported function and component has a one-line JSDoc comment explaining *why*, not *what*.
- Errors are `AppError` with a status and a user-safe message (`lib/security/errors.ts`); provider messages and stack traces never reach the client.
- Design values live in `src/styles/tokens.css`; components use CSS variables only.
- Pure functions take inputs and return values; side effects (network, storage, speech) stay at the edges in routes, hooks and `client/`.

## Checking it yourself

```bash
npm run verify          # typecheck + lint + tests
npm run test:coverage   # with coverage thresholds
```
CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests with coverage and a production build on every push.
