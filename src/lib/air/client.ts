/** The browser-safe part of the air module: pollutant facts and the limits worth mentioning. The providers are server-only and live in index.ts. */
export { INDIA_PM25_24H_LIMIT_UGM3, LIMIT_MULTIPLE_WORTH_NOTING } from "./constants";
export {
  CRITERIA_POLLUTANTS,
  getAqiCategoryKey,
  getDominantPollutantInfo,
  getPollutantLimitRatio,
  POLLUTANT_INFO,
  type PollutantCode,
} from "./pollutants";
