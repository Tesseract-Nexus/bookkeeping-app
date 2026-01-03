import { BaseEntity, UUID, PaginationParams, DateRangeParams } from './common';

export type InvoiceType = 'sale' | 'purchase';
export type DocumentType = 'invoice' | 'quotation' | 'proforma' | 'delivery_challan' | 'credit_note' | 'debit_note';
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Invoice extends BaseEntity {
  tenant_id: UUID;
  store_id?: UUID;
  invoice_number: string;
  invoice_type: InvoiceType;
  document_type: DocumentType;
  invoice_date: string;
  due_date?: string;
  party_id: UUID;
  party_name: string;
  party_gstin?: string;
  party_address?: string;
  party_state?: string;
  party_state_code?: string;
  shipping_name?: string;
  shipping_address?: string;
  shipping_state?: string;
  shipping_state_code?: string;
  place_of_supply?: string;
  place_of_supply_code?: string;
  is_interstate: boolean;
  subtotal: number;
  discount_amount: number;
  discount_type?: 'percentage' | 'flat';
  discount_value?: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total_tax: number;
  round_off: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: PaymentStatus;
  status: InvoiceStatus;
  is_einvoice: boolean;
  irn?: string;
  ack_number?: string;
  ack_date?: string;
  signed_qr_code?: string;
  eway_bill_number?: string;
  eway_bill_date?: string;
  eway_bill_valid_until?: string;
  reference_invoice_id?: UUID;
  po_number?: string;
  po_date?: string;
  notes?: string;
  terms?: string;
  internal_notes?: string;
  transaction_id?: UUID;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
  created_by: UUID;
  updated_by?: UUID;
}

export interface InvoiceItem {
  id: UUID;
  invoice_id: UUID;
  item_id?: UUID;
  item_type?: 'product' | 'service';
  description: string;
  hsn_sac_code?: string;
  quantity: number;
  unit?: string;
  rate: number;
  discount_type?: 'percentage' | 'flat';
  discount_value?: number;
  discount_amount: number;
  taxable_amount: number;
  tax_rate: number;
  cgst_rate?: number;
  cgst_amount: number;
  sgst_rate?: number;
  sgst_amount: number;
  igst_rate?: number;
  igst_amount: number;
  cess_rate?: number;
  cess_amount: number;
  total_amount: number;
  line_order: number;
  created_at: string;
}

export interface InvoicePayment {
  id: UUID;
  invoice_id: UUID;
  tenant_id: UUID;
  payment_date: string;
  amount: number;
  payment_mode: string;
  payment_reference?: string;
  bank_account_id?: UUID;
  notes?: string;
  transaction_id?: UUID;
  created_by: UUID;
  created_at: string;
}

export interface CreateInvoiceRequest {
  invoice_type: InvoiceType;
  document_type?: DocumentType;
  invoice_date: string;
  due_date?: string;
  party_id: UUID;
  place_of_supply?: string;
  items: CreateInvoiceItemRequest[];
  discount_type?: 'percentage' | 'flat';
  discount_value?: number;
  notes?: string;
  terms?: string;
  internal_notes?: string;
}

export interface CreateInvoiceItemRequest {
  item_id?: UUID;
  item_type?: 'product' | 'service';
  description: string;
  hsn_sac_code?: string;
  quantity: number;
  unit?: string;
  rate: number;
  discount_type?: 'percentage' | 'flat';
  discount_value?: number;
  tax_rate: number;
}

export interface UpdateInvoiceRequest {
  due_date?: string;
  items?: CreateInvoiceItemRequest[];
  discount_type?: 'percentage' | 'flat';
  discount_value?: number;
  notes?: string;
  terms?: string;
  internal_notes?: string;
}

export interface RecordPaymentRequest {
  payment_date: string;
  amount: number;
  payment_mode: string;
  payment_reference?: string;
  bank_account_id?: UUID;
  notes?: string;
}

export interface SendInvoiceRequest {
  channels: ('email' | 'whatsapp' | 'sms')[];
  email?: string;
  phone?: string;
  message?: string;
}

export interface GenerateEWayBillRequest {
  transporter_id?: string;
  transporter_name?: string;
  vehicle_number?: string;
  vehicle_type?: 'regular' | 'over_dimensional_cargo';
  transport_mode?: 'road' | 'rail' | 'air' | 'ship';
  distance?: number;
}

export interface InvoiceFilter extends PaginationParams, DateRangeParams {
  type?: InvoiceType;
  document_type?: DocumentType;
  status?: InvoiceStatus;
  payment_status?: PaymentStatus;
  party_id?: UUID;
  store_id?: UUID;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface EInvoiceResponse {
  irn: string;
  ack_number: string;
  ack_date: string;
  signed_qr_code: string;
}

export interface EWayBillResponse {
  eway_bill_number: string;
  eway_bill_date: string;
  valid_until: string;
}
