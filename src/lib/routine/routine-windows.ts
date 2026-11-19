export interface WindowScore {
  start: number;
  end: number;
  mean: number;
  meanO3?: number | undefined;
}

/** Evaluates all 2-hour daytime blocks (07:00-19:00) ranked by lowest PM2.5. */
export function findDaytimeWindows(
  fMap: ReadonlyMap<number, number>,
  o3Map: ReadonlyMap<number, number>,
): WindowScore[] {
  const windows: WindowScore[] = [];
  for (let h = 7; h <= 17; h += 1) {
    const p1 = fMap.get(h);
    const p2 = fMap.get(h + 1);
    if (p1 !== undefined && p2 !== undefined) {
      const mean = (p1 + p2) / 2;
      const o1 = o3Map.get(h);
      const o2 = o3Map.get(h + 1);
      const meanO3 = o1 !== undefined && o2 !== undefined ? (o1 + o2) / 2 : undefined;
      windows.push({ start: h, end: h + 2, mean, meanO3 });
    }
  }
  return windows.sort((a, b) => a.mean - b.mean);
}

/** Identifies contiguous peak smog hours exceeding 1.5x daily average or 90 µg/m³. */
export function findDirtiestStretch(
  forecast: readonly { hour: number; pm25: number }[],
): { start: number; end: number; mean: number } | undefined {
  if (forecast.length === 0) return undefined;
  const dailyMean = forecast.reduce((s, f) => s + f.pm25, 0) / forecast.length;
  const threshold = Math.max(1.5 * dailyMean, 90);
  const stretches: { hour: number; pm25: number }[][] = [];
  let cur: { hour: number; pm25: number }[] = [];

  for (const f of forecast) {
    if (f.pm25 >= threshold) cur.push(f);
    else if (cur.length > 0) {
      stretches.push(cur);
      cur = [];
    }
  }
  if (cur.length > 0) stretches.push(cur);
  if (stretches.length === 0) return undefined;

  stretches.sort((a, b) => b.reduce((s, f) => s + f.pm25, 0) / b.length - a.reduce((s, f) => s + f.pm25, 0) / a.length);
  const worst = stretches[0];
  if (!worst || worst.length === 0) return undefined;

  const start = worst[0]?.hour ?? 0;
  const end = Math.min(24, (worst[worst.length - 1]?.hour ?? 0) + 1);
  const mean = Math.round(worst.reduce((s, f) => s + f.pm25, 0) / worst.length);
  return { start, end, mean };
}
