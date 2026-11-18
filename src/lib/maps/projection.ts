/** Size of one Web Mercator tile in CSS pixels. */
export const TILE_SIZE = 256;

/** Map preview geometry shared by the server proxy and the client overlay. */
export const MAP_PREVIEW = { width: 640, height: 360, zoom: 12 } as const;

/**
 * Rounds coordinates to two decimals (about 1 km) before they leave the browser.
 * The map and the heatmap overlay both use the rounded centre so they line up,
 * and the server never sees a precise home location.
 */
export function roundForMap(lat: number, lng: number): { lat: number; lng: number } {
  return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
}

/** Converts latitude/longitude to absolute Web Mercator pixels at a zoom level. */
export function worldPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

/** One heatmap tile placed inside the preview, in percentages of the preview box. */
export interface PlacedTile {
  x: number;
  y: number;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

/**
 * Lists the heatmap tiles that cover a map preview centred on (lat, lng), with
 * positions expressed as percentages so the overlay scales with the image.
 */
export function tilesForPreview(
  lat: number,
  lng: number,
  { width, height, zoom } = MAP_PREVIEW,
): PlacedTile[] {
  const centre = worldPixel(lat, lng, zoom);
  const left = centre.x - width / 2;
  const top = centre.y - height / 2;
  const count = 2 ** zoom;
  const tiles: PlacedTile[] = [];

  for (let ty = Math.floor(top / TILE_SIZE); ty <= Math.floor((top + height - 1) / TILE_SIZE); ty += 1) {
    if (ty < 0 || ty >= count) continue;
    for (let tx = Math.floor(left / TILE_SIZE); tx <= Math.floor((left + width - 1) / TILE_SIZE); tx += 1) {
      tiles.push({
        x: ((tx % count) + count) % count,
        y: ty,
        leftPct: ((tx * TILE_SIZE - left) / width) * 100,
        topPct: ((ty * TILE_SIZE - top) / height) * 100,
        widthPct: (TILE_SIZE / width) * 100,
        heightPct: (TILE_SIZE / height) * 100,
      });
    }
  }
  return tiles;
}
