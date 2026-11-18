# Security Policy & Architecture

## Security Design

Saans is designed to protect user privacy and isolate credentials using a server-side proxy architecture.

### API Key Containment & Endpoints
All external API keys (`GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY`) remain strictly on the server:
- Keys are loaded from environment variables into private Node.js runtime contexts and are never bundled into client-side code, URLs, or browser-accessible assets.
- Calls to Google APIs transmit keys using the secure `X-Goog-Api-Key` request header wherever supported.
- `/api/staticmap`: Proxies Google Maps Static API basemaps. The Maps API key is appended as a query parameter strictly on the server; this key never leaves the server and is never sent to the browser.
- `/api/health`: Provides uptime, service operational modes ("live" vs "demo"), and cache statistics. It never returns secret keys, private URLs, or user data.
- `/api/tiles/[zoom]/[x]/[y]`, `/api/air`, `/api/places`, `/api/geocode`, `/api/intake`, `/api/plan`, `/api/ask`: All server endpoints validate payloads and run behind server-side rate limiters.

### Rate Limiting & Input Validation
- Each route enforces sliding-window in-memory rate limiting per client IP to mitigate denial-of-service risks.
- All request parameters, JSON bodies, and model responses are strictly validated through Zod schemas.
- User input into AI endpoints is scanned by `src/lib/security/injection-guard.ts` for prompt injection, jailbreaking patterns, and system delimiter overrides.

### Location Privacy
- When the user selects a location or uses browser geolocation, coordinates are rounded via `roundForMap()` to two decimal places (~1 km grid precision) before static map basemap and heatmap tile requests are executed. Exact residential coordinates are never sent to external mapping APIs.

### Known Vulnerabilities & Dependencies
- A known advisory exists for `picomatch` within dev-dependency build tooling. This package is strictly a development and test dependency; it is never included in the production build or shipped to user clients. No official patch is currently available from upstream maintainers.
