import type { TranslationKey } from "@/lib/i18n";
import { roundTo } from "../format";

/** Short code of a pollutant the app reports, as used in readings and in the health table. */
export type PollutantCode = "pm25" | "pm10" | "no2" | "o3" | "co" | "so2";

interface PollutantInfo {
  readonly code: PollutantCode;
  readonly name: string;
  readonly label: string;
  readonly unit: "µg/m³" | "mg/m³";
  readonly nationalLimit: number;
  readonly limitPeriod: "24-hour" | "8-hour";
  readonly sources: string;
  readonly healthEffect: string;
  readonly atRisk: string;
  readonly nameKey: TranslationKey;
  readonly sourcesKey: TranslationKey;
  readonly healthEffectKey: TranslationKey;
  readonly atRiskKey: TranslationKey;
}

/** The six pollutants shown in the air card, in display order. */
export const CRITERIA_POLLUTANTS: readonly PollutantCode[] = [
  "pm25",
  "pm10",
  "no2",
  "o3",
  "co",
  "so2",
] as const;

/** Plain-language facts for each pollutant: the national limit, why it matters, where it comes from and who is most at risk. */
export const POLLUTANT_INFO: Readonly<Record<PollutantCode, PollutantInfo>> = {
  pm25: {
    code: "pm25",
    name: "Fine particulate matter",
    label: "PM2.5",
    unit: "µg/m³",
    nationalLimit: 60,
    limitPeriod: "24-hour",
    sources: "Vehicles, biomass and coal burning, industrial emissions, road dust.",
    healthEffect: "Deep lung penetration that enters the bloodstream, triggering respiratory and cardiovascular distress.",
    atRisk: "Children, older adults, pregnant people, and those with heart or lung disease.",
    nameKey: "pollutant_name_pm25",
    sourcesKey: "pollutant_sources_pm25",
    healthEffectKey: "pollutant_effects_pm25",
    atRiskKey: "pollutant_at_risk_pm25",
  },
  pm10: {
    code: "pm10",
    name: "Coarse particulate matter",
    label: "PM10",
    unit: "µg/m³",
    nationalLimit: 100,
    limitPeriod: "24-hour",
    sources: "Construction sites, unpaved roads, windblown soil, agricultural burning.",
    healthEffect: "Irritates upper airways, eyes, and throat, aggravating chronic bronchitis and asthma.",
    atRisk: "Outdoor workers, children, and people with existing respiratory conditions.",
    nameKey: "pollutant_name_pm10",
    sourcesKey: "pollutant_sources_pm10",
    healthEffectKey: "pollutant_effects_pm10",
    atRiskKey: "pollutant_at_risk_pm10",
  },
  no2: {
    code: "no2",
    name: "Nitrogen dioxide",
    label: "NO2",
    unit: "µg/m³",
    nationalLimit: 80,
    limitPeriod: "24-hour",
    sources: "Motor vehicles, diesel generators, thermal power plants, gas stoves.",
    healthEffect: "Inflames the lining of the lungs, reduces immunity to lung infections, and sparks asthma attacks.",
    atRisk: "Commuters, children living near major roads, and people with asthma.",
    nameKey: "pollutant_name_no2",
    sourcesKey: "pollutant_sources_no2",
    healthEffectKey: "pollutant_effects_no2",
    atRiskKey: "pollutant_at_risk_no2",
  },
  o3: {
    code: "o3",
    name: "Ground-level ozone",
    label: "O3",
    unit: "µg/m³",
    nationalLimit: 100,
    limitPeriod: "8-hour",
    sources: "Formed in sunlight from vehicular emissions and volatile organic compounds (VOCs).",
    healthEffect: "Strong oxidant that inflames airway tissues, causing chest tightness, coughing, and reduced lung capacity.",
    atRisk: "Children active outdoors in sunny afternoons, athletes, and asthmatics.",
    nameKey: "pollutant_name_o3",
    sourcesKey: "pollutant_sources_o3",
    healthEffectKey: "pollutant_effects_o3",
    atRiskKey: "pollutant_at_risk_o3",
  },
  co: {
    code: "co",
    name: "Carbon monoxide",
    label: "CO",
    unit: "mg/m³",
    nationalLimit: 2,
    limitPeriod: "8-hour",
    sources: "Incomplete fuel combustion in petrol engines, biomass cookstoves, and generators.",
    healthEffect: "Binds to blood haemoglobin in place of oxygen, causing dizziness, fatigue, and cardiac strain.",
    atRisk: "People with ischaemic heart disease, fetuses, newborns, and traffic workers.",
    nameKey: "pollutant_name_co",
    sourcesKey: "pollutant_sources_co",
    healthEffectKey: "pollutant_effects_co",
    atRiskKey: "pollutant_at_risk_co",
  },
  so2: {
    code: "so2",
    name: "Sulphur dioxide",
    label: "SO2",
    unit: "µg/m³",
    nationalLimit: 80,
    limitPeriod: "24-hour",
    sources: "Coal-fired power generation, oil refineries, and industrial smelters.",
    healthEffect: "Causes rapid bronchial constriction, throat irritation, and worsens underlying respiratory illness.",
    atRisk: "Asthmatics exercising outdoors, elderly individuals, and industrial-adjacent communities.",
    nameKey: "pollutant_name_so2",
    sourcesKey: "pollutant_sources_so2",
    healthEffectKey: "pollutant_effects_so2",
    atRiskKey: "pollutant_at_risk_so2",
  },
};

/** Computes the ratio of a pollutant concentration relative to its Indian National Ambient Air Quality standard. */
export function getPollutantLimitRatio(code: PollutantCode, concentration: number): number {
  const info = POLLUTANT_INFO[code];
  if (!info || !Number.isFinite(concentration) || concentration <= 0) return 0;
  return roundTo(concentration / info.nationalLimit, 1);
}

const isPollutantCode = (code: string): code is PollutantCode => Object.hasOwn(POLLUTANT_INFO, code);

/** Resolves pollutant metadata for a given dominant code string. */
export function getDominantPollutantInfo(dominantCode?: string): PollutantInfo {
  const clean = (dominantCode ?? "pm25").toLowerCase().replace(".", "");
  return isPollutantCode(clean) ? POLLUTANT_INFO[clean] : POLLUTANT_INFO.pm25;
}

/** Resolves translation key for an AQI category string. */
export function getAqiCategoryKey(category?: string): TranslationKey {
  if (!category) return "aqi_cat_moderate";
  const norm = category.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (norm === "good") return "aqi_cat_good";
  if (norm === "satisfactory") return "aqi_cat_satisfactory";
  if (norm === "moderate") return "aqi_cat_moderate";
  if (norm === "poor") return "aqi_cat_poor";
  if (norm === "very_poor") return "aqi_cat_very_poor";
  if (norm === "severe") return "aqi_cat_severe";
  return "aqi_cat_moderate";
}
