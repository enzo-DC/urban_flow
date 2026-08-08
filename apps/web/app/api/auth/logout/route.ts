import { NextRequest, NextResponse } from 'next/server';
import { callBackend, clearAuthCookies, REFRESH_COOKIE } from '../_lib/proxy';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const incomingRefresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (incomingRefresh) {
    await callBackend('/auth/logout', {
      method: 'POST',
      headers: { Cookie: `${REFRESH_COOKIE}=${incomingRefresh}` },
    });
  }
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
