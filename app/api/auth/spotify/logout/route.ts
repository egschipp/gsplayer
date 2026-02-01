import { NextResponse } from 'next/server';

import { getSessionCookieName } from '../../../../../src/spotify/tokenStore';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL('/', url));
  response.cookies.delete(getSessionCookieName());
  return response;
}
