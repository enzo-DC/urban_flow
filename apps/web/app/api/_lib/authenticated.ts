import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  callBackend,
  cookieOptions,
  REFRESH_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
} from '../auth/_lib/proxy';

interface AuthedResult {
  status: number;
  body: unknown;
  refreshedAccessToken?: string;
  refreshedRefreshToken?: string;
}

/**
 * Appelle NestJS avec l'access token du cookie. S'il est expire (401), tente
 * un refresh une seule fois puis rejoue l'appel — l'appelant recupere alors
 * les nouveaux tokens a poser via applyRefreshedCookies. Retourne null si
 * aucune session valide n'a pu etre etablie (l'appelant redirige vers
 * /connexion).
 */
export async function callAuthenticated(
  request: NextRequest,
  path: string,
  init: RequestInit = {},
): Promise<AuthedResult | null> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  const first = await callBackend(path, withAuth(init, accessToken));
  if (first.status !== 401) {
    return { status: first.status, body: first.body };
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const refreshed = await callBackend('/auth/refresh', {
    method: 'POST',
    headers: { Cookie: `${REFRESH_COOKIE}=${refreshToken}` },
  });
  const newAccessToken = (refreshed.body as { accessToken?: string } | null)
    ?.accessToken;
  if (refreshed.status >= 400 || !newAccessToken) return null;

  const retry = await callBackend(path, withAuth(init, newAccessToken));
  return {
    status: retry.status,
    body: retry.body,
    refreshedAccessToken: newAccessToken,
    refreshedRefreshToken: refreshed.refreshToken,
  };
}

export function applyRefreshedCookies(
  response: NextResponse,
  result: AuthedResult,
): void {
  if (result.refreshedAccessToken) {
    response.cookies.set(
      ACCESS_COOKIE,
      result.refreshedAccessToken,
      cookieOptions(ACCESS_TOKEN_MAX_AGE),
    );
  }
  if (result.refreshedRefreshToken) {
    response.cookies.set(
      REFRESH_COOKIE,
      result.refreshedRefreshToken,
      cookieOptions(REFRESH_TOKEN_MAX_AGE, '/api/auth'),
    );
  }
}

function withAuth(init: RequestInit, token: string): RequestInit {
  return {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  };
}
