import { config, getLogger, getMetrics } from '../config';
import type { Logger, Metrics } from '../logger';
import {
  createHttpError,
  createNetworkError,
  createParseError,
  createRateLimitError,
  createTimeoutError,
  isRetryableStatus,
} from './errors';
import { computeBackoffMs, parseRetryAfterMs, sleep } from './rateLimit';

export interface RequestContext {
  userKey: string;
  requestId?: string;
}

export interface SpotifyRequestOptions {
  accessToken: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  ctx: RequestContext;
  timeoutMs?: number;
  maxAttempts?: number;
  logger?: Logger;
  metrics?: Metrics;
}

const buildUrl = (path: string, query?: Record<string, string | number | boolean | undefined>) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${config.spotifyBaseUrl}${normalizedPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
};

const safeParseJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw createParseError('Spotify response is geen geldige JSON', response.headers.get('x-request-id') ?? undefined, {
      status: response.status,
      snippet: text.slice(0, 200),
    });
  }
};

export const spotifyRequest = async <T>(options: SpotifyRequestOptions): Promise<T> => {
  const logger = getLogger(options.logger);
  const metrics = getMetrics(options.metrics);
  const maxAttempts = options.maxAttempts ?? config.retries.maxAttempts;
  const timeoutMs = options.timeoutMs ?? config.timeouts.requestMs;
  const url = buildUrl(options.path, options.query);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.ctx.requestId ? { 'X-Request-Id': options.ctx.requestId } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const duration = Date.now() - start;
      metrics.requestDuration(options.path, duration, response.status);
      metrics.upstreamStatus(options.path, response.status);

      if (response.ok) {
        if (response.status === 204) {
          return null as T;
        }
        const json = await safeParseJson(response);
        return json as T;
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
      const errorBodyText = await response.text();
      const snippet = errorBodyText ? errorBodyText.slice(0, 200) : '';

      if (response.status === 429) {
        const delayMs = retryAfterMs ?? computeBackoffMs(attempt, config.retries.baseDelayMs, config.retries.maxDelayMs, config.retries.jitterRatio);
        metrics.rateLimitHit(options.path, delayMs);
        if (attempt < maxAttempts) {
          metrics.retryCount(options.path, attempt, 'rate-limit');
          await sleep(delayMs);
          continue;
        }
        throw createRateLimitError(response.status, delayMs, response.headers.get('x-request-id') ?? undefined);
      }

      if (isRetryableStatus(response.status) && attempt < maxAttempts) {
        const delayMs = computeBackoffMs(attempt, config.retries.baseDelayMs, config.retries.maxDelayMs, config.retries.jitterRatio);
        metrics.retryCount(options.path, attempt, `http-${response.status}`);
        await sleep(delayMs);
        continue;
      }

      const errorMessage = snippet ? `Spotify HTTP ${response.status}: ${snippet}` : `Spotify HTTP ${response.status}`;
      throw createHttpError(response.status, errorMessage, response.headers.get('x-request-id') ?? undefined, {
        statusText: response.statusText,
      });
    } catch (error) {
      const duration = Date.now() - start;
      metrics.requestDuration(options.path, duration, undefined);

      if (error instanceof DOMException && error.name === 'AbortError') {
        if (attempt < maxAttempts) {
          metrics.retryCount(options.path, attempt, 'timeout');
          const delayMs = computeBackoffMs(attempt, config.retries.baseDelayMs, config.retries.maxDelayMs, config.retries.jitterRatio);
          await sleep(delayMs);
          continue;
        }
        throw createTimeoutError(options.ctx.requestId);
      }

      if (error instanceof Error && error.name === 'SpotifyError') {
        throw error;
      }

      if (attempt < maxAttempts) {
        metrics.retryCount(options.path, attempt, 'network');
        const delayMs = computeBackoffMs(attempt, config.retries.baseDelayMs, config.retries.maxDelayMs, config.retries.jitterRatio);
        await sleep(delayMs);
        continue;
      }

      logger.warn('Spotify request netwerkfout', { path: options.path, attempt, error: String(error) });
      throw createNetworkError('Spotify netwerkfout', options.ctx.requestId, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw createNetworkError('Spotify request mislukt na retries', options.ctx.requestId);
};
