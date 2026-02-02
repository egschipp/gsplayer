import { NextResponse } from 'next/server';

import { config } from '../../../../../src/config';
import { decryptToken, getSessionCookieName } from '../../../../../src/spotify/tokenStore';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${getSessionCookieName()}=`));

  const sessionValue = sessionCookie ? sessionCookie.split('=')[1] : null;
  const session = sessionValue ? decryptToken(sessionValue) : null;
  const now = Date.now();

  return NextResponse.json({
    app: {
      clientIdConfigured: Boolean(config.spotifyAuth.clientId),
      clientSecretConfigured: Boolean(config.spotifyAuth.clientSecret),
      redirectUriConfigured: Boolean(config.spotifyAuth.redirectUri),
    },
    user: {
      loggedIn: Boolean(session && session.accessToken),
      expiresAt: session?.expiresAt ?? null,
      expired: session ? session.expiresAt <= now : null,
    },
  });
}
