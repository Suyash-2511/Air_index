/** Calendar and clock units shared by the exposure maths, the routine builder and the day charts. */
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_MINUTE = 60;
export const MILLISECONDS_PER_SECOND = 1000;
export const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
export const MILLISECONDS_PER_HOUR = MINUTES_PER_HOUR * MILLISECONDS_PER_MINUTE;
export const MILLISECONDS_PER_DAY = HOURS_PER_DAY * MILLISECONDS_PER_HOUR;
export const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;
