import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchFromService, ApiError } from '@/lib/api-client';

// Get GSTR filings
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const tenantId = request.headers.get('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000';

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const returnType = searchParams.get('type') || '';
    const period = searchParams.get('period') || '';
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '20';

    const queryParams = new URLSearchParams({ page, per_page: perPage });
    if (returnType) queryParams.set('type', returnType);
    if (period) queryParams.set('period', period);

    const response = await fetchFromService(
      'tax',
      `/api/v1/gstr/filings?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Tenant-ID': tenantId,
        },
      }
    );

    return NextResponse.json(response);
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
