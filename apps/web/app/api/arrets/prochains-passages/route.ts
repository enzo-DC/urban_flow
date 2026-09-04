import { NextRequest, NextResponse } from 'next/server';
import { callBackend } from '../../auth/_lib/proxy';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const id = request.nextUrl.searchParams.get('id') ?? '';
  const { status, body } = await callBackend(
    `/arrets/prochains-passages?id=${encodeURIComponent(id)}`,
    { method: 'GET' },
  );
  return NextResponse.json(body, { status });
}
