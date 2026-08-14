import { NextRequest, NextResponse } from 'next/server';
import {
  applyRefreshedCookies,
  callAuthenticated,
} from '../../_lib/authenticated';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const result = await callAuthenticated(request, '/moi/export');
  if (!result) {
    return NextResponse.json({ message: 'Non authentifié.' }, { status: 401 });
  }
  const response = NextResponse.json(result.body, {
    status: result.status,
    headers:
      result.status < 300
        ? {
            'Content-Disposition':
              'attachment; filename="urbanflow-donnees.json"',
          }
        : undefined,
  });
  applyRefreshedCookies(response, result);
  return response;
}
