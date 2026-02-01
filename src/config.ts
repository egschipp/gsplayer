import { createDefaultLogger, createNoopMetrics, type Logger, type Metrics, type LogLevel } from './logger';

const env = process.env;

const parseIntEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolEnv = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
};

export type CacheBackend = 'memory' | 'redis';

export const config = {
  spotifyBaseUrl: 'https://api.spotify.com/v1',
  spotifyAuth: {
    clientId: env.SPOTIFY_CLIENT_ID || '',
    clientSecret: env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: env.SPOTIFY_REDIRECT_URI || '',
  },
  timeouts: {
    requestMs: parseIntEnv(env.SPOTIFY_REQUEST_TIMEOUT_MS, 8000),
  },
  retries: {
    maxAttempts: parseIntEnv(env.SPOTIFY_MAX_RETRIES, 4),
    baseDelayMs: parseIntEnv(env.SPOTIFY_RETRY_BASE_DELAY_MS, 250),
    maxDelayMs: parseIntEnv(env.SPOTIFY_RETRY_MAX_DELAY_MS, 4000),
    jitterRatio: parseIntEnv(env.SPOTIFY_RETRY_JITTER_RATIO, 30) / 100,
  },
  cache: {
    backend: (env.CACHE_BACKEND as CacheBackend) || 'memory',
    memory: {
      maxEntries: parseIntEnv(env.CACHE_LRU_MAX_ENTRIES, 2000),
    },
    redis: {
      url: env.CACHE_REDIS_URL || '',
      keyPrefix: env.CACHE_REDIS_PREFIX || 'gsplayer:spotify:',
    },
    ttlMs: {
      me: parseIntEnv(env.CACHE_TTL_ME_MS, 60_000),
      playlists: parseIntEnv(env.CACHE_TTL_PLAYLISTS_MS, 120_000),
      track: parseIntEnv(env.CACHE_TTL_TRACK_MS, 12 * 60 * 60 * 1000),
      artist: parseIntEnv(env.CACHE_TTL_ARTIST_MS, 12 * 60 * 60 * 1000),
      search: parseIntEnv(env.CACHE_TTL_SEARCH_MS, 60_000),
    },
    maxStaleMs: {
      me: parseIntEnv(env.CACHE_MAX_STALE_ME_MS, 30_000),
      playlists: parseIntEnv(env.CACHE_MAX_STALE_PLAYLISTS_MS, 60_000),
      track: parseIntEnv(env.CACHE_MAX_STALE_TRACK_MS, 6 * 60 * 60 * 1000),
      artist: parseIntEnv(env.CACHE_MAX_STALE_ARTIST_MS, 6 * 60 * 60 * 1000),
      search: parseIntEnv(env.CACHE_MAX_STALE_SEARCH_MS, 30_000),
    },
  },
  logging: {
    level: (['debug', 'info', 'warn', 'error'] as const).includes(
      (env.LOG_LEVEL as LogLevel) ?? 'info',
    )
      ? (env.LOG_LEVEL as LogLevel)
      : 'info',
  },
  metrics: {
    enabled: parseBoolEnv(env.METRICS_ENABLED, true),
  },
  security: {
    encryptionKey: env.APP_ENCRYPTION_KEY || '',
  },
};

export const getLogger = (logger?: Logger): Logger => logger ?? createDefaultLogger(config.logging.level);

export const getMetrics = (metrics?: Metrics): Metrics => {
  if (metrics) return metrics;
  if (!config.metrics.enabled) return createNoopMetrics();
  return createNoopMetrics();
};
