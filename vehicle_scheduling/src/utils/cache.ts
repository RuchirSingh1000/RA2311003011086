import { CacheEntry } from '../types';

/**
 * Simple in-memory TTL cache.
 * Suitable for single-instance deployments; swap for Redis in multi-instance setups.
 */
export class InMemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  flush(): void {
    this.store.clear();
  }
}

export const cache = new InMemoryCache();
