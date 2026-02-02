import { NextResponse } from 'next/server';

import { config } from '../../../../../src/config';
import { getSessionCookieName } from '../../../../../src/spotify/tokenStore';

export async function GET(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host') ?? 'localhost:3000';
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const baseUrl = `${forwardedProto}://${host}${config.appBasePath || ''}`;
  const response = NextResponse.redirect(new URL('/', baseUrl));
  response.cookies.delete(getSessionCookieName());
  return response;
}
