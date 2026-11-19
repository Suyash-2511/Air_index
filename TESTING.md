# Testing

Vitest with Testing Library and `vitest-axe`. The suite runs offline: with no API keys, Google and Gemini calls use built-in fixtures, so every test is deterministic.

```bash
npm run test            # all tests
npm run test:coverage   # with coverage thresholds (fails the run if they drop)
```

## Coverage

Thresholds in `vitest.config.ts`: **lines 85%, functions 85%, branches 75%**. At the time of writing the suite has **78 test files and 367 tests**, with about **92% of lines** covered. CI runs the coverage job on every push.

## What is tested, by area

| Area | Folder | What the tests prove |
|---|---|---|
| Dose engine | `tests/exposure` | Breathing rates match EPA Exposure Factors Handbook Table 6-2; infiltration by window habit; schedules over 24 h or overlapping are rejected; gaps are filled without creating overlaps |
| Changes and ranking | `tests/interventions` | Each change transforms the day correctly; ranking is by recomputed savings; switching several changes on recombines them correctly |
| Today's routine | `tests/routine` | Cleanest window, sealed stretch, commute advice fits the travel mode, overnight sleep past midnight, ozone-aware outdoor timing, Google Calendar link format |
| Air data | `tests/air` | Google response mapping, ppb → µg/m³ conversion, CPCB AQI at every band edge, dominant pollutant |
| Indoor and commute | `tests/indoor`, `tests/commute` | Purifier sizing (CADR, CFM, steady-state indoor PM2.5) against hand-checked numbers; mode ranking by dose and CO₂ |
| Gemini | `tests/gemini` | Structured output is schema-checked; grounding rejects invented numbers; intake repairs invalid days; the plan still loads if Gemini fails |
| Security | `tests/security` | Rate limits (429), body-size limits (413), malformed JSON (400), injection guard, plan and ask route validation |
| HTTP and client | `tests/http`, `tests/client`, `tests/api` | Shared route helpers; every browser call matches its route's request and response shape; bad payloads are rejected |
| Interface | `tests/components` | Every step and panel renders, keyboard and switch behaviour, and **no axe violations**; `e2e-plan-flow.test.tsx` goes landing → sample family → build plan → switch a change on → the dose drops |
| Languages | `tests/i18n` | Every English key exists in Hindi; the toggle updates `<html lang>` |

## Edge cases covered

Empty and flat forecasts, a place search with no results, a day longer than 24 hours, overlapping blocks, blocks crossing midnight, missing AQI from the API, malformed or oversized requests, prompt-injection text in user input, and Gemini timeouts or invalid output.
