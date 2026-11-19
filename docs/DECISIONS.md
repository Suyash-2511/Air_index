# Design decisions

Short records of the choices that shape Saans, and why.

### 1. The dose is calculated in code, not by the model
**Decision:** inhaled PM2.5 = concentration × breathing rate × time, using EPA Exposure Factors Handbook (2011) breathing rates and infiltration factors by window habit and setting.
**Why:** families act on these numbers. A model can phrase advice, but it must not invent figures. `lib/gemini/grounding.ts` rejects model text whose numbers don't match the computed plan.

### 2. PM2.5 drives the dose; other pollutants are shown, not dosed
**Decision:** the Air today panel shows India's CPCB AQI and six pollutants, but only PM2.5 feeds the per-person dose.
**Why:** the evidence linking breathing dose to harm is strongest for PM2.5, and it dominates Indian winter smog. Ozone is still used to move outdoor time away from high-ozone afternoons.

### 3. Gemini is used where language is the problem
**Decision:** three uses: reading a family's sentence into a structured day, explaining each change, and answering questions about the plan.
**Why:** these are tasks where free text goes in or plain language comes out. Everything else is deterministic, so it is testable and cannot drift.

### 4. Every model reply is constrained, then checked again
**Decision:** each call uses `responseSchema`, then the reply is re-validated with zod; invalid days from intake are repaired, and if Gemini fails, plans fall back to built-in explanations based on the same numbers.
**Why:** the app must never show a broken day or fail a plan because of one bad reply.

### 5. Changes are ranked by what they actually save this family
**Decision:** each change is applied to the family's day and the dose recomputed; ranking uses micrograms saved, weighted toward more vulnerable people; the micrograms shown are never weighted.
**Why:** generic tip lists ignore that a cycling commute matters more than a closed window for one family and less for another.

### 6. Server-side keys, same-origin proxies
**Decision:** Google and Gemini are called only from API routes; keys come from Secret Manager on Cloud Run; map tiles and the area map are proxied.
**Why:** keys never reach the browser, and coordinates are rounded (about 1 km) before they leave it.

### 7. Works without keys
**Decision:** with no keys set, every service uses fixtures.
**Why:** the tests run offline and deterministically, and anyone can run the app locally in one command.

### 8. Deliberately small dependency set
**Decision:** no UI kit, chart library or state library.
**Why:** a smaller bundle and fewer supply-chain risks; the charts here are simple bars.
