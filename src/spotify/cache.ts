import { config } from '../config';
import { createDefaultLogger, createNoopMetrics, type Logger, type Metrics } from '../logger';

export type CacheState = 'fresh' | 'stale' | 'miss';

export interface CacheGetResult<T> {
  state: CacheState;
  value?: T;
}

export interface CacheStore {
  get<T>(key: string): Promise<CacheGetResult<T>>;
  set<T>(key: string, value: T, ttlMs: number, maxStaleMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  clearByPrefix(prefix: string): Promise<void>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleUntil: number;
}

class SimpleLRU<K, V> {
  private readonly maxEntries: number;
  private readonly map = new Map<K, V>();

  constructor(maxEntries: number) {
    this.maxEntries = Math.max(1, maxEntries);
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (!value) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V) {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    if (this.map.size > this.maxEntries) {
      const firstKey = this.map.keys().next().value as K | undefined;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }
  }

  delete(key: K) {
    this.map.delete(key);
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }
}

class InMemoryCache implements CacheStore {
  private readonly lru: SimpleLRU<string, CacheEntry<unknown>>;

  constructor(maxEntries: number) {
    this.lru = new SimpleLRU(maxEntries);
  }

  async get<T>(key: string): Promise<CacheGetResult<T>> {
    const entry = this.lru.get(key) as CacheEntry<T> | undefined;
    if (!entry) return { state: 'miss' };
    const now = Date.now();
    if (now <= entry.expiresAt) {
      return { state: 'fresh', value: entry.value };
    }
    if (now <= entry.staleUntil) {
      return { state: 'stale', value: entry.value };
    }
    this.lru.delete(key);
    return { state: 'miss' };
  }

  async set<T>(key: string, value: T, ttlMs: number, maxStaleMs: number): Promise<void> {
    const now = Date.now();
    const expiresAt = now + Math.max(0, ttlMs);
    const staleUntil = expiresAt + Math.max(0, maxStaleMs);
    this.lru.set(key, { value, expiresAt, staleUntil });
  }

  async delete(key: string): Promise<void> {
    this.lru.delete(key);
  }

  async clearByPrefix(prefix: string): Promise<void> {
    for (const key of this.lru.keys()) {
      if (String(key).startsWith(prefix)) {
        this.lru.delete(key);
      }
    }
  }
}

class RedisCache implements CacheStore {
  private readonly client;
  private readonly prefix: string;

  constructor(client: { get: (key: string) => Promise<string | null>; set: (key: string, value: string, opts?: { EX: number }) => Promise<unknown>; del: (key: string) => Promise<unknown>; scan: (cursor: string, ...args: string[]) => Promise<[string, string[]]>; }, prefix: string) {
    this.client = client;
    this.prefix = prefix;
  }

  private key(key: string) {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<CacheGetResult<T>> {
    const raw = await this.client.get(this.key(key));
    if (!raw) return { state: 'miss' };
    try {
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      const now = Date.now();
      if (now <= parsed.expiresAt) {
        return { state: 'fresh', value: parsed.value };
      }
      if (now <= parsed.staleUntil) {
        return { state: 'stale', value: parsed.value };
      }
      await this.delete(key);
      return { state: 'miss' };
    } catch {
      await this.delete(key);
      return { state: 'miss' };
    }
  }

  async set<T>(key: string, value: T, ttlMs: number, maxStaleMs: number): Promise<void> {
    const now = Date.now();
    const expiresAt = now + Math.max(0, ttlMs);
    const staleUntil = expiresAt + Math.max(0, maxStaleMs);
    const payload: CacheEntry<T> = { value, expiresAt, staleUntil };
    const ttlSeconds = Math.max(1, Math.ceil((staleUntil - now) / 1000));
    await this.client.set(this.key(key), JSON.stringify(payload), { EX: ttlSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.key(key));
  }

  async clearByPrefix(prefix: string): Promise<void> {
    const match = `${this.prefix}${prefix}*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', match, 'COUNT', '100');
      cursor = nextCursor;
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.client.del(key)));
      }
    } while (cursor !== '0');
  }
}

let cacheStorePromise: Promise<CacheStore> | null = null;

export const getCacheStore = async (): Promise<CacheStore> => {
  if (cacheStorePromise) return cacheStorePromise;
  cacheStorePromise = (async () => {
    if (config.cache.backend === 'redis' && config.cache.redis.url) {
      const { createClient } = await import('redis');
      const client = createClient({ url: config.cache.redis.url });
      client.on('error', () => {});
      if (!client.isOpen) {
        await client.connect();
      }
      return new RedisCache(client, config.cache.redis.keyPrefix);
    }
    return new InMemoryCache(config.cache.memory.maxEntries);
  })();
  return cacheStorePromise;
};

const inFlight = new Map<string, Promise<unknown>>();

const stableStringify = (value: Record<string, string | number | boolean | undefined>) => {
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
};

export const buildCacheKey = (options: {
  userKey: string;
  method: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
}) => {
  const query = options.query ? stableStringify(options.query) : '';
  const normalizedPath = options.path.startsWith('/') ? options.path : `/${options.path}`;
  return `spotify:${options.userKey}:${options.method.toUpperCase()}:${normalizedPath}?${query}`;
};

export const withCache = async <T>(options: {
  key: string;
  ttlMs: number;
  maxStaleMs: number;
  fetcher: () => Promise<T>;
  logger?: Logger;
  metrics?: Metrics;
}): Promise<T> => {
  const logger = options.logger ?? createDefaultLogger('info');
  const metrics = options.metrics ?? createNoopMetrics();
  const store = await getCacheStore();
  const cached = await store.get<T>(options.key);

  if (cached.state === 'fresh' && cached.value !== undefined) {
    metrics.cacheHit(options.key, false);
    return cached.value;
  }

  if (cached.state === 'stale' && cached.value !== undefined) {
    metrics.cacheHit(options.key, true);
    if (!inFlight.has(options.key)) {
      const refreshPromise = (async () => {
        try {
          const freshValue = await options.fetcher();
          await store.set(options.key, freshValue, options.ttlMs, options.maxStaleMs);
        } catch (error) {
          logger.warn('Cache refresh mislukt', { key: options.key, error: String(error) });
        } finally {
          inFlight.delete(options.key);
        }
      })();
      inFlight.set(options.key, refreshPromise);
    }
    return cached.value;
  }

  metrics.cacheMiss(options.key);
  if (inFlight.has(options.key)) {
    return inFlight.get(options.key) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const value = await options.fetcher();
      await store.set(options.key, value, options.ttlMs, options.maxStaleMs);
      return value;
    } finally {
      inFlight.delete(options.key);
    }
  })();

  inFlight.set(options.key, promise);
  return promise;
};

export const bustCachePrefix = async (prefix: string) => {
  const store = await getCacheStore();
  await store.clearByPrefix(prefix);
};
