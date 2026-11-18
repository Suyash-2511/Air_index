# Saans

Smog-season household exposure planner. Saans estimates how much PM2.5 each person in a family actually inhales during their day, then ranks practical changes by the physical micrograms of pollution they prevent.

## Chosen Vertical

**Public Health & Environmental Resilience: Household Smog Exposure Reduction in India.**

During north India's winter smog episodes, ambient Air Quality Index (AQI) reports describe regional outdoor air, but families do not live outdoors 24 hours a day. Actual personal exposure depends on where family members spend time, building infiltration rates, room purifiers, cooking fuels, commuting modes, and physical activity levels. Saans provides families with hyper-local, actionable exposure forecasting and personalized mitigation planning.

## Approach and Logic

Saans replaces generic smog advice with a deterministic physical intake model:

1. **Physical Dose Calculation**:
   - $\text{Inhaled Dose } (\mu\text{g}) = \sum \text{Concentration } (\mu\text{g}/\text{m}^3) \times \text{Breathing Rate } (\text{m}^3/\text{min}) \times \text{Duration } (\text{min})$.
   - Age-banded and activity-specific breathing rates are derived directly from the **US EPA Exposure Factors Handbook (2011), Table 6-2** (sleep, light rest, cycling, walking).
2. **Indoor Infiltration & Environmental Physics**:
   - Indoor particle levels are derived from ambient outdoor concentrations scaled by home envelope penetration factors (0.70 for open habits, 0.45 for tightly sealed habits), HEPA air filtration factors (0.25 residual in operating rooms), and localized cooking fuel factors (LPG, biomass, electric induction).
3. **Counterfactual Ranking by Recomputed Savings**:
   - Potential interventions (e.g. running a bedroom purifier, shifting commute timings, sealing windows, wearing N95 masks) are individually simulated through the complete physical dose engine. Recommendations are ranked by verified microgram reductions rather than heuristic scores.
4. **Structured & Zod-Validated Model Output**:
   - Gemini models extract schedule parameters using structured schemas that are strictly validated against Zod schemas and physical calendar constraints (preventing overlapping windows or >1440 minute schedules).
5. **Strict Grounding & Injection Guard**:
   - All AI-generated explanations are checked by a strict grounding engine (`src/lib/gemini/grounding.ts`). Hallucinated statistics and unreferenced claims are purged. User input is sanitized against prompt injection patterns (`src/lib/security/injection-guard.ts`).
6. **Zero-Key Offline Demo Mode**:
   - When API keys are not supplied, Saans falls back to deterministic, scientifically realistic offline fixtures for air quality, geocoding, and plan generation.

### Security
- **Server-Side Key Isolation**: Google Maps and Gemini keys remain strictly on the server and are transmitted via secure headers (`X-Goog-Api-Key`); keys never appear in client bundles, URLs, or error objects.
- **Privacy by Design**: Geographic coordinates are rounded to 2 decimal places (~1 km grid) before static map and tile requests, protecting exact home locations.
- **Per-IP Rate Limiting**: All API routes are protected by sliding-window token bucket limiters.

### Accessibility
- **WCAG 2.1 AAA/AA Compliance**: High-contrast dark and light themes (e.g., 17.1:1 contrast for text on dark sky backgrounds).
- **Assistive Technology**: Screen reader announcements via `aria-live`, ARIA switches, accessible combobox with arrow-key traversal, and accessible static fallbacks for 3D and canvas visualizations.
- **Reduced Motion**: Full support for `prefers-reduced-motion`, disabling canvas rotations, particle drift, and transitions.

## How the Solution Works

Saans connects real-time atmospheric data with physical simulation and plain-language assistance:

1. **Google Air Quality API** (`src/lib/air/google-air-quality.ts`, `src/lib/air/heatmap.ts`):
   - Fetches hourly current conditions and 24-hour PM2.5 forecasts for any location in India.
   - Proxies Google Air Quality Heatmap raster tiles (`/api/tiles/[zoom]/[x]/[y]`) mapped to regional Mercator projections.
2. **Google Places API (New)** (`src/lib/places/places.ts`):
   - Powers the fast autocomplete search (`/api/places`) and retrieves pinpoint coordinates (`/api/places/[id]`).
3. **Google Geocoding API** (`src/lib/places/geocode.ts`):
   - Performs reverse geocoding from browser GPS coordinates to city names (`/api/geocode`).
4. **Google Maps Static API** (`src/lib/maps/static-map.ts`):
   - Delivers muted server-side basemaps behind the local PM2.5 raster heatmap (`/api/staticmap`).
5. **Google Calendar (event links)** (`src/lib/routine/calendar-link.ts`):
   - Formats one-click event scheduling links (`action=TEMPLATE`) for daily protective routine actions directly into Google Calendar.
6. **Gemini via `@google/genai`** (`src/lib/gemini/`):
   - Natural language family routine intake (`src/lib/gemini/intake.ts`).
   - Plain-language explanation generation for ranked changes (`src/lib/gemini/explain.ts`).
   - Grounded Q&A assistance (`src/lib/gemini/ask.ts`) using model client configuration (`src/lib/gemini/client.ts`).
7. **Interactive 3D Earth & Local Heatmap**:
   - Visualizes planetary day/night terminator with city lights, dynamically easing to the chosen Indian city with local smog dome density and ambient particle drift (`src/components/scene/`).
   - Provides a client-side instant recomputation engine (`src/lib/interventions/combine.ts`) allowing users to toggle changes with zero latency.

**Today's routine** (`src/lib/routine/build-routine.ts`, `src/components/RoutineTimeline.tsx`):
Saans synthesizes the 24-hour PM2.5 forecast with the household's actual daily windows to generate a chronologically ordered routine for the day. It deterministically flags the cleanest daytime block for safe ventilation or outdoor exercise, identifies severe smog peaks where homes must be sealed, and suggests protective mitigations during commutes, cooking, and sleep. Each event features actionable microgram savings, direct toggle synchronization with the intervention plan, and one-click Google Calendar integration.

## Assumptions

- **Ambient Homogeneity**: Outdoor PM2.5 levels are assumed uniform across the immediate neighborhood (~1 km radius) as reported by the nearest monitor or satellite assimilation.
- **Envelope Penetration**: Infiltration rates assume typical residential masonry construction in urban India.
- **Breathing Rates**: Physiological air volumes assume normal health parameters per EPA Table 6-2 across infant, child, adult, and older adult bands.
- **Mask Fit**: N95 mask usage assumes proper facial seal achieving rated particulate filtration.
- **Planning Scope**: Estimates represent daily cumulative inhaled particle mass for planning and lifestyle adjustments, not clinical diagnostic prescriptions.

## Run it

```bash
npm install
npm run verify   # typecheck, lint and tests
npm run dev      # http://localhost:3000
```

No API keys are needed to run the test suite or evaluate in demo mode. To connect live services, provide `GOOGLE_MAPS_API_KEY` and `GEMINI_API_KEY` in `.env.local`.

## Acknowledgements & Data Credits

- Global planetary surface imagery and city lights textures are courtesy of NASA Earth Observatory and NASA's Black Marble / Visible Infrared Imaging Radiometer Suite (VIIRS) day-night band datasets (public domain).
- Inhalation and physiological rates adapted from the US EPA Exposure Factors Handbook (2011 Edition).
- Air quality data and satellite mapping provided by Google Maps Platform (Air Quality API, Places API, Geocoding API, Maps Static API).
