import { config } from '../config';
import { createHttpError } from './errors';

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com';

export const buildAuthorizeUrl = (state: string, scopes: string[]) => {
  if (!config.spotifyAuth.clientId || !config.spotifyAuth.redirectUri) {
    throw new Error('Spotify clientId of redirectUri ontbreekt');
  }

  const url = new URL(`${SPOTIFY_ACCOUNTS_BASE}/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.spotifyAuth.clientId);
  url.searchParams.set('redirect_uri', config.spotifyAuth.redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', scopes.join(' '));
  return url.toString();
};

const buildBasicAuth = () => {
  if (!config.spotifyAuth.clientId || !config.spotifyAuth.clientSecret) {
    throw new Error('Spotify clientId of clientSecret ontbreekt');
  }
  const credentials = Buffer.from(
    `${config.spotifyAuth.clientId}:${config.spotifyAuth.clientSecret}`,
  ).toString('base64');
  return `Basic ${credentials}`;
};

export const exchangeCodeForToken = async (code: string): Promise<TokenResponse> => {
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', config.spotifyAuth.redirectUri);

  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: buildBasicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw createHttpError(response.status, `Token exchange mislukt: ${text}`);
  }

  return (await response.json()) as TokenResponse;
};

export const refreshAccessToken = async (refreshToken: string): Promise<TokenResponse> => {
  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refreshToken);

  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: buildBasicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw createHttpError(response.status, `Token refresh mislukt: ${text}`);
  }

  return (await response.json()) as TokenResponse;
};
