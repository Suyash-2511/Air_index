import { LruCache } from "../cache";
import { getGoogleMapsApiKey } from "../env";
import { googleBinary } from "../google";
import { AppError, HTTP_STATUS } from "../security";
import { MAP_PREVIEW, roundForMap } from "./projection";

/** Muted map styling so the smog heatmap, not the basemap, carries the colour. */
const MAP_STYLES = [
  "feature:all|element:labels.icon|visibility:off",
  "feature:poi|visibility:off",
  "feature:transit|visibility:off",
  "feature:landscape|color:0xefeae2",
  "feature:water|color:0xc9dbe4",
  "feature:road|element:geometry|color:0xffffff",
  "feature:road|element:labels|visibility:off",
  "feature:administrative|element:labels.text.fill|color:0x5c5449",
] as const;

const mapCache = new LruCache<Uint8Array>(200, 6 * 60 * 60 * 1000);

/**
 * Builds the Maps Static API URL for a rounded centre. The key is appended only
 * on the server, because this endpoint accepts it as a query parameter.
 */
export function buildStaticMapUrl(lat: number, lng: number, apiKey: string): string {
  const centre = roundForMap(lat, lng);
  const params = new URLSearchParams({
    center: `${centre.lat},${centre.lng}`,
    zoom: String(MAP_PREVIEW.zoom),
    size: `${MAP_PREVIEW.width}x${MAP_PREVIEW.height}`,
    scale: "2",
    format: "png",
    key: apiKey,
  });
  for (const style of MAP_STYLES) params.append("style", style);
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/**
 * Returns a PNG basemap for the area, cached for six hours per rounded centre.
 * Throws a 404 AppError in demo mode so the client can show its fallback.
 */
export async function getStaticMap(lat: number, lng: number): Promise<Uint8Array> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) throw new AppError(HTTP_STATUS.NOT_FOUND, "Map preview is available when a Google Maps key is configured.");

  const centre = roundForMap(lat, lng);
  const key = `${centre.lat},${centre.lng}`;
  const cached = mapCache.get(key);
  if (cached) return cached;

  const image = await googleBinary(buildStaticMapUrl(lat, lng, apiKey), apiKey);
  mapCache.set(key, image);
  return image;
}
