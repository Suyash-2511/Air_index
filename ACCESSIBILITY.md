# Accessibility

Saans targets WCAG 2.2 AA. Every interface test runs `vitest-axe` and fails on any violation.

## What is in place

| Need | How Saans meets it | Where |
|---|---|---|
| Keyboard use | Every control is a native button, input, select or link; the area search follows the WAI-ARIA combobox pattern (arrow keys, Enter, Escape) | `components/ui/Combobox.tsx` |
| Skip repeated content | "Skip to main content" link as the first focusable element | `app/layout.tsx` |
| Visible focus | A 2px ink outline with offset on every focusable element, never removed | `styles/globals.css` |
| Screen reader structure | One `h1`, ordered `h2`/`h3`, landmarks (`header`, `main`, `nav`, `section` with `aria-labelledby`), lists as `ol`/`ul` | all steps |
| Switches | Change cards and routine items use `role="switch"` with `aria-checked` and a name that includes the change | `components/plan/ChangeCard.tsx`, `RoutineTimeline.tsx` |
| Live updates | Dose changes, Gemini answers, search results, "brief copied" and the purifier result are announced through `aria-live="polite"` regions | `AskPanel`, `PlanActions`, `PurifierCalculator` |
| Charts | The hour-by-hour chart has a visually hidden data table with a caption, so the numbers are readable without the bars | `components/plan/DayStrip.tsx` |
| Colour is never the only signal | AQI categories show their name ("Very poor"), routine dots have text labels, savings show "−38%" as text | `AirToday`, `RoutineTimeline` |
| Contrast | Text colours are chosen to meet 4.5:1 on the background in both light and dark themes; small orange text uses the darker `--smog-deep` | `styles/tokens.css` |
| Motion | Every animation, including the 3D Earth, is disabled or replaced with a still image under `prefers-reduced-motion`; no WebGL falls back to the same still | `components/scene/StaticFallback.tsx` |
| Target size | Buttons and inputs are at least 44 px tall | component styles |
| Language | `<html lang>` follows the English / हिन्दी toggle; read-aloud uses `en-IN` or `hi-IN` | `hooks/useLocale.tsx` |
| Errors | Validation messages are plain language ("This day adds up to 26 hr, 2 hr longer than 24 hours. Shorten a block.") and announced with `role="alert"` | `lib/exposure/schedule.ts` |
| Other ways to take the plan | Read aloud, print view, copyable plain-text brief | `components/plan/PlanActions.tsx`, `styles/print.css` |

## Testing it

`npm run test` includes axe checks for every step and panel, plus `tests/components/e2e-plan-flow.test.tsx`, which drives the full flow by role and accessible name only.
