import { NextRequest, NextResponse } from 'next/server';
import { fetchFromService, ApiError } from '@/lib/api-client';

interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    // Validate input
    if (!body.email || !body.password || !body.first_name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email, password, and first name are required' } },
        { status: 400 }
      );
    }

    // Call auth service
    const response = await fetchFromService<{ success: boolean; data: unknown }>(
      'auth',
      '/api/v1/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    return NextResponse.json(response, { status: 201 });
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
