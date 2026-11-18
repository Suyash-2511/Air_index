import { beforeEach, describe, expect, it } from "vitest";
import { hashLocationHourKey, LruCache } from "@/lib/cache";

describe("LRU Cache with TTL", () => {
  let cache: LruCache<string>;

  beforeEach(() => {
    cache = new LruCache<string>(3, 100); // 3 items max, 100ms TTL
  });

  it("hashes location coordinates and hour so raw numbers never appear in key", () => {
    const key = hashLocationHourKey(28.6139, 77.209, 14);
    expect(key).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
    expect(key).not.toContain("28.61");
    expect(key).not.toContain("77.20");

    // Coordinates rounded to 2 decimal places produce identical hashes
    const key2 = hashLocationHourKey(28.6141, 77.2089, 14);
    expect(key).toBe(key2);
  });

  it("records cache hit, miss, and updates counters", () => {
    cache.set("key1", "val1");

    expect(cache.get("key1")).toBe("val1"); // hit
    expect(cache.get("key2")).toBeUndefined(); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
  });

  it("expires items past TTL duration and increments miss counter", async () => {
    cache.set("expireKey", "quickVal", 30); // 30ms TTL

    expect(cache.get("expireKey")).toBe("quickVal");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cache.get("expireKey")).toBeUndefined();
    expect(cache.has("expireKey")).toBe(false);

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it("evicts least recently used item when capacity is exceeded", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    // Access 'a' so 'b' becomes least recently used
    expect(cache.get("a")).toBe("1");

    // Adding 'd' should evict 'b'
    cache.set("d", "4");

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
    expect(cache.getStats().size).toBe(3);
  });

  it("clears cache and resets stats", () => {
    cache.set("x", "10");
    cache.get("x");
    cache.get("y");

    cache.clear();
    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.size).toBe(0);
  });
});
