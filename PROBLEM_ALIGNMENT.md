# Problem statement alignment

**Challenge:** build a GenAI assistant that helps families and communities get through severe winter smog and urban air pollution: low-emission routines, indoor air hacks and sustainable alternatives, tailored to location and lifestyle, explaining the direct impact of their choices.

Each phrase of the brief, and where Saans answers it:

| The brief asks for | What Saans does | Where |
|---|---|---|
| **GenAI assistant** | Gemini reads the family's own sentence and builds each person's day; explains every change in plain language; answers questions using only this family's plan | `lib/gemini/intake.ts`, `explain.ts`, `ask.ts` |
| **Families** | Each person gets their own dose, by age group, health conditions (asthma, COPD, heart condition, pregnancy) and their own hours | `components/household/MemberCard.tsx`, `lib/exposure/dose.ts` |
| **Communities** | A plain-text community brief for a building or neighbourhood group, community pledges that cut smog households make, a print view | `lib/brief.ts`, `components/community/CommunityPledge.tsx` |
| **Severe winter smog** | Live hourly PM2.5 forecast, India's CPCB AQI and six pollutants against India's limits; an explainer on why winter nights and mornings are worst (temperature inversion) | `components/plan/AirToday.tsx`, `InversionExplainer.tsx` |
| **Urban air pollution** | Google Air Quality data for the exact neighbourhood, smog heatmap on a map of the area | `lib/air/*`, `components/plan/AreaMap.tsx` |
| **Low-emission routines** | "Your routine for today": when to keep windows shut, the cleanest hours to air the house or go outside (ozone-aware), safer commutes, cooking and sleep, each with a Google Calendar link | `lib/routine/build-routine.ts`, `components/plan/RoutineTimeline.tsx` |
| **Indoor air hacks** | 8 practical hacks with cost and effort (DIY box-fan filter, wet mopping, sealing gaps, no incense or mosquito coils, chimney after cooking, N95 fit), a myth check, and a purifier size calculator per room | `lib/indoor/*`, `components/indoor/*` |
| **Sustainable alternatives** | Commute comparison of walk, cycle, bus, metro, auto and car by inhaled dose **and** CO₂; changes that cut a home's own emissions are tagged "Also cuts smog you make" | `lib/commute/compare.ts`, `components/commute/CommuteCompare.tsx` |
| **Tailored to location** | Area search across India (Google Places) or the browser's location; the forecast, AQI, map and routine are all for that spot | `components/steps/WhereStep.tsx`, `hooks/useBrowserLocation.ts` |
| **Tailored to lifestyle** | Window habit, cooking fuel, purifier, chimney, smoking, each person's commute mode and outdoor time all change the dose and the advice | `components/household/*`, `lib/exposure/infiltration.ts` |
| **Explain the direct impact of choices** | Every change shows micrograms and percent saved for that family; switching it on updates the dose, the chart and each person's total instantly | `components/plan/ChangeCard.tsx`, `lib/interventions/combine.ts` |

## Who it is for

A family in an Indian city during smog season, including people who are more at risk (children, older adults, people with asthma or COPD, pregnant women). It works in English and Hindi, can read the plan aloud, and runs on a phone.

## What it does not do

Saans gives exposure estimates for planning. It is not medical advice, and it says so on every plan.
