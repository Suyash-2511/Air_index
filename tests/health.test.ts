import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";
import { getHealthReport } from "@/lib/health";

describe("health check", () => {
  const secretKey = "AIzaSySuperSecretHealthKey9876";

  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports status ok and demo mode when no keys are configured", () => {
    const report = getHealthReport();
    expect(report.status).toBe("ok");
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(report.services.gemini).toBe("demo");
    expect(report.services.airQuality).toBe("demo");
    expect(report.services.places).toBe("demo");
    expect(report.services.staticMaps).toBe("demo");
    expect(report.caches.air).toBeDefined();
    expect(report.caches.plans).toBeDefined();
  });

  it("reports live modes when API keys are configured via environment", () => {
    vi.stubEnv("GEMINI_API_KEY", secretKey);
    vi.stubEnv("GOOGLE_MAPS_API_KEY", secretKey);

    const report = getHealthReport();
    expect(report.status).toBe("ok");
    expect(report.services.gemini).toBe("live");
    expect(report.services.airQuality).toBe("live");
    expect(report.services.places).toBe("live");
    expect(report.services.staticMaps).toBe("live");
  });

  it("never includes any secret key string in the health report JSON", async () => {
    vi.stubEnv("GEMINI_API_KEY", secretKey);
    vi.stubEnv("GOOGLE_MAPS_API_KEY", secretKey);

    const report = getHealthReport();
    const serializedReport = JSON.stringify(report);
    expect(serializedReport).not.toContain(secretKey);

    const response = GET();
    const json = await response.json();
    const serializedResponse = JSON.stringify(json);
    expect(serializedResponse).not.toContain(secretKey);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
