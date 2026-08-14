import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '../auth/_lib/proxy';
import {
  applyRefreshedCookies,
  callAuthenticated,
} from '../_lib/authenticated';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await callAuthenticated(request, '/moi');
  if (!result) {
    return NextResponse.json({ message: 'Non authentifié.' }, { status: 401 });
  }
  const response = NextResponse.json(result.body, { status: result.status });
  applyRefreshedCookies(response, result);
  return response;
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const payload: unknown = await request.json().catch(() => null);
  const result = await callAuthenticated(request, '/moi/profil', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!result) {
    return NextResponse.json({ message: 'Non authentifié.' }, { status: 401 });
  }
  const response = NextResponse.json(result.body, { status: result.status });
  applyRefreshedCookies(response, result);
  return response;
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const result = await callAuthenticated(request, '/moi', {
    method: 'DELETE',
  });
  if (!result) {
    return NextResponse.json({ message: 'Non authentifié.' }, { status: 401 });
  }
  const response = new NextResponse(null, { status: result.status });
  if (result.status < 300) {
    clearAuthCookies(response);
  } else {
    applyRefreshedCookies(response, result);
  }
  return response;
}
