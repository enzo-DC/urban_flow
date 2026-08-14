import { NextRequest, NextResponse } from 'next/server';
import { callBackend } from '../auth/_lib/proxy';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  const { status, body } = await callBackend(
    `/lieux/recherche?q=${encodeURIComponent(q)}`,
    { method: 'GET' },
  );
  return NextResponse.json(body, { status });
}
