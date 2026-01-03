import { NextRequest, NextResponse } from 'next/server';
import { fetchFromService, ApiError } from '@/lib/api-client';

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    roles: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    // Validate input
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    // Call auth service
    const response = await fetchFromService<{ success: boolean; data: AuthResponse }>(
      'auth',
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    // Set refresh token as HTTP-only cookie
    const res = NextResponse.json({
      success: true,
      data: {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
        user: response.data.user,
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
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
