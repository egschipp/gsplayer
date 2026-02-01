import crypto from 'crypto';
import { config } from '../config';

export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

const COOKIE_NAME = 'sp_session';
const STATE_COOKIE = 'sp_oauth_state';

const getKey = () => {
  if (!config.security.encryptionKey) {
    throw new Error('APP_ENCRYPTION_KEY ontbreekt');
  }
  const key = Buffer.from(config.security.encryptionKey, 'base64');
  if (key.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY moet 32 bytes base64 zijn');
  }
  return key;
};

export const encryptToken = (payload: StoredToken) => {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
};

export const decryptToken = (value: string): StoredToken | null => {
  try {
    const key = getKey();
    const data = Buffer.from(value, 'base64url');
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted) as StoredToken;
  } catch {
    return null;
  }
};

export const getSessionCookieName = () => COOKIE_NAME;
export const getStateCookieName = () => STATE_COOKIE;
