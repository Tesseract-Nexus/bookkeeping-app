package models

import (
	"time"

	"github.com/google/uuid"
)

// DashboardSummary represents the dashboard summary data
type DashboardSummary struct {
	Today      TodaySummary      `json:"today"`
	ThisMonth  MonthSummary      `json:"this_month"`
	Outstanding OutstandingSummary `json:"outstanding"`
	CashPosition CashPositionSummary `json:"cash_position"`
	RecentTransactions []TransactionSummary `json:"recent_transactions"`
	OverdueInvoices []InvoiceSummary `json:"overdue_invoices"`
}

// TodaySummary represents today's transaction summary
type TodaySummary struct {
	Sales            float64 `json:"sales"`
	Expenses         float64 `json:"expenses"`
	Net              float64 `json:"net"`
	InvoicesCreated  int     `json:"invoices_created"`
	PaymentsReceived int     `json:"payments_received"`
}

// MonthSummary represents this month's summary
type MonthSummary struct {
	Sales              float64 `json:"sales"`
	Expenses           float64 `json:"expenses"`
	Net                float64 `json:"net"`
	SalesChangePercent float64 `json:"sales_change_percent"`
}

// OutstandingSummary represents outstanding amounts
type OutstandingSummary struct {
	Receivables float64 `json:"receivables"`
	Payables    float64 `json:"payables"`
}

// CashPositionSummary represents cash position
type CashPositionSummary struct {
	CashInHand  float64 `json:"cash_in_hand"`
	BankBalance float64 `json:"bank_balance"`
	Total       float64 `json:"total"`
}

// TransactionSummary represents a transaction summary for dashboard
type TransactionSummary struct {
	ID              uuid.UUID `json:"id"`
	Date            time.Time `json:"date"`
	Type            string    `json:"type"`
	Description     string    `json:"description"`
	Amount          float64   `json:"amount"`
	PartyName       string    `json:"party_name,omitempty"`
}

// InvoiceSummary represents an invoice summary for dashboard
type InvoiceSummary struct {
	ID            uuid.UUID `json:"id"`
	InvoiceNumber string    `json:"invoice_number"`
	CustomerName  string    `json:"customer_name"`
	Amount        float64   `json:"amount"`
	DueDate       time.Time `json:"due_date"`
	DaysOverdue   int       `json:"days_overdue"`
}

// ProfitLossReport represents a P&L report
type ProfitLossReport struct {
	Period        ReportPeriod    `json:"period"`
	Revenue       RevenueSection  `json:"revenue"`
	Expenses      ExpenseSection  `json:"expenses"`
	GrossProfit   float64         `json:"gross_profit"`
	GrossMargin   float64         `json:"gross_margin_percent"`
	OperatingProfit float64       `json:"operating_profit"`
	NetProfit     float64         `json:"net_profit"`
	NetMargin     float64         `json:"net_margin_percent"`
}

// ReportPeriod represents the period for a report
type ReportPeriod struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

// RevenueSection represents revenue in P&L
type RevenueSection struct {
	Sales       float64 `json:"sales"`
	OtherIncome float64 `json:"other_income"`
	Total       float64 `json:"total"`
}

// ExpenseSection represents expenses in P&L
type ExpenseSection struct {
	CostOfGoodsSold   float64                 `json:"cost_of_goods_sold"`
	OperatingExpenses OperatingExpenseSection `json:"operating_expenses"`
	Total             float64                 `json:"total"`
}

// OperatingExpenseSection represents operating expenses
type OperatingExpenseSection struct {
	Rent      float64 `json:"rent"`
	Salaries  float64 `json:"salaries"`
	Utilities float64 `json:"utilities"`
	Marketing float64 `json:"marketing"`
	Other     float64 `json:"other"`
	Total     float64 `json:"total"`
}

// BalanceSheet represents a balance sheet report
type BalanceSheet struct {
	AsOfDate    time.Time      `json:"as_of_date"`
	Assets      AssetsSection  `json:"assets"`
	Liabilities LiabilitiesSection `json:"liabilities"`
	Equity      EquitySection  `json:"equity"`
}

// AssetsSection represents assets in balance sheet
type AssetsSection struct {
	CurrentAssets    CurrentAssetsSection `json:"current_assets"`
	FixedAssets      float64              `json:"fixed_assets"`
	TotalAssets      float64              `json:"total_assets"`
}

// CurrentAssetsSection represents current assets
type CurrentAssetsSection struct {
	Cash             float64 `json:"cash"`
	Bank             float64 `json:"bank"`
	AccountsReceivable float64 `json:"accounts_receivable"`
	Inventory        float64 `json:"inventory"`
	Total            float64 `json:"total"`
}

// LiabilitiesSection represents liabilities in balance sheet
type LiabilitiesSection struct {
	CurrentLiabilities CurrentLiabilitiesSection `json:"current_liabilities"`
	TotalLiabilities   float64                   `json:"total_liabilities"`
}

// CurrentLiabilitiesSection represents current liabilities
type CurrentLiabilitiesSection struct {
	AccountsPayable float64 `json:"accounts_payable"`
	TaxPayable      float64 `json:"tax_payable"`
	Total           float64 `json:"total"`
}

// EquitySection represents equity in balance sheet
type EquitySection struct {
	OwnerCapital     float64 `json:"owner_capital"`
	RetainedEarnings float64 `json:"retained_earnings"`
	TotalEquity      float64 `json:"total_equity"`
}

// GSTSummary represents GST summary report
type GSTSummary struct {
	Period          string            `json:"period"`
	OutwardSupplies GSTSupplies       `json:"outward_supplies"`
	InwardSupplies  GSTSupplies       `json:"inward_supplies"`
	TaxLiability    GSTTaxLiability   `json:"tax_liability"`
}

// GSTSupplies represents GST supplies (inward or outward)
type GSTSupplies struct {
	TaxableValue float64 `json:"taxable_value"`
	CGST         float64 `json:"cgst"`
	SGST         float64 `json:"sgst"`
	IGST         float64 `json:"igst"`
	Cess         float64 `json:"cess"`
	TotalTax     float64 `json:"total_tax"`
}

// GSTTaxLiability represents net tax liability
type GSTTaxLiability struct {
	CGST  float64 `json:"cgst"`
	SGST  float64 `json:"sgst"`
	IGST  float64 `json:"igst"`
	Total float64 `json:"total"`
}

// ReceivablesAgingReport represents receivables aging report
type ReceivablesAgingReport struct {
	Summary    AgingSummary       `json:"summary"`
	ByCustomer []CustomerAging    `json:"by_customer"`
}

// AgingSummary represents aging summary
type AgingSummary struct {
	Current     float64 `json:"current"`
	Days1To30   float64 `json:"1_30_days"`
	Days31To60  float64 `json:"31_60_days"`
	Days61To90  float64 `json:"61_90_days"`
	Over90Days  float64 `json:"over_90_days"`
	Total       float64 `json:"total"`
}

// CustomerAging represents aging for a single customer
type CustomerAging struct {
	CustomerID   uuid.UUID `json:"customer_id"`
	CustomerName string    `json:"customer_name"`
	Current      float64   `json:"current"`
	Days1To30    float64   `json:"1_30_days"`
	Days31To60   float64   `json:"31_60_days"`
	Days61To90   float64   `json:"61_90_days"`
	Over90Days   float64   `json:"over_90_days"`
	Total        float64   `json:"total"`
}

// CashFlowReport represents cash flow report
type CashFlowReport struct {
	Period             ReportPeriod `json:"period"`
	OpeningBalance     float64      `json:"opening_balance"`
	OperatingActivities CashFlowSection `json:"operating_activities"`
	InvestingActivities CashFlowSection `json:"investing_activities"`
	FinancingActivities CashFlowSection `json:"financing_activities"`
	NetCashFlow        float64      `json:"net_cash_flow"`
	ClosingBalance     float64      `json:"closing_balance"`
}

// CashFlowSection represents a section in cash flow
type CashFlowSection struct {
	Inflow  float64 `json:"inflow"`
	Outflow float64 `json:"outflow"`
	Net     float64 `json:"net"`
}
