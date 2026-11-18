import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/staticmap/route";

describe("GET /api/staticmap", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 when coordinates are missing or invalid", async () => {
    const resNoParams = await GET(new Request("http://localhost:3000/api/staticmap"));
    expect(resNoParams.status).toBe(400);
    const bodyNoParams = await resNoParams.json();
    expect(bodyNoParams.error).toContain("valid coordinates");

    const resBadCoords = await GET(
      new Request("http://localhost:3000/api/staticmap?lat=999&lng=invalid"),
    );
    expect(resBadCoords.status).toBe(400);
    const bodyBadCoords = await resBadCoords.json();
    expect(bodyBadCoords.error).toContain("valid coordinates");
  });

  it("returns 404 JSON in demo mode when no Google Maps key is configured", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");

    const res = await GET(
      new Request("http://localhost:3000/api/staticmap?lat=28.6139&lng=77.209"),
    );
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toContain("application/json");

    const body = await res.json();
    expect(body.error).toContain("Map preview is available when a Google Maps key is configured");
  });
});
