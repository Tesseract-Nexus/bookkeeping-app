import { NextRequest, NextResponse } from 'next/server';
import { fetchFromService } from '@/lib/api-client';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (authHeader) {
      // Call auth service to invalidate session
      await fetchFromService(
        'auth',
        '/api/v1/logout',
        {
          method: 'POST',
          headers: { Authorization: authHeader },
        }
      ).catch(() => {
        // Ignore errors - we'll clear cookies anyway
      });
    }

    // Clear cookies
    const res = NextResponse.json({ success: true });
    res.cookies.delete('refresh_token');
    res.cookies.delete('access_token');

    return res;
  } catch {
    // Always return success for logout
    const res = NextResponse.json({ success: true });
    res.cookies.delete('refresh_token');
    res.cookies.delete('access_token');
    return res;
  }
}
