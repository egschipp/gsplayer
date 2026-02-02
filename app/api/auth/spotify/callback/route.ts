import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { config } from '../../../../../src/config';
import { exchangeCodeForToken } from '../../../../../src/spotify/auth';
import { encryptToken, getSessionCookieName, getStateCookieName } from '../../../../../src/spotify/tokenStore';

const getBaseUrl = (request: Request) => {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host') ?? 'localhost:3000';
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const basePath = config.appBasePath || '';
  return `${forwardedProto}://${host}${basePath}`;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const baseUrl = getBaseUrl(request);

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', baseUrl));
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(getStateCookieName())?.value ?? null;

  if (!stateCookie || !state || stateCookie !== state) {
    return NextResponse.redirect(new URL('/?error=state_mismatch', baseUrl));
  }

  const token = await exchangeCodeForToken(code);
  const expiresAt = Date.now() + token.expires_in * 1000;

  const payload = encryptToken({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
  });

  const response = NextResponse.redirect(new URL('/', baseUrl));
  response.cookies.set(getSessionCookieName(), payload, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.set(getStateCookieName(), '', { path: '/', maxAge: 0 });

  return response;
}
