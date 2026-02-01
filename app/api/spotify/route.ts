import { NextResponse } from 'next/server';

import { getMyPlaylists, getNowPlaying, search } from '../../../src/spotify/spotifyApi';
import { decryptToken, getSessionCookieName } from '../../../src/spotify/tokenStore';
import { refreshAccessToken } from '../../../src/spotify/auth';
import type { SearchType } from '../../../src/spotify/types';

export const runtime = 'nodejs';

const badRequest = (message: string) => NextResponse.json({ message }, { status: 400 });

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userKey?: string;
      action?: 'playlists' | 'search' | 'now-playing';
      q?: string;
      type?: SearchType;
      limit?: number;
      offset?: number;
    };

    const cookieHeader = request.headers.get('cookie') ?? '';
    const sessionCookie = cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${getSessionCookieName()}=`));

    if (!sessionCookie) {
      return badRequest('Niet ingelogd');
    }

    const encoded = sessionCookie.split('=')[1];
    const session = decryptToken(encoded);
    if (!session) {
      return badRequest('Ongeldige sessie');
    }

    let accessToken = session.accessToken;
    if (Date.now() >= session.expiresAt && session.refreshToken) {
      const refreshed = await refreshAccessToken(session.refreshToken);
      accessToken = refreshed.access_token;
    }

    const ctx = {
      userKey: body.userKey ?? 'anonymous',
      requestId: request.headers.get('x-request-id') ?? undefined,
    };

    if (body.action === 'playlists') {
      const playlists = await getMyPlaylists(accessToken, 20, 0, ctx);
      return NextResponse.json({ items: playlists.items ?? [] });
    }

    if (body.action === 'search') {
      if (!body.q || !body.type) {
        return badRequest('Zoekquery of type ontbreekt');
      }
      const limit = body.limit ?? 20;
      const result = await search(accessToken, body.q, body.type, limit, ctx, body.offset ?? 0);
      return NextResponse.json({
        tracks: result.tracks?.items ?? [],
        artists: result.artists?.items ?? [],
        playlists: result.playlists?.items ?? [],
      });
    }

    if (body.action === 'now-playing') {
      const nowPlaying = await getNowPlaying(accessToken, ctx);
      return NextResponse.json({ nowPlaying });
    }

    return badRequest('Onbekende actie');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Serverfout';
    return NextResponse.json({ message }, { status: 500 });
  }
}
