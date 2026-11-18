/** Standard molar volume of an ideal gas at 25 °C and 1 atm (litres/mole). */
export const MOLAR_VOLUME_25C = 24.45;

/** Molecular weights (g/mol) used for gaseous pollutant conversions in India. */
export const MOLECULAR_WEIGHTS = {
  no2: 46.01,
  o3: 48.0,
  so2: 64.07,
  co: 28.01,
} as const;

/**
 * Converts a gas concentration from parts per billion (ppb) to micrograms per cubic metre (µg/m³)
 * at 25 °C and 1 atmosphere: µg/m³ = (ppb × MW) / 24.45.
 */
export function ppbToMicrograms(ppb: number, molecularWeight: number): number {
  if (!Number.isFinite(ppb) || ppb < 0) return 0;
  return Math.round(((ppb * molecularWeight) / MOLAR_VOLUME_25C) * 100) / 100;
}

/**
 * Converts carbon monoxide (CO) from parts per billion (ppb) to milligrams per cubic metre (mg/m³)
 * at 25 °C and 1 atmosphere: mg/m³ = (ppb × 28.01) / 24.45 / 1000.
 */
export function ppbToMilligramsCo(ppb: number): number {
  if (!Number.isFinite(ppb) || ppb < 0) return 0;
  return Math.round(((ppb * MOLECULAR_WEIGHTS.co) / MOLAR_VOLUME_25C / 1000) * 100) / 100;
}

/**
 * Normalises raw Google Air Quality API concentration values into standard Indian units
 * (µg/m³ for PM and criteria gases, mg/m³ for CO).
 */
export function convertPollutantConcentration(code: string, value: number, units: string): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  const cleanCode = code.trim().toLowerCase();
  const cleanUnits = units.trim().toUpperCase();

  if (cleanCode === "co") {
    if (cleanUnits === "PARTS_PER_BILLION") return ppbToMilligramsCo(value);
    if (cleanUnits === "MILLIGRAMS_PER_CUBIC_METER") return Math.round(value * 100) / 100;
    if (cleanUnits === "MICROGRAMS_PER_CUBIC_METER") return Math.round((value / 1000) * 100) / 100;
    return Math.round(value * 100) / 100;
  }

  if (cleanUnits === "PARTS_PER_BILLION") {
    const mw = cleanCode in MOLECULAR_WEIGHTS
      ? MOLECULAR_WEIGHTS[cleanCode as keyof typeof MOLECULAR_WEIGHTS]
      : undefined;
    return mw !== undefined ? ppbToMicrograms(value, mw) : Math.round(value * 100) / 100;
  }

  return Math.round(value * 100) / 100;
}
