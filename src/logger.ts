export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface Metrics {
  cacheHit(key: string, isStale: boolean): void;
  cacheMiss(key: string): void;
  requestDuration(endpoint: string, ms: number, status?: number): void;
  retryCount(endpoint: string, attempt: number, reason: string): void;
  rateLimitHit(endpoint: string, retryAfterMs: number): void;
  upstreamStatus(endpoint: string, status: number): void;
}

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const redactTokens = (value: string): string => {
  return value
    .replace(/Bearer\s+[A-Za-z0-9\-_.~+/]+=*/g, 'Bearer ***')
    .replace(/"authorization"\s*:\s*"[^"]+"/gi, '"authorization":"***"');
};

const sanitizeMeta = (meta?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!meta) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (typeof value === 'string') {
      safe[key] = redactTokens(value);
    } else {
      safe[key] = value;
    }
  }
  return safe;
};

export const createDefaultLogger = (level: LogLevel): Logger => {
  const threshold = levelWeight[level] ?? levelWeight.info;

  const shouldLog = (candidate: LogLevel) => levelWeight[candidate] >= threshold;

  const log = (candidate: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (!shouldLog(candidate)) return;
    const safeMessage = redactTokens(message);
    const safeMeta = sanitizeMeta(meta);
    const line = safeMeta ? `${safeMessage} ${JSON.stringify(safeMeta)}` : safeMessage;
    // eslint-disable-next-line no-console
    console[candidate === 'debug' ? 'log' : candidate](line);
  };

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  };
};

export const createNoopMetrics = (): Metrics => ({
  cacheHit: () => {},
  cacheMiss: () => {},
  requestDuration: () => {},
  retryCount: () => {},
  rateLimitHit: () => {},
  upstreamStatus: () => {},
});
