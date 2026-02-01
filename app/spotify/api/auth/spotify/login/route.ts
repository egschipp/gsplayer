import { NextResponse } from 'next/server';

import { buildAuthorizeUrl } from '../../../../../../src/spotify/auth';
import { getStateCookieName } from '../../../../../../src/spotify/tokenStore';

const scopes = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-playback-state',
  'user-read-currently-playing',
];

export async function GET() {
  const state = crypto.randomUUID();
  const url = buildAuthorizeUrl(state, scopes);

  const response = NextResponse.redirect(url);
  response.cookies.set(getStateCookieName(), state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 5,
  });

  return response;
}
