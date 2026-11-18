# Exposure model

Saans estimates how much fine particulate matter (PM2.5) each person in a household inhales over a day, then measures how much each possible change would reduce it. All of this is plain arithmetic in `src/lib/exposure/` and `src/lib/interventions/`; no language model produces any of these numbers.

## The formula

For each block of a person's day:

```
dose (µg) = concentration breathed (µg/m³) × breathing rate (m³/h) × time (h)
```

Blocks are split by clock hour, because outdoor PM2.5 changes through the day. A person's daily dose is the sum over all their blocks.

## Breathing rates (sourced)

From the U.S. EPA *Exposure Factors Handbook* (2011), Chapter 6, Table 6-2, mean short-term inhalation rates, males and females combined. Values in m³/minute.

| Saans age band | Handbook row | Sleep | Sedentary | Light | Moderate | High |
|---|---|---|---|---|---|---|
| infant | Birth to <1 yr | 0.0030 | 0.0031 | 0.0076 | 0.014 | 0.026 |
| child | 6 to <11 yr | 0.0045 | 0.0048 | 0.011 | 0.022 | 0.042 |
| teen | 11 to <16 yr | 0.0050 | 0.0054 | 0.013 | 0.025 | 0.049 |
| adult | 31 to <41 yr | 0.0046 | 0.0043 | 0.012 | 0.027 | 0.049 |
| older_adult | 61 to <71 yr | 0.0052 | 0.0049 | 0.012 | 0.026 | 0.047 |

## Activity intensity (assumption)

The handbook gives rates by intensity, not by activity, so the mapping below is ours, guided by typical MET values in the Compendium of Physical Activities (Ainsworth et al., 2011).

| Activity | Intensity |
|---|---|
| sleep | sleep |
| resting indoors, riding in a vehicle | sedentary |
| light indoor work, cooking | light |
| walking commute, outdoor work, children's outdoor play | moderate |
| cycling commute, outdoor exercise | high |

## Concentration breathed (assumptions)

These coefficients are modelling assumptions chosen inside ranges reported in the literature. They are deliberately simple and are stated here so they can be challenged and replaced.

| Setting or factor | Value | Notes |
|---|---|---|
| Outdoors | outdoor PM2.5 | Taken directly from the hourly forecast |
| In a vehicle | × 0.6 | In-cabin ratios vary widely with ventilation |
| Indoors, windows kept closed | × 0.45 | Residential infiltration factors mostly fall between about 0.3 and 1.0 |
| Indoors, windows open sometimes | × 0.65 | |
| Indoors, windows open often | × 0.85 | |
| HEPA purifier in the same room | × 0.5 | Portable purifier trials commonly report roughly halving room PM2.5 |
| Cooking (added for the cook only) | electric 0, piped gas 10, LPG 15, kerosene 80, biomass 300 µg/m³ | Illustrative increments |
| Exhaust fan or chimney | cooking increment × 0.5 | |
| Indoor smoking | + 30 µg/m³ indoors | |
| Mask outdoors | × 0.5 | Cautious real-world fit, not a laboratory rating |

A missing forecast hour falls back to the day's mean, so a data gap never produces zero or undefined exposure.

## Ranking

Each candidate change is applied to a copy of the household, the whole day is recomputed, and the difference is the saving. Changes that save nothing are dropped.

Changes are ordered by a priority score: each member's saving multiplied by a vulnerability weight. Infants, children, older adults, pregnant women and people with heart or lung conditions get higher weights, following the sensitive groups named by the WHO and US EPA. The weight affects order only. It never changes anyone's dose, and the micrograms and percentages shown are always the physical saving.

## Limitations

- Concentrations are hourly; very short peaks are averaged out.
- Indoor air is modelled per room with a single infiltration factor, not a full mass-balance model.
- Health outcomes are not estimated. Saans reports dose, which is a better guide than outdoor AQI alone, but it is not medical advice.
