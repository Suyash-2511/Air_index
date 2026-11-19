import { MOLAR_VOLUME_25C, MOLECULAR_WEIGHTS } from "./constants";
import { roundTo } from "../format";

/**
 * Converts a gas concentration from parts per billion (ppb) to micrograms per cubic metre (µg/m³)
 * at 25 °C and 1 atmosphere: µg/m³ = (ppb × MW) / 24.45.
 */
export function ppbToMicrograms(ppb: number, molecularWeight: number): number {
  if (!Number.isFinite(ppb) || ppb < 0) return 0;
  return roundTo((ppb * molecularWeight) / MOLAR_VOLUME_25C, 2);
}

/**
 * Converts carbon monoxide (CO) from parts per billion (ppb) to milligrams per cubic metre (mg/m³)
 * at 25 °C and 1 atmosphere: mg/m³ = (ppb × 28.01) / 24.45 / 1000.
 */
export function ppbToMilligramsCo(ppb: number): number {
  if (!Number.isFinite(ppb) || ppb < 0) return 0;
  return roundTo((ppb * MOLECULAR_WEIGHTS.co) / MOLAR_VOLUME_25C / 1000, 2);
}

/**
 * Normalises raw Google Air Quality API concentration values into standard Indian units
 * (µg/m³ for PM and criteria gases, mg/m³ for CO).
 */
const isGasWithWeight = (code: string): code is keyof typeof MOLECULAR_WEIGHTS => Object.hasOwn(MOLECULAR_WEIGHTS, code);

/** Converts a provider reading to the units India reports in: ug/m3, or mg/m3 for carbon monoxide. */
export function convertPollutantConcentration(code: string, value: number, units: string): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  const cleanCode = code.trim().toLowerCase();
  const cleanUnits = units.trim().toUpperCase();

  if (cleanCode === "co") {
    if (cleanUnits === "PARTS_PER_BILLION") return ppbToMilligramsCo(value);
    if (cleanUnits === "MILLIGRAMS_PER_CUBIC_METER") return roundTo(value, 2);
    if (cleanUnits === "MICROGRAMS_PER_CUBIC_METER") return roundTo(value / 1000, 2);
    return roundTo(value, 2);
  }

  if (cleanUnits === "PARTS_PER_BILLION") {
    return isGasWithWeight(cleanCode) ? ppbToMicrograms(value, MOLECULAR_WEIGHTS[cleanCode]) : roundTo(value, 2);
  }

  return roundTo(value, 2);
}
