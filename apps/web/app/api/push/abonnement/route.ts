import { NextRequest, NextResponse } from 'next/server';
import {
  applyRefreshedCookies,
  callAuthenticated,
} from '../../_lib/authenticated';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload: unknown = await request.json().catch(() => null);
  const result = await callAuthenticated(request, '/push/abonnement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!result) {
    return NextResponse.json({ message: 'Non authentifié.' }, { status: 401 });
  }
  const response = new NextResponse(null, { status: result.status });
  applyRefreshedCookies(response, result);
  return response;
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const endpoint = request.nextUrl.searchParams.get('endpoint') ?? '';
  const result = await callAuthenticated(
    request,
    `/push/abonnement?endpoint=${encodeURIComponent(endpoint)}`,
    { method: 'DELETE' },
  );
  if (!result) {
    return NextResponse.json({ message: 'Non authentifié.' }, { status: 401 });
  }
  const response = new NextResponse(null, { status: result.status });
  applyRefreshedCookies(response, result);
  return response;
}
