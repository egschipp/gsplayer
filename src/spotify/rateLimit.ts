export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const parseRetryAfterMs = (value: string | null): number | null => {
  if (!value) return null;
  const seconds = Number.parseInt(value, 10);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return seconds * 1000;
};

export const computeBackoffMs = (attempt: number, baseDelayMs: number, maxDelayMs: number, jitterRatio: number) => {
  const expDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = expDelay * jitterRatio * Math.random();
  return Math.round(expDelay + jitter);
};
