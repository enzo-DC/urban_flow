import { NextResponse } from 'next/server';
import { callBackend } from '../../auth/_lib/proxy';

export async function GET(): Promise<NextResponse> {
  const { status, body } = await callBackend('/push/cle-publique', {
    method: 'GET',
  });
  return NextResponse.json(body, { status });
}
