/** Hours in one day, and so the length of the forecast a plan is built from. */
export const FORECAST_HOURS = 24;

/** The CPCB National AQI scale ends at 500, so no computed or reported index goes above it. */
export const AQI_SCALE_MAX = 500;

/** Standard molar volume of an ideal gas at 25 °C and 1 atm (litres/mole), used to convert ppb to mass. */
export const MOLAR_VOLUME_25C = 24.45;

/** Molecular weights (g/mol) used for gaseous pollutant conversions in India. */
export const MOLECULAR_WEIGHTS = {
  no2: 46.01,
  o3: 48.0,
  so2: 64.07,
  co: 28.01,
} as const;

/**
 * Highest concentration treated as a real reading (µg/m³, CO in mg/m³). Anything above is a sensor
 * glitch and is clamped so it cannot distort a dose.
 */
export const POLLUTANT_CEILINGS = {
  pm25: 2000,
  pm10: 2000,
  no2: 2000,
  o3: 2000,
  co: 200,
  so2: 2000,
} as const;

/** India's 24-hour PM2.5 standard (NAAQS 2009), in µg/m³. */
export const INDIA_PM25_24H_LIMIT_UGM3 = 60;

/** Outdoor air at or beyond this many times the daily limit earns an explicit "× limit" note in plain-language copy. */
export const LIMIT_MULTIPLE_WORTH_NOTING = 2;
