import { NextRequest, NextResponse } from 'next/server';

// L'URL interne de l'API n'est jamais exposée au client : tout passe par ces
// Route Handlers (rôle BFF), voir markdown/claude-rule-frontend.md.
const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1';

// Doivent rester alignés avec JWT_ACCESS_TTL / JWT_REFRESH_TTL côté NestJS
// (apps/api/.env.example) — la durée de vie du cookie ne doit jamais dépasser
// celle du token qu'il contient.
export const ACCESS_TOKEN_MAX_AGE = 60 * 15;
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

// refresh_token vivait auparavant sous path=/api/auth (minimisation
// deliberee de son exposition). Vrai bug trouve en conditions reelles : un
// cookie scope a un chemin n'est envoye par le navigateur que pour les
// requetes SOUS ce chemin — request.cookies()/cookies() sur /api/profil,
// /profil, /mon-impact etc. ne le voyaient donc jamais, rendant tout
// rafraichissement silencieux impossible en dehors d'un appel explicite a
// /api/auth/refresh lui-meme. refresh_token reste httpOnly + Secure +
// SameSite=strict (illisible en JS, jamais envoye cross-site) : l'elargir a
// path=/ ne change pas sa surface d'attaque reelle, seulement sa visibilite
// pour nos propres Route Handlers et Server Components.

interface BackendResult {
  status: number;
  body: unknown;
  refreshToken?: string;
}

export async function callBackend(
  path: string,
  init: RequestInit,
): Promise<BackendResult> {
  const res = await fetch(`${API_INTERNAL_URL}${path}`, init);
  const body: unknown = await res.json().catch(() => null);
  const refreshToken = extractCookieValue(
    res.headers.getSetCookie(),
    REFRESH_COOKIE,
  );
  return { status: res.status, body, refreshToken };
}

function extractCookieValue(
  setCookieHeaders: string[],
  name: string,
): string | undefined {
  for (const header of setCookieHeaders) {
    const [pair] = header.split(';');
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) continue;
    if (pair.slice(0, separatorIndex).trim() === name) {
      return pair.slice(separatorIndex + 1);
    }
  }
  return undefined;
}

export function cookieOptions(maxAge: number, path = '/') {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path,
    maxAge,
  };
}

/**
 * Inscription et connexion suivent exactement le meme relais : appeler
 * NestJS, ne jamais renvoyer le JWT au client (il reste dans des cookies
 * httpOnly poses par ce handler), relayer uniquement les erreurs telles quelles.
 */
export async function handleCredentialsAuth(
  backendPath: '/auth/register' | '/auth/login',
  request: NextRequest,
): Promise<NextResponse> {
  const payload: unknown = await request.json().catch(() => null);
  const { status, body, refreshToken } = await callBackend(backendPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (status >= 400) {
    return NextResponse.json(body, { status });
  }

  const response = NextResponse.json({ success: true }, { status });
  const accessToken = (body as { accessToken?: string }).accessToken;
  if (accessToken) {
    response.cookies.set(
      ACCESS_COOKIE,
      accessToken,
      cookieOptions(ACCESS_TOKEN_MAX_AGE),
    );
  }
  if (refreshToken) {
    response.cookies.set(
      REFRESH_COOKIE,
      refreshToken,
      cookieOptions(REFRESH_TOKEN_MAX_AGE),
    );
  }
  return response;
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete({ name: ACCESS_COOKIE, path: '/' });
  response.cookies.delete({ name: REFRESH_COOKIE, path: '/' });
}
