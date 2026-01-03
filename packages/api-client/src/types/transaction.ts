import { BaseEntity, UUID, PaginationParams, DateRangeParams } from './common';

export type TransactionType = 'sale' | 'purchase' | 'receipt' | 'payment' | 'expense' | 'journal' | 'transfer';
export type TransactionStatus = 'draft' | 'posted' | 'void';
export type PaymentMode = 'cash' | 'bank' | 'upi' | 'card' | 'credit' | 'cheque';

export interface Transaction extends BaseEntity {
  tenant_id: UUID;
  store_id?: UUID;
  transaction_number: string;
  transaction_date: string;
  transaction_type: TransactionType;
  reference_type?: string;
  reference_id?: UUID;
  party_id?: UUID;
  party_type?: string;
  party_name?: string;
  description?: string;
  notes?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_mode?: PaymentMode;
  payment_reference?: string;
  status: TransactionStatus;
  lines?: TransactionLine[];
  created_by: UUID;
  updated_by?: UUID;
}

export interface TransactionLine {
  id: UUID;
  transaction_id: UUID;
  account_id: UUID;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  tax_rate_id?: UUID;
  tax_amount: number;
  line_order: number;
  account?: Account;
  created_at: string;
}

export interface Account extends BaseEntity {
  tenant_id: UUID;
  parent_id?: UUID;
  code?: string;
  name: string;
  type: AccountType;
  sub_type?: AccountSubType;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  children?: Account[];
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type AccountSubType = 'cash' | 'bank' | 'receivable' | 'payable' | 'inventory' |
  'fixed_asset' | 'sales' | 'purchase' | 'direct_expense' | 'indirect_expense' | 'tax' | 'capital';

export interface CreateTransactionRequest {
  transaction_date: string;
  transaction_type: TransactionType;
  party_id?: UUID;
  party_name?: string;
  description?: string;
  notes?: string;
  lines: TransactionLineRequest[];
  payment_mode?: PaymentMode;
  payment_reference?: string;
}

export interface TransactionLineRequest {
  account_id: UUID;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  tax_rate_id?: UUID;
  tax_amount?: number;
}

export interface QuickSaleRequest {
  date: string;
  customer_id?: UUID;
  customer_name?: string;
  items: QuickSaleItem[];
  payment_mode: PaymentMode;
  payment_reference?: string;
  notes?: string;
}

export interface QuickSaleItem {
  description: string;
  quantity: number;
  rate: number;
  tax_rate?: number;
}

export interface QuickExpenseRequest {
  date: string;
  expense_account_id: UUID;
  amount: number;
  vendor_id?: UUID;
  vendor_name?: string;
  description?: string;
  payment_mode: PaymentMode;
  payment_reference?: string;
  notes?: string;
}

export interface TransactionFilter extends PaginationParams, DateRangeParams {
  type?: TransactionType;
  status?: TransactionStatus;
  party_id?: UUID;
  store_id?: UUID;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DailySummary {
  date: string;
  total_sales: number;
  total_purchases: number;
  total_expenses: number;
  total_receipts: number;
  total_payments: number;
  transaction_count: number;
}

export interface CreateAccountRequest {
  code?: string;
  name: string;
  type: AccountType;
  sub_type?: AccountSubType;
  description?: string;
  parent_id?: UUID;
  opening_balance?: number;
}

export interface UpdateAccountRequest {
  code?: string;
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface AccountFilter extends PaginationParams {
  type?: AccountType;
  sub_type?: AccountSubType;
  search?: string;
  is_active?: boolean;
  parent_id?: UUID;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
