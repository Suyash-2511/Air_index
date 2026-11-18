import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHeatmapTile, getTransparentTile, validateTileCoords } from "@/lib/air/heatmap";
import { tileCache } from "@/lib/cache";

describe("Heatmap Tile Proxy & Validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    tileCache.clear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("validates zoom and coordinate boundaries", () => {
    // Valid zoom 0: x=0, y=0
    expect(() => validateTileCoords(0, 0, 0)).not.toThrow();

    // Valid zoom 10: x=512, y=512
    expect(() => validateTileCoords(10, 512, 512)).not.toThrow();

    // Negative zoom
    expect(() => validateTileCoords(-1, 0, 0)).toThrow(/Invalid zoom/i);

    // Zoom > 16
    expect(() => validateTileCoords(17, 0, 0)).toThrow(/Invalid zoom/i);

    // Coordinate exceeds 2^zoom - 1
    // At zoom 2, max coordinate is 3
    expect(() => validateTileCoords(2, 4, 0)).toThrow(/Invalid x coordinate/i);
    expect(() => validateTileCoords(2, 0, 4)).toThrow(/Invalid y coordinate/i);
  });

  it("returns transparent 256x256 PNG in demo mode when no key is set", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const tile = await getHeatmapTile(10, 512, 512);
    expect(tile).toBeInstanceOf(Uint8Array);
    expect(tile.length).toBeGreaterThan(100);

    // Verify PNG header signature: 0x89 'P' 'N' 'G'
    expect(tile[0]).toBe(0x89);
    expect(tile[1]).toBe(0x50);
    expect(tile[2]).toBe(0x4e);
    expect(tile[3]).toBe(0x47);

    // Generates identical buffer to getTransparentTile
    const transparent = getTransparentTile();
    expect(tile).toEqual(transparent);
  });

  it("sends key in X-Goog-Api-Key header and never in URL for tile fetch", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "test-tile-key";

    const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => fakePng.buffer,
    });
    vi.stubGlobal("fetch", fetchMock);

    const tile = await getHeatmapTile(10, 731, 412);
    expect(tile).toEqual(fakePng);

    const firstCall = fetchMock.mock.calls[0];
    const calledUrl = firstCall ? String(firstCall[0]) : "";
    const calledInit = (firstCall ? firstCall[1] : undefined) as RequestInit | undefined;

    expect(calledUrl).toContain("heatmapTiles/10/731/412");
    expect(calledUrl).not.toContain("key=");
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-tile-key");
  });
});
