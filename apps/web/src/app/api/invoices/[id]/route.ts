import { NextRequest, NextResponse } from 'next/server';
import { fetchFromService, ApiError, SingleResponse } from '@/lib/api-client';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_gstin: string;
  customer_address: string;
  customer_email: string;
  customer_phone: string;
  invoice_date: string;
  due_date: string;
  status: string;
  items: InvoiceItem[];
  subtotal: string;
  discount_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  total_tax: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  irn?: string;
  einvoice_status?: string;
  notes: string;
  terms: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  hsn_code: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
  cgst_rate: string;
  sgst_rate: string;
  igst_rate: string;
  total_amount: string;
}

// GET /api/invoices/[id] - Get invoice by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const response = await fetchFromService<SingleResponse<Invoice>>(
      'invoice',
      `/api/v1/invoices/${id}`,
      {
        headers: { Authorization: authHeader },
      }
    );

    return NextResponse.json(response);
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

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetchFromService<SingleResponse<Invoice>>(
      'invoice',
      `/api/v1/invoices/${id}`,
      {
        method: 'PUT',
        headers: { Authorization: authHeader },
        body: JSON.stringify(body),
      }
    );

    return NextResponse.json(response);
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

// DELETE /api/invoices/[id] - Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await fetchFromService(
      'invoice',
      `/api/v1/invoices/${id}`,
      {
        method: 'DELETE',
        headers: { Authorization: authHeader },
      }
    );

    return new NextResponse(null, { status: 204 });
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
