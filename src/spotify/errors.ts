export type SpotifyErrorKind =
  | 'HttpError'
  | 'RateLimitError'
  | 'TimeoutError'
  | 'NetworkError'
  | 'ParseError';

export class SpotifyError extends Error {
  readonly kind: SpotifyErrorKind;
  readonly status?: number;
  readonly requestId?: string;
  readonly retriable: boolean;
  readonly details?: unknown;

  constructor(options: {
    kind: SpotifyErrorKind;
    message: string;
    status?: number;
    requestId?: string;
    retriable: boolean;
    details?: unknown;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'SpotifyError';
    this.kind = options.kind;
    this.status = options.status;
    this.requestId = options.requestId;
    this.retriable = options.retriable;
    this.details = options.details;
  }
}

export const isRetryableStatus = (status: number): boolean => {
  return status === 429 || (status >= 500 && status <= 599);
};

export const createRateLimitError = (status: number, retryAfterMs: number, requestId?: string) => {
  return new SpotifyError({
    kind: 'RateLimitError',
    message: `Spotify rate limit: retry after ${retryAfterMs}ms`,
    status,
    requestId,
    retriable: true,
    details: { retryAfterMs },
  });
};

export const createHttpError = (status: number, message: string, requestId?: string, details?: unknown) => {
  return new SpotifyError({
    kind: 'HttpError',
    message,
    status,
    requestId,
    retriable: isRetryableStatus(status),
    details,
  });
};

export const createTimeoutError = (requestId?: string) => {
  return new SpotifyError({
    kind: 'TimeoutError',
    message: 'Spotify request timed out',
    requestId,
    retriable: true,
  });
};

export const createNetworkError = (message: string, requestId?: string, cause?: unknown) => {
  return new SpotifyError({
    kind: 'NetworkError',
    message,
    requestId,
    retriable: true,
    cause,
  });
};

export const createParseError = (message: string, requestId?: string, details?: unknown) => {
  return new SpotifyError({
    kind: 'ParseError',
    message,
    requestId,
    retriable: false,
    details,
  });
};
