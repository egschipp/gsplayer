import { NextResponse } from 'next/server';

import { exchangeCodeForToken } from '../../../../../../src/spotify/auth';
import { encryptToken, getSessionCookieName, getStateCookieName } from '../../../../../../src/spotify/tokenStore';

const getCookieValue = (cookieHeader: string, name: string) => {
  const entry = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return entry ? entry.split('=')[1] : null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', url));
  }

  const cookies = request.headers.get('cookie') ?? '';
  const stateCookie = getCookieValue(cookies, getStateCookieName());

  if (!stateCookie || !state || stateCookie !== state) {
    return NextResponse.redirect(new URL('/?error=state_mismatch', url));
  }

  const token = await exchangeCodeForToken(code);
  const expiresAt = Date.now() + token.expires_in * 1000;

  const payload = encryptToken({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
  });

  const response = NextResponse.redirect(new URL('/', url));
  response.cookies.set(getSessionCookieName(), payload, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.delete(getStateCookieName());

  return response;
}
