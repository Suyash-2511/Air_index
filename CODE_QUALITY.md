# Code quality

How Saans is organised, the rules the code follows, and where each rule is enforced. The numbers at the end were measured on the working tree, not estimated.

## Structure

```
src/
  app/             Next.js routes. API routes are thin: limit, parse, validate, call lib, respond
  lib/             Domain logic. No React, no next/* imports
    exposure/      Dose engine: breathing rates, infiltration, schedule validation
    interventions/ Change catalogue, transforms, ranking, client-side recombination
    routine/       "Your routine for today" builder and Google Calendar links
    air/           Google Air Quality client, response mapper, unit conversion, CPCB AQI
    indoor/        Purifier (CADR) sizing, indoor air hacks, their constants
    commute/       Mode comparison: inhaled dose and CO₂ per trip
    gemini/        Gemini client, prompts, grounding checks, intake repair
    google/        Shared HTTP helper for Google APIs (timeout, retry, key redaction)
    places/        Autocomplete, place details, reverse geocoding
    maps/          Static map proxy and Web Mercator projection
    http/          Route helpers (rate limit, body size, JSON parse, schema check)
    format/        Time and number formatting, one rounding helper
    security/      AppError, HTTP status names, injection guard, rate limiter
    i18n/          English and Hindi dictionaries
    time-units.ts  Hours, minutes, milliseconds per unit, shared by every module
  components/      UI grouped by area: steps, plan, household, landing, indoor, commute, community, scene, ui
  hooks/           Stateful logic that components share: useHomeFlow, usePlanState, useHouseholdEditor, useLocationSearch, ...
  client/          Browser API calls; each response is parsed with zod (client/schemas.ts), types derive from those schemas
  data/            Demo household and the default New Delhi location
tests/             Mirrors src/
```

## Rules and how they are enforced

| Rule | Enforced by |
|---|---|
| TypeScript `strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals` | `tsconfig.json`, `npm run typecheck` |
| No `any`, no unused code, no `@ts-ignore` | ESLint, `--max-warnings 0` |
| No non-null assertions (`!`) in `src/` | ESLint `@typescript-eslint/no-non-null-assertion` |
| Every function has cyclomatic complexity of 10 or less | ESLint `complexity` |
| Every function is at most 60 lines, not counting blanks and comments | ESLint `max-lines-per-function` |
| Blocks nest at most 3 deep | ESLint `max-depth` |
| Functions take at most 4 parameters; more go in an options object | ESLint `max-params` |
| Files hold at most 180 lines of code | ESLint `max-lines` |
| Test files are exempt from the function-length and non-null rules only | `eslint.config.mjs` override for `tests/**` |
| Business logic has no UI dependencies | `src/lib` imports nothing from React or `next/*` |
| Every external response is validated | zod schemas in `lib/air/mapper.ts`, `lib/gemini/*`, `client/schemas.ts` |
| Model output never sets a number | Doses, savings and AQI are computed in `lib/`; `lib/gemini/grounding.ts` rejects model text whose numbers do not match |
| Behaviour is pinned | 78 test files, 367 tests; coverage thresholds (lines 85, functions 85, branches 75) in `vitest.config.ts` |

`no-magic-numbers` is not enabled. It reported 372 places in `src/`, most of them rows of data tables (CPCB breakpoints, SVG coordinates, colour channels, zod bounds), so it would have been noise. Numbers with a real-world meaning are named instead (see Conventions).

## Conventions

- **Exports have a JSDoc line that says why.** Constants that share a comment block with their group are the only exception. Comments explain a reason or a limit, not what the next line does.
- **One error pattern per side.** On the server every failure is an `AppError` with a status from `HTTP_STATUS` and a user-safe message (`lib/security`); provider messages and stack traces never reach the client. In the browser every call in `client/api.ts` rejects with `ApiError`; hooks catch it and show its message. A `catch` that swallows an error says why in a comment (clipboard refused, share sheet closed, storage blocked, best-effort landing reading).
- **Modules expose an `index.ts`.** Code outside a folder imports from the folder (`@/lib/exposure`), never from a file inside it. Two entry points are deliberate: `lib/air/client.ts` and `lib/maps/client.ts` hold the browser-safe parts of folders whose `index.ts` also loads server-only providers, and `components/scene/AirScene` is imported by its own path because it is loaded with `import()` to keep the 3D code out of the first bundle. Tests may import internals.
- **Constants have a home.** Domain figures live in `constants.ts` beside the code that uses them (`lib/air`, `lib/routine`, `lib/indoor`, `lib/commute`, `components/scene/earth`), with a source or reason when the number comes from outside the code. Time units come from `lib/time-units.ts`; HTTP statuses from `HTTP_STATUS`; rounding from `roundTo`.
- **Components are small and named for what they show.** State lives in hooks (`usePlanState`, `useHouseholdEditor`, `useHomeFlow`); sections are components. `RoutineTimeline` shares the selected changes with its rows through a small context (`components/plan/change-selection.tsx`) because the toggle otherwise passed through four levels. The language comes from `LocaleProvider`.
- **Names.** Components are PascalCase, hooks are `useX` and live in `hooks/` or beside the one component that uses them, booleans start with `is`, `has` or `can`, and a file is named for its main export. "Window" is the data-model word for a block of a person's day (it is part of the API shape); the UI calls the same thing a block.
- **Types follow the data.** `client/types.ts` derives from the zod schemas. `as` appears only where a value crosses a validated boundary (`JSON.parse` in `readJsonBody`, `response.json()` in `googleJson`) and in `cssVars`, which holds the one cast React's `CSSProperties` needs for custom properties.
- Design values live in `src/styles/tokens.css`; shared card and kicker styles are in `src/styles/section-card.module.css` and `kicker.module.css` and are composed by the components that use them.

## Measured

Before is the working tree when this pass started; after is the working tree now. TypeScript and TSX only unless noted.

| Measure | Before | After |
|---|---|---|
| Functions over complexity 10, 60 lines, depth 3 or 4 parameters | 63 | 0 |
| Highest complexity | 65 (`buildRoutine`) | 10 |
| Longest function | 147 lines (`buildRoutine`) | 58 lines (`useBrowserLocation`) |
| Non-null assertions in `src/` | 6 | 0 |
| Duplicated code, all formats | 28 clones, 3.5% of lines | 7 clones, 0.55% of lines |
| Duplicated code, TypeScript and TSX | 12 clones, 1.56% | 0 clones |
| Duplicated code, CSS | 15 clones, 8.91% | 7 clones, 2.76% |
| Unused files | 4 | 0 |
| Exports imported nowhere | 271 | 98, nearly all names in barrels that only tests or the public API use |
| Unused dependencies | 0 | 0 |
| Files in `src/` | 140 | 198 |
| Lines in `src/` | 10,843 | 12,137 |
| Tests | 367 in 78 files | 367 in 78 files |
| Coverage | 90.5% statements, 79% branches | 92.0% statements, 78.6% branches, 94.4% lines |

Lines went up by about 12% because splitting large functions adds signatures, doc comments and small files. Every file stays under the 180-line code limit.

The measurement tools were `jscpd` 4.0.5 (`npx jscpd src --min-lines 6`), ESLint with the rules above, and a small script built on the TypeScript compiler API for unused exports. `knip` could not run on the development machine, so the unused-export figures come from that script and are approximate.

## Checking it yourself

```bash
npm run verify          # typecheck + lint + tests
npm run test:coverage   # with coverage thresholds
```
CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests with coverage and a production build on every push.
