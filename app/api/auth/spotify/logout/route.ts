import { NextResponse } from 'next/server';

import { getSessionCookieName } from '../../../../../src/spotify/tokenStore';

export async function GET(request: Request) {
  const basePath = process.env.APP_BASE_PATH || '/gsplayer';
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host') ?? 'localhost:3000';
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const baseUrl = `${forwardedProto}://${host}${basePath}`;
  const response = NextResponse.redirect(new URL('/', baseUrl));
  response.cookies.set(getSessionCookieName(), '', { path: '/', maxAge: 0 });
  return response;
}
