import { NextRequest, NextResponse } from 'next/server';
import { fetchFromService, ApiError } from '@/lib/api-client';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'No refresh token' } },
        { status: 401 }
      );
    }

    // Call auth service
    const response = await fetchFromService<{ success: boolean; data: { access_token: string; refresh_token: string; expires_in: number } }>(
      'auth',
      '/api/v1/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    // Set new refresh token
    const res = NextResponse.json({
      success: true,
      data: {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
      },
    });

    res.cookies.set('refresh_token', response.data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return res;
  } catch (error) {
    if (error instanceof ApiError) {
      // Clear refresh token on auth errors
      const res = NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
      res.cookies.delete('refresh_token');
      return res;
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
