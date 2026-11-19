import zlib from "node:zlib";
import { tileCache, tileKey } from "../cache";
import { getGoogleMapsApiKey, hasAirKey } from "../env";
import { googleBinary } from "../google";
import { AppError, HTTP_STATUS } from "../security";

/** Map type used for Universal Air Quality Index heatmap layers. */
const UNIVERSAL_AQI_MAP_TYPE = "UAQI_RED_GREEN";

/** Validates tile coordinate numbers against map zoom limits. */
export function validateTileCoords(zoom: number, x: number, y: number): void {
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 16) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, "Invalid zoom level. Must be an integer between 0 and 16.");
  }
  const maxIndex = 2 ** zoom - 1;
  if (!Number.isInteger(x) || x < 0 || x > maxIndex) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, `Invalid x coordinate. Must be between 0 and ${maxIndex} for zoom ${zoom}.`);
  }
  if (!Number.isInteger(y) || y < 0 || y > maxIndex) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, `Invalid y coordinate. Must be between 0 and ${maxIndex} for zoom ${zoom}.`);
  }
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

let cachedDemoTile: Uint8Array | null = null;

/** Generates a standard 256×256 transparent RGBA PNG image buffer for demo mode. */
export function getTransparentTile(): Uint8Array {
  if (cachedDemoTile) return cachedDemoTile;

  const width = 256;
  const height = 256;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // Color type 6: RGBA
  ihdrData[10] = 0; // Deflate compression
  ihdrData[11] = 0; // Standard filter
  ihdrData[12] = 0; // No interlace
  const ihdr = makePngChunk("IHDR", ihdrData);

  // 256 scanlines: 1 filter byte (0) + 256 * 4 RGBA bytes (0)
  const scanlines = Buffer.alloc(height * (1 + width * 4), 0);
  const compressed = zlib.deflateSync(scanlines);
  const idat = makePngChunk("IDAT", compressed);
  const iend = makePngChunk("IEND", Buffer.alloc(0));

  cachedDemoTile = new Uint8Array(Buffer.concat([signature, ihdr, idat, iend]));
  return cachedDemoTile;
}

/**
 * Proxies Google Maps Air Quality heatmap tiles with in-memory caching and demo fallbacks.
 * Uses X-Goog-Api-Key authentication; never reveals credentials in URL or error responses.
 */
export async function getHeatmapTile(zoom: number, x: number, y: number): Promise<Uint8Array> {
  validateTileCoords(zoom, x, y);

  const key = tileKey(zoom, x, y);
  const cached = tileCache.get(key);
  if (cached) return cached;

  if (!hasAirKey()) {
    const demo = getTransparentTile();
    tileCache.set(key, demo);
    return demo;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    const demo = getTransparentTile();
    tileCache.set(key, demo);
    return demo;
  }

  const url = `https://airquality.googleapis.com/v1/mapTypes/${UNIVERSAL_AQI_MAP_TYPE}/heatmapTiles/${zoom}/${x}/${y}`;
  const tileBytes = await googleBinary(url, apiKey);
  tileCache.set(key, tileBytes);
  return tileBytes;
}
