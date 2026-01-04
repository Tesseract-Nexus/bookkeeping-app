import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchFromService, ApiError } from '@/lib/api-client';

// Get SSO configuration for current tenant
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const tenantId = request.headers.get('X-Tenant-ID');

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Tenant ID required' } },
        { status: 400 }
      );
    }

    const response = await fetchFromService(
      'core', // Tenant service
      `/api/v1/tenants/${tenantId}/sso`,
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

// Configure SSO
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const tenantId = request.headers.get('X-Tenant-ID');
    const body = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Tenant ID required' } },
        { status: 400 }
      );
    }

    const response = await fetchFromService(
      'core',
      `/api/v1/tenants/${tenantId}/sso`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify(body),
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

// Disable SSO
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const tenantId = request.headers.get('X-Tenant-ID');

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Tenant ID required' } },
        { status: 400 }
      );
    }

    const response = await fetchFromService(
      'core',
      `/api/v1/tenants/${tenantId}/sso`,
      {
        method: 'DELETE',
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
