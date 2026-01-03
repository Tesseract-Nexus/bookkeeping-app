import { BaseEntity, UUID, PaginationParams } from './common';

export type PartyType = 'customer' | 'vendor' | 'both';

export interface Party extends BaseEntity {
  tenant_id: UUID;
  party_type: PartyType;
  name: string;
  display_name: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  gstin?: string;
  pan?: string;
  tan?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_state_code?: string;
  billing_pincode?: string;
  billing_country: string;
  shipping_same_as_billing: boolean;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_state_code?: string;
  shipping_pincode?: string;
  credit_limit: number;
  credit_period_days: number;
  default_payment_terms?: string;
  tds_applicable: boolean;
  tds_section?: string;
  tds_rate?: number;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  tags?: string[];
  notes?: string;
  contacts?: PartyContact[];
  bank_details?: PartyBankDetail[];
  created_by: UUID;
}

export interface PartyContact {
  id: UUID;
  party_id: UUID;
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  created_at: string;
}

export interface PartyBankDetail {
  id: UUID;
  party_id: UUID;
  bank_name: string;
  account_name?: string;
  account_number?: string;
  ifsc_code?: string;
  branch?: string;
  is_primary: boolean;
  created_at: string;
}

export interface CreatePartyRequest {
  party_type: PartyType;
  name: string;
  display_name?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  gstin?: string;
  pan?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_state_code?: string;
  billing_pincode?: string;
  credit_limit?: number;
  credit_period_days?: number;
  opening_balance?: number;
  tags?: string[];
  notes?: string;
}

export interface UpdatePartyRequest {
  name?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  gstin?: string;
  pan?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_state_code?: string;
  billing_pincode?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_state_code?: string;
  shipping_pincode?: string;
  credit_limit?: number;
  credit_period_days?: number;
  tds_applicable?: boolean;
  tds_section?: string;
  tds_rate?: number;
  is_active?: boolean;
  tags?: string[];
  notes?: string;
}

export interface PartyFilter extends PaginationParams {
  type?: PartyType;
  search?: string;
  has_balance?: boolean;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface LedgerEntry {
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface PartyLedgerResponse {
  party: Party;
  opening_balance: number;
  entries: LedgerEntry[];
  closing_balance: number;
  total_debit: number;
  total_credit: number;
}

export interface CreateContactRequest {
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
}

export interface CreateBankDetailRequest {
  bank_name: string;
  account_name?: string;
  account_number: string;
  ifsc_code: string;
  branch?: string;
  is_primary?: boolean;
}
