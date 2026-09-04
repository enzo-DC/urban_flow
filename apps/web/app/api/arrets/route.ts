import { NextRequest, NextResponse } from 'next/server';
import { callBackend } from '../auth/_lib/proxy';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const query = new URLSearchParams({
    minLat: params.get('minLat') ?? '',
    minLon: params.get('minLon') ?? '',
    maxLat: params.get('maxLat') ?? '',
    maxLon: params.get('maxLon') ?? '',
  });
  const { status, body } = await callBackend(`/arrets?${query.toString()}`, {
    method: 'GET',
  });
  return NextResponse.json(body, { status });
}
