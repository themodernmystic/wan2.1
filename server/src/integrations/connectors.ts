import { env } from '../lib/env.js';

/**
 * Replaces base44.asServiceRole.connectors — Base44's app-level OAuth
 * connector store. Base44 hosted the OAuth dance and token refresh for you;
 * here each connector is configured via a long-lived refresh token in env
 * vars, and we mint a fresh access token on demand.
 */

type Connection = { accessToken: string | null };

async function getGoogleDriveConnection(): Promise<Connection> {
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!refreshToken || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return { accessToken: null };
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return { accessToken: null };
  const data = (await res.json()) as { access_token?: string };
  return { accessToken: data.access_token || null };
}

export async function getConnection(type: string): Promise<Connection> {
  if (type === 'googledrive') return getGoogleDriveConnection();
  throw new Error(`Connector "${type}" is not implemented`);
}
