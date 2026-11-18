import { createHash } from "node:crypto";

/** Cache operational metrics for monitoring cache efficacy. */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Hashes coordinate and hour inputs into an anonymous key using SHA-256.
 * Protects user privacy by ensuring raw coordinates never appear in memory keys or logs.
 */
export function hashLocationHourKey(lat: number, lng: number, hour: number): string {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const rawKey = `${lat.toFixed(2)},${lng.toFixed(2)}@${normalizedHour}`;
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Lightweight in-memory Least Recently Used (LRU) cache with Time-To-Live (TTL) expiration.
 * Evicts oldest unaccessed entries when maxSize is reached to bound memory footprint.
 */
export class LruCache<T> {
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;
  private readonly store = new Map<string, CacheEntry<T>>();
  private hitCount = 0;
  private missCount = 0;

  constructor(maxSize = 100, defaultTtlMs = 30 * 60 * 1000) {
    this.maxSize = Math.max(1, maxSize);
    this.defaultTtlMs = Math.max(1, defaultTtlMs);
  }

  /**
   * Retrieves an entry if present and not expired.
   * Promotes accessed entry to most recent position.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.missCount += 1;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.missCount += 1;
      return undefined;
    }

    this.hitCount += 1;
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  /**
   * Stores a value under the given key with optional custom TTL.
   * Evicts least recently accessed entry if cache exceeds maxSize.
   */
  set(key: string, value: T, ttlMs?: number): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    const duration = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + duration,
    });
  }

  /** Returns true if the key exists and has not expired. */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /** Clears all stored entries and resets hit/miss counters. */
  clear(): void {
    this.store.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /** Returns current cache metrics. */
  getStats(): CacheStats {
    return {
      hits: this.hitCount,
      misses: this.missCount,
      size: this.store.size,
    };
  }
}

/** Global 30-minute air forecast cache instance. */
export const airCache = new LruCache<unknown>(100, 30 * 60 * 1000);
