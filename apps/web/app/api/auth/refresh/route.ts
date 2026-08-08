import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  callBackend,
  clearAuthCookies,
  cookieOptions,
  REFRESH_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
} from '../_lib/proxy';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const incomingRefresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!incomingRefresh) {
    return NextResponse.json(
      { message: 'Aucune session à rafraîchir.' },
      { status: 401 },
    );
  }

  const { status, body, refreshToken } = await callBackend('/auth/refresh', {
    method: 'POST',
    headers: { Cookie: `${REFRESH_COOKIE}=${incomingRefresh}` },
  });

  if (status >= 400) {
    const response = NextResponse.json(body, { status });
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json({ success: true });
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
      cookieOptions(REFRESH_TOKEN_MAX_AGE, '/api/auth'),
    );
  }
  return response;
}
