export type PollutantCode = "pm25" | "pm10" | "no2" | "o3" | "co" | "so2";

export interface PollutantInfo {
  readonly code: PollutantCode;
  readonly name: string;
  readonly label: string;
  readonly unit: "µg/m³" | "mg/m³";
  readonly nationalLimit: number;
  readonly limitPeriod: "24-hour" | "8-hour";
  readonly sources: string;
  readonly healthEffect: string;
  readonly atRisk: string;
}

export const CRITERIA_POLLUTANTS: readonly PollutantCode[] = [
  "pm25",
  "pm10",
  "no2",
  "o3",
  "co",
  "so2",
] as const;

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
  },
};

/** Computes the ratio of a pollutant concentration relative to its Indian National Ambient Air Quality standard. */
export function getPollutantLimitRatio(code: PollutantCode, concentration: number): number {
  const info = POLLUTANT_INFO[code];
  if (!info || !Number.isFinite(concentration) || concentration <= 0) return 0;
  return Math.round((concentration / info.nationalLimit) * 10) / 10;
}

/** Resolves pollutant metadata for a given dominant code string. */
export function getDominantPollutantInfo(dominantCode?: string): PollutantInfo {
  const clean = (dominantCode ?? "pm25").toLowerCase().replace(".", "") as PollutantCode;
  return POLLUTANT_INFO[clean] ?? POLLUTANT_INFO.pm25;
}
