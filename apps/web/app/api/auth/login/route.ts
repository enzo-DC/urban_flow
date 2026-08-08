import { NextRequest, NextResponse } from 'next/server';
import { handleCredentialsAuth } from '../_lib/proxy';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCredentialsAuth('/auth/login', request);
}
