import { config } from '../config';
import type { Logger, Metrics } from '../logger';
import { buildCacheKey, withCache } from './cache';
import { spotifyRequest, type RequestContext } from './spotifyClient';
import type {
  Paging,
  NowPlayingResponse,
  SearchResponse,
  SearchType,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUser,
} from './types';

export interface ApiContext extends RequestContext {
  logger?: Logger;
  metrics?: Metrics;
}

export const getMe = async (accessToken: string, ctx: ApiContext): Promise<SpotifyUser> => {
  const key = buildCacheKey({
    userKey: ctx.userKey,
    method: 'GET',
    path: '/me',
  });

  return withCache({
    key,
    ttlMs: config.cache.ttlMs.me,
    maxStaleMs: config.cache.maxStaleMs.me,
    logger: ctx.logger,
    metrics: ctx.metrics,
    fetcher: () =>
      spotifyRequest<SpotifyUser>({
        accessToken,
        method: 'GET',
        path: '/me',
        ctx,
        logger: ctx.logger,
        metrics: ctx.metrics,
      }),
  });
};

export const getMyPlaylists = async (
  accessToken: string,
  limit: number,
  offset: number,
  ctx: ApiContext,
): Promise<Paging<SpotifyPlaylist>> => {
  const key = buildCacheKey({
    userKey: ctx.userKey,
    method: 'GET',
    path: '/me/playlists',
    query: { limit, offset },
  });

  return withCache({
    key,
    ttlMs: config.cache.ttlMs.playlists,
    maxStaleMs: config.cache.maxStaleMs.playlists,
    logger: ctx.logger,
    metrics: ctx.metrics,
    fetcher: () =>
      spotifyRequest<Paging<SpotifyPlaylist>>({
        accessToken,
        method: 'GET',
        path: '/me/playlists',
        query: { limit, offset },
        ctx,
        logger: ctx.logger,
        metrics: ctx.metrics,
      }),
  });
};

export const getTrack = async (accessToken: string, trackId: string, ctx: ApiContext): Promise<SpotifyTrack> => {
  const key = buildCacheKey({
    userKey: ctx.userKey,
    method: 'GET',
    path: `/tracks/${trackId}`,
  });

  return withCache({
    key,
    ttlMs: config.cache.ttlMs.track,
    maxStaleMs: config.cache.maxStaleMs.track,
    logger: ctx.logger,
    metrics: ctx.metrics,
    fetcher: () =>
      spotifyRequest<SpotifyTrack>({
        accessToken,
        method: 'GET',
        path: `/tracks/${trackId}`,
        ctx,
        logger: ctx.logger,
        metrics: ctx.metrics,
      }),
  });
};

export const search = async (
  accessToken: string,
  q: string,
  type: SearchType | SearchType[],
  limit: number,
  ctx: ApiContext,
  offset = 0,
): Promise<SearchResponse> => {
  const typeValue = Array.isArray(type) ? type.join(',') : type;
  const key = buildCacheKey({
    userKey: ctx.userKey,
    method: 'GET',
    path: '/search',
    query: { q, type: typeValue, limit, offset },
  });

  return withCache({
    key,
    ttlMs: config.cache.ttlMs.search,
    maxStaleMs: config.cache.maxStaleMs.search,
    logger: ctx.logger,
    metrics: ctx.metrics,
    fetcher: () =>
      spotifyRequest<SearchResponse>({
        accessToken,
        method: 'GET',
        path: '/search',
        query: { q, type: typeValue, limit, offset },
        ctx,
        logger: ctx.logger,
        metrics: ctx.metrics,
      }),
  });
};

export const iterateMyPlaylists = async function* (
  accessToken: string,
  ctx: ApiContext,
  pageSize = 50,
): AsyncGenerator<SpotifyPlaylist[], void, void> {
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await getMyPlaylists(accessToken, pageSize, offset, ctx);
    total = page.total ?? 0;
    offset += page.items.length;
    yield page.items;
    if (page.items.length === 0) break;
  }
};

export const searchPaginated = async function* (
  accessToken: string,
  q: string,
  type: SearchType | SearchType[],
  ctx: ApiContext,
  pageSize = 20,
): AsyncGenerator<SearchResponse, void, void> {
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await search(accessToken, q, type, pageSize, ctx, offset);
    const totalFromPage =
      page.tracks?.total ?? page.artists?.total ?? page.albums?.total ?? page.playlists?.total ?? 0;
    total = totalFromPage;
    offset += pageSize;
    yield page;
    if (totalFromPage === 0) break;
  }
};

export const getNowPlaying = async (accessToken: string, ctx: ApiContext): Promise<NowPlayingResponse | null> => {
  return spotifyRequest<NowPlayingResponse | null>({
    accessToken,
    method: 'GET',
    path: '/me/player/currently-playing',
    ctx,
    logger: ctx.logger,
    metrics: ctx.metrics,
  });
};
