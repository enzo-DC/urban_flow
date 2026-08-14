import { NextRequest, NextResponse } from 'next/server';
import { callBackend } from '../auth/_lib/proxy';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload: unknown = await request.json().catch(() => null);
  const { status, body } = await callBackend('/itineraires', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return NextResponse.json(body, { status });
}
