import { NextResponse } from 'next/server';

import { config } from '../../../../../src/config';
import { getSessionCookieName } from '../../../../../src/spotify/tokenStore';

export async function GET(request: Request) {
  let baseUrl = '';
  if (config.spotifyAuth.redirectUri) {
    const redirect = new URL(config.spotifyAuth.redirectUri);
    const basePath = redirect.pathname.replace(/\/api\/auth\/spotify\/callback\/?$/, '');
    baseUrl = `${redirect.origin}${basePath}`;
  } else {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = forwardedHost ?? request.headers.get('host') ?? 'localhost:3000';
    const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
    baseUrl = `${forwardedProto}://${host}${config.appBasePath || ''}`;
  }
  const response = NextResponse.redirect(new URL('/', baseUrl));
  response.cookies.set(getSessionCookieName(), '', { path: '/', maxAge: 0 });
  return response;
}
