import { UUID } from './common';

export interface DashboardSummary {
  today: TodaySummary;
  this_month: MonthSummary;
  outstanding: OutstandingSummary;
  cash_position: CashPositionSummary;
  recent_transactions: TransactionSummary[];
  overdue_invoices: InvoiceSummary[];
}

export interface TodaySummary {
  sales: number;
  expenses: number;
  net: number;
  invoices_created: number;
  payments_received: number;
}

export interface MonthSummary {
  sales: number;
  expenses: number;
  net: number;
  sales_change_percent: number;
}

export interface OutstandingSummary {
  receivables: number;
  payables: number;
}

export interface CashPositionSummary {
  cash_in_hand: number;
  bank_balance: number;
  total: number;
}

export interface TransactionSummary {
  id: UUID;
  date: string;
  type: string;
  description: string;
  amount: number;
  party_name?: string;
}

export interface InvoiceSummary {
  id: UUID;
  invoice_number: string;
  customer_name: string;
  amount: number;
  due_date: string;
  days_overdue: number;
}

export interface ProfitLossReport {
  period: ReportPeriod;
  revenue: RevenueSection;
  expenses: ExpenseSection;
  gross_profit: number;
  gross_margin_percent: number;
  operating_profit: number;
  net_profit: number;
  net_margin_percent: number;
}

export interface ReportPeriod {
  from: string;
  to: string;
}

export interface RevenueSection {
  sales: number;
  other_income: number;
  total: number;
}

export interface ExpenseSection {
  cost_of_goods_sold: number;
  operating_expenses: OperatingExpenseSection;
  total: number;
}

export interface OperatingExpenseSection {
  rent: number;
  salaries: number;
  utilities: number;
  marketing: number;
  other: number;
  total: number;
}

export interface BalanceSheet {
  as_of_date: string;
  assets: AssetsSection;
  liabilities: LiabilitiesSection;
  equity: EquitySection;
}

export interface AssetsSection {
  current_assets: CurrentAssetsSection;
  fixed_assets: number;
  total_assets: number;
}

export interface CurrentAssetsSection {
  cash: number;
  bank: number;
  accounts_receivable: number;
  inventory: number;
  total: number;
}

export interface LiabilitiesSection {
  current_liabilities: CurrentLiabilitiesSection;
  total_liabilities: number;
}

export interface CurrentLiabilitiesSection {
  accounts_payable: number;
  tax_payable: number;
  total: number;
}

export interface EquitySection {
  owner_capital: number;
  retained_earnings: number;
  total_equity: number;
}

export interface GSTSummary {
  period: string;
  outward_supplies: GSTSupplies;
  inward_supplies: GSTSupplies;
  tax_liability: GSTTaxLiability;
}

export interface GSTSupplies {
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total_tax: number;
}

export interface GSTTaxLiability {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface ReceivablesAgingReport {
  summary: AgingSummary;
  by_customer: CustomerAging[];
}

export interface AgingSummary {
  current: number;
  '1_30_days': number;
  '31_60_days': number;
  '61_90_days': number;
  over_90_days: number;
  total: number;
}

export interface CustomerAging {
  customer_id: UUID;
  customer_name: string;
  current: number;
  '1_30_days': number;
  '31_60_days': number;
  '61_90_days': number;
  over_90_days: number;
  total: number;
}

export interface CashFlowReport {
  period: ReportPeriod;
  opening_balance: number;
  operating_activities: CashFlowSection;
  investing_activities: CashFlowSection;
  financing_activities: CashFlowSection;
  net_cash_flow: number;
  closing_balance: number;
}

export interface CashFlowSection {
  inflow: number;
  outflow: number;
  net: number;
}
