import { describe, expect, it } from "vitest";
import { MAP_PREVIEW, roundForMap, tilesForPreview, worldPixel } from "@/lib/maps/projection";

describe("projection", () => {
  it("worldPixel(0, 0, 0) returns centre of the world tile (128, 128)", () => {
    const pixel = worldPixel(0, 0, 0);
    expect(pixel.x).toBe(128);
    expect(pixel.y).toBe(128);
  });

  it("roundForMap rounds coordinates to 2 decimal places", () => {
    expect(roundForMap(28.6139, 77.209)).toEqual({ lat: 28.61, lng: 77.21 });
    expect(roundForMap(19.076, 72.8777)).toEqual({ lat: 19.08, lng: 72.88 });
    expect(roundForMap(12.9716, 77.5946)).toEqual({ lat: 12.97, lng: 77.59 });
  });

  it("tiles cover the full preview box (min left <= 0, max right >= 100)", () => {
    const tiles = tilesForPreview(28.61, 77.21);
    expect(tiles.length).toBeGreaterThan(0);

    const minLeft = Math.min(...tiles.map((t) => t.leftPct));
    const maxRight = Math.max(...tiles.map((t) => t.leftPct + t.widthPct));
    const minTop = Math.min(...tiles.map((t) => t.topPct));
    const maxBottom = Math.max(...tiles.map((t) => t.topPct + t.heightPct));

    expect(minLeft).toBeLessThanOrEqual(0);
    expect(maxRight).toBeGreaterThanOrEqual(100);
    expect(minTop).toBeLessThanOrEqual(0);
    expect(maxBottom).toBeGreaterThanOrEqual(100);
  });

  it("x coordinate wraps appropriately near longitude 180", () => {
    const tilesEast = tilesForPreview(0, 179.99);
    const tilesWest = tilesForPreview(0, -179.99);
    const count = 2 ** MAP_PREVIEW.zoom;

    for (const t of [...tilesEast, ...tilesWest]) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThan(count);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThan(count);
    }
  });
});
