import { NextRequest, NextResponse } from 'next/server';
import { fetchFromService, ApiError } from '@/lib/api-client';

interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Call auth service to get user info
    const response = await fetchFromService<{ success: boolean; data: { user: UserResponse } }>(
      'auth',
      '/api/v1/auth/me',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        user: response.data.user,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    );
  }
}
