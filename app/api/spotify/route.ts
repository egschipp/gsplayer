import { NextResponse } from 'next/server';

import { getMyPlaylists, search } from '../../../src/spotify/spotifyApi';
import type { SearchType } from '../../../src/spotify/types';

export const runtime = 'nodejs';

const badRequest = (message: string) => NextResponse.json({ message }, { status: 400 });

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      accessToken?: string;
      userKey?: string;
      action?: 'playlists' | 'search';
      q?: string;
      type?: SearchType;
      limit?: number;
      offset?: number;
    };

    if (!body.accessToken) {
      return badRequest('Access token ontbreekt');
    }

    const ctx = {
      userKey: body.userKey ?? 'anonymous',
      requestId: request.headers.get('x-request-id') ?? undefined,
    };

    if (body.action === 'playlists') {
      const playlists = await getMyPlaylists(body.accessToken, 20, 0, ctx);
      return NextResponse.json({ items: playlists.items ?? [] });
    }

    if (body.action === 'search') {
      if (!body.q || !body.type) {
        return badRequest('Zoekquery of type ontbreekt');
      }
      const limit = body.limit ?? 20;
      const result = await search(body.accessToken, body.q, body.type, limit, ctx, body.offset ?? 0);
      return NextResponse.json({
        tracks: result.tracks?.items ?? [],
        artists: result.artists?.items ?? [],
        playlists: result.playlists?.items ?? [],
      });
    }

    return badRequest('Onbekende actie');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Serverfout';
    return NextResponse.json({ message }, { status: 500 });
  }
}
