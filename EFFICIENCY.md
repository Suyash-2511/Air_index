# Efficiency

Saans keeps API calls, model calls and page weight low without making the plan less accurate.

## Fewer calls

| Technique | Detail | Where |
|---|---|---|
| Caching with expiry | Air data 30 min, place search 24 h, reverse geocode 7 days, heatmap tiles 30 min, map images 6 h, computed plans 1 h. Bounded LRU caches with hit/miss counters | `lib/cache.ts` |
| Private cache keys | Keys are SHA-256 hashes of rounded coordinates or inputs, so raw locations never sit in memory as keys | `lib/cache.ts` |
| One Gemini call per plan | All ranked changes are explained in a single structured call; repeat plans come from cache | `lib/gemini/explain.ts` |
| Smaller, cheaper model first | `gemini-2.5-flash-lite` by default; model names are configurable | `lib/gemini/client.ts` |
| No round trip for what-ifs | Switching a change on recomputes every dose in the browser | `lib/interventions/combine.ts` |
| Places billing | Session tokens group autocomplete and the details lookup; the details field mask asks only for location, name and address | `lib/places/autocomplete.ts` |
| Retries only when useful | Up to 2 retries with exponential backoff, only on 429 and 5xx, 10 s timeout | `lib/google/http.ts` |

## Lighter pages

- The 3D Earth loads only on the client and only when needed (`next/dynamic`, `ssr: false`), with a still image for reduced motion or no WebGL.
- Earth textures are WebP; the main texture is preloaded with high priority.
- Fonts are self-hosted through `next/font` with `display: swap`.
- No UI framework or chart library: charts are plain HTML/CSS bars; the bundle carries only React, Next.js, Three.js, zod and the Gemini SDK.
- Production build uses Next.js `standalone` output for a small Cloud Run image (`Dockerfile`, multi-stage, non-root user).

## Bounded work

Request bodies are capped (2 KB, or 8 KB for plan and ask), households are capped at 8 people, schedules at 24 hours, and the commute distance at 50 km, so no request can make the server do unbounded work.
