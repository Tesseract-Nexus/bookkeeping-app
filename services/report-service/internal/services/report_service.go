package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/report-service/internal/models"
	"gorm.io/gorm"
)

// ReportService defines the interface for report business logic
type ReportService interface {
	GetDashboardSummary(ctx context.Context, tenantID uuid.UUID) (*models.DashboardSummary, error)
	GetProfitLoss(ctx context.Context, tenantID uuid.UUID, fromDate, toDate time.Time) (*models.ProfitLossReport, error)
	GetBalanceSheet(ctx context.Context, tenantID uuid.UUID, asOfDate time.Time) (*models.BalanceSheet, error)
	GetGSTSummary(ctx context.Context, tenantID uuid.UUID, month, year int) (*models.GSTSummary, error)
	GetReceivablesAging(ctx context.Context, tenantID uuid.UUID) (*models.ReceivablesAgingReport, error)
	GetPayablesAging(ctx context.Context, tenantID uuid.UUID) (*models.PayablesAgingReport, error)
	GetCashFlow(ctx context.Context, tenantID uuid.UUID, fromDate, toDate time.Time) (*models.CashFlowReport, error)
	GetTrialBalance(ctx context.Context, tenantID uuid.UUID, asOfDate time.Time) (*models.TrialBalanceReport, error)
}

type reportService struct {
	db *gorm.DB
}

// NewReportService creates a new report service
func NewReportService(db *gorm.DB) ReportService {
	return &reportService{db: db}
}

func (s *reportService) GetDashboardSummary(ctx context.Context, tenantID uuid.UUID) (*models.DashboardSummary, error) {
	today := time.Now().Truncate(24 * time.Hour)
	monthStart := time.Date(today.Year(), today.Month(), 1, 0, 0, 0, 0, today.Location())
	lastMonthStart := monthStart.AddDate(0, -1, 0)
	lastMonthEnd := monthStart.AddDate(0, 0, -1)

	summary := &models.DashboardSummary{}

	// Today's summary
	var todaySales, todayExpenses float64
	s.db.WithContext(ctx).Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN transaction_type = 'sale' THEN total_amount ELSE 0 END), 0) as sales,
			COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN total_amount ELSE 0 END), 0) as expenses
		FROM transactions
		WHERE tenant_id = ? AND transaction_date = ? AND status = 'posted' AND deleted_at IS NULL
	`, tenantID, today.Format("2006-01-02")).Row().Scan(&todaySales, &todayExpenses)

	summary.Today = models.TodaySummary{
		Sales:    todaySales,
		Expenses: todayExpenses,
		Net:      todaySales - todayExpenses,
	}

	// This month summary
	var monthSales, monthExpenses float64
	s.db.WithContext(ctx).Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN transaction_type = 'sale' THEN total_amount ELSE 0 END), 0) as sales,
			COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN total_amount ELSE 0 END), 0) as expenses
		FROM transactions
		WHERE tenant_id = ? AND transaction_date >= ? AND transaction_date <= ? AND status = 'posted' AND deleted_at IS NULL
	`, tenantID, monthStart.Format("2006-01-02"), today.Format("2006-01-02")).Row().Scan(&monthSales, &monthExpenses)

	// Last month sales for comparison
	var lastMonthSales float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(total_amount), 0)
		FROM transactions
		WHERE tenant_id = ? AND transaction_date >= ? AND transaction_date <= ?
		AND transaction_type = 'sale' AND status = 'posted' AND deleted_at IS NULL
	`, tenantID, lastMonthStart.Format("2006-01-02"), lastMonthEnd.Format("2006-01-02")).Row().Scan(&lastMonthSales)

	var salesChangePercent float64
	if lastMonthSales > 0 {
		salesChangePercent = ((monthSales - lastMonthSales) / lastMonthSales) * 100
	}

	summary.ThisMonth = models.MonthSummary{
		Sales:              monthSales,
		Expenses:           monthExpenses,
		Net:                monthSales - monthExpenses,
		SalesChangePercent: salesChangePercent,
	}

	// Outstanding receivables and payables
	var receivables, payables float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts
		WHERE tenant_id = ? AND sub_type = 'receivable' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&receivables)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts
		WHERE tenant_id = ? AND sub_type = 'payable' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&payables)

	summary.Outstanding = models.OutstandingSummary{
		Receivables: receivables,
		Payables:    payables,
	}

	// Cash position
	var cash, bank float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts
		WHERE tenant_id = ? AND sub_type = 'cash' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&cash)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts
		WHERE tenant_id = ? AND sub_type = 'bank' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&bank)

	summary.CashPosition = models.CashPositionSummary{
		CashInHand:  cash,
		BankBalance: bank,
		Total:       cash + bank,
	}

	// Recent transactions
	var recentTxns []models.TransactionSummary
	s.db.WithContext(ctx).Raw(`
		SELECT id, transaction_date as date, transaction_type as type, description, total_amount as amount, party_name
		FROM transactions
		WHERE tenant_id = ? AND status = 'posted' AND deleted_at IS NULL
		ORDER BY transaction_date DESC, created_at DESC
		LIMIT 10
	`, tenantID).Scan(&recentTxns)
	summary.RecentTransactions = recentTxns

	return summary, nil
}

func (s *reportService) GetProfitLoss(ctx context.Context, tenantID uuid.UUID, fromDate, toDate time.Time) (*models.ProfitLossReport, error) {
	report := &models.ProfitLossReport{
		Period: models.ReportPeriod{
			From: fromDate,
			To:   toDate,
		},
	}

	fromStr := fromDate.Format("2006-01-02")
	toStr := toDate.Format("2006-01-02")

	// Revenue
	var sales, otherIncome float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(tl.credit_amount - tl.debit_amount), 0)
		FROM transaction_lines tl
		JOIN transactions t ON t.id = tl.transaction_id
		JOIN accounts a ON a.id = tl.account_id
		WHERE t.tenant_id = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
		AND t.status = 'posted' AND t.deleted_at IS NULL
		AND a.sub_type = 'sales'
	`, tenantID, fromStr, toStr).Row().Scan(&sales)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(tl.credit_amount - tl.debit_amount), 0)
		FROM transaction_lines tl
		JOIN transactions t ON t.id = tl.transaction_id
		JOIN accounts a ON a.id = tl.account_id
		WHERE t.tenant_id = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
		AND t.status = 'posted' AND t.deleted_at IS NULL
		AND a.type = 'income' AND a.sub_type != 'sales'
	`, tenantID, fromStr, toStr).Row().Scan(&otherIncome)

	report.Revenue = models.RevenueSection{
		Sales:       sales,
		OtherIncome: otherIncome,
		Total:       sales + otherIncome,
	}

	// Cost of Goods Sold
	var cogs float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0)
		FROM transaction_lines tl
		JOIN transactions t ON t.id = tl.transaction_id
		JOIN accounts a ON a.id = tl.account_id
		WHERE t.tenant_id = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
		AND t.status = 'posted' AND t.deleted_at IS NULL
		AND a.sub_type IN ('purchase', 'direct_expense')
	`, tenantID, fromStr, toStr).Row().Scan(&cogs)

	// Operating Expenses
	var rent, salaries, utilities, marketing, otherExp float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0)
		FROM transaction_lines tl
		JOIN transactions t ON t.id = tl.transaction_id
		JOIN accounts a ON a.id = tl.account_id
		WHERE t.tenant_id = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
		AND t.status = 'posted' AND t.deleted_at IS NULL
		AND a.code = '5300'
	`, tenantID, fromStr, toStr).Row().Scan(&rent)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0)
		FROM transaction_lines tl
		JOIN transactions t ON t.id = tl.transaction_id
		JOIN accounts a ON a.id = tl.account_id
		WHERE t.tenant_id = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
		AND t.status = 'posted' AND t.deleted_at IS NULL
		AND a.code = '5400'
	`, tenantID, fromStr, toStr).Row().Scan(&salaries)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0)
		FROM transaction_lines tl
		JOIN transactions t ON t.id = tl.transaction_id
		JOIN accounts a ON a.id = tl.account_id
		WHERE t.tenant_id = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
		AND t.status = 'posted' AND t.deleted_at IS NULL
		AND a.code = '5500'
	`, tenantID, fromStr, toStr).Row().Scan(&utilities)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0)
		FROM transaction_lines tl
		JOIN transactions t ON t.id = tl.transaction_id
		JOIN accounts a ON a.id = tl.account_id
		WHERE t.tenant_id = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
		AND t.status = 'posted' AND t.deleted_at IS NULL
		AND a.code = '5600'
	`, tenantID, fromStr, toStr).Row().Scan(&marketing)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(tl.debit_amount - tl.credit_amount), 0)
		FROM transaction_lines tl
		JOIN transactions t ON t.id = tl.transaction_id
		JOIN accounts a ON a.id = tl.account_id
		WHERE t.tenant_id = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
		AND t.status = 'posted' AND t.deleted_at IS NULL
		AND a.type = 'expense' AND a.sub_type = 'indirect_expense'
		AND a.code NOT IN ('5300', '5400', '5500', '5600')
	`, tenantID, fromStr, toStr).Row().Scan(&otherExp)

	opExpTotal := rent + salaries + utilities + marketing + otherExp
	report.Expenses = models.ExpenseSection{
		CostOfGoodsSold: cogs,
		OperatingExpenses: models.OperatingExpenseSection{
			Rent:      rent,
			Salaries:  salaries,
			Utilities: utilities,
			Marketing: marketing,
			Other:     otherExp,
			Total:     opExpTotal,
		},
		Total: cogs + opExpTotal,
	}

	// Calculate profits
	report.GrossProfit = report.Revenue.Total - cogs
	if report.Revenue.Total > 0 {
		report.GrossMargin = (report.GrossProfit / report.Revenue.Total) * 100
	}
	report.OperatingProfit = report.GrossProfit - opExpTotal
	report.NetProfit = report.OperatingProfit
	if report.Revenue.Total > 0 {
		report.NetMargin = (report.NetProfit / report.Revenue.Total) * 100
	}

	return report, nil
}

func (s *reportService) GetBalanceSheet(ctx context.Context, tenantID uuid.UUID, asOfDate time.Time) (*models.BalanceSheet, error) {
	bs := &models.BalanceSheet{
		AsOfDate: asOfDate,
	}

	// Current Assets
	var cash, bank, receivables, inventory float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts WHERE tenant_id = ? AND sub_type = 'cash' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&cash)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts WHERE tenant_id = ? AND sub_type = 'bank' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&bank)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts WHERE tenant_id = ? AND sub_type = 'receivable' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&receivables)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts WHERE tenant_id = ? AND sub_type = 'inventory' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&inventory)

	currentAssetsTotal := cash + bank + receivables + inventory

	// Fixed Assets
	var fixedAssets float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts WHERE tenant_id = ? AND sub_type = 'fixed_asset' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&fixedAssets)

	bs.Assets = models.AssetsSection{
		CurrentAssets: models.CurrentAssetsSection{
			Cash:             cash,
			Bank:             bank,
			AccountsReceivable: receivables,
			Inventory:        inventory,
			Total:            currentAssetsTotal,
		},
		FixedAssets:  fixedAssets,
		TotalAssets:  currentAssetsTotal + fixedAssets,
	}

	// Liabilities
	var payables, taxPayable float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts WHERE tenant_id = ? AND sub_type = 'payable' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&payables)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts WHERE tenant_id = ? AND sub_type = 'tax' AND type = 'liability' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&taxPayable)

	currentLiabTotal := payables + taxPayable
	bs.Liabilities = models.LiabilitiesSection{
		CurrentLiabilities: models.CurrentLiabilitiesSection{
			AccountsPayable: payables,
			TaxPayable:      taxPayable,
			Total:           currentLiabTotal,
		},
		TotalLiabilities: currentLiabTotal,
	}

	// Equity
	var capital, retained float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts WHERE tenant_id = ? AND sub_type = 'capital' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&capital)

	// Retained earnings = Total Assets - Total Liabilities - Capital
	retained = bs.Assets.TotalAssets - bs.Liabilities.TotalLiabilities - capital

	bs.Equity = models.EquitySection{
		OwnerCapital:     capital,
		RetainedEarnings: retained,
		TotalEquity:      capital + retained,
	}

	return bs, nil
}

func (s *reportService) GetGSTSummary(ctx context.Context, tenantID uuid.UUID, month, year int) (*models.GSTSummary, error) {
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)

	summary := &models.GSTSummary{
		Period: startDate.Format("January 2006"),
	}

	// Outward supplies (Sales)
	var outTaxable, outCGST, outSGST, outIGST float64
	s.db.WithContext(ctx).Raw(`
		SELECT
			COALESCE(SUM(total_amount - tax_amount), 0) as taxable,
			COALESCE(SUM(tax_amount / 2), 0) as cgst,
			COALESCE(SUM(tax_amount / 2), 0) as sgst,
			0 as igst
		FROM transactions
		WHERE tenant_id = ? AND transaction_date >= ? AND transaction_date <= ?
		AND transaction_type = 'sale' AND status = 'posted' AND deleted_at IS NULL
	`, tenantID, startDate.Format("2006-01-02"), endDate.Format("2006-01-02")).Row().Scan(&outTaxable, &outCGST, &outSGST, &outIGST)

	summary.OutwardSupplies = models.GSTSupplies{
		TaxableValue: outTaxable,
		CGST:         outCGST,
		SGST:         outSGST,
		IGST:         outIGST,
		TotalTax:     outCGST + outSGST + outIGST,
	}

	// Inward supplies (Purchases)
	var inTaxable, inCGST, inSGST, inIGST float64
	s.db.WithContext(ctx).Raw(`
		SELECT
			COALESCE(SUM(total_amount - tax_amount), 0) as taxable,
			COALESCE(SUM(tax_amount / 2), 0) as cgst,
			COALESCE(SUM(tax_amount / 2), 0) as sgst,
			0 as igst
		FROM transactions
		WHERE tenant_id = ? AND transaction_date >= ? AND transaction_date <= ?
		AND transaction_type = 'purchase' AND status = 'posted' AND deleted_at IS NULL
	`, tenantID, startDate.Format("2006-01-02"), endDate.Format("2006-01-02")).Row().Scan(&inTaxable, &inCGST, &inSGST, &inIGST)

	summary.InwardSupplies = models.GSTSupplies{
		TaxableValue: inTaxable,
		CGST:         inCGST,
		SGST:         inSGST,
		IGST:         inIGST,
		TotalTax:     inCGST + inSGST + inIGST,
	}

	// Tax liability (Output - Input)
	summary.TaxLiability = models.GSTTaxLiability{
		CGST:  outCGST - inCGST,
		SGST:  outSGST - inSGST,
		IGST:  outIGST - inIGST,
		Total: (outCGST - inCGST) + (outSGST - inSGST) + (outIGST - inIGST),
	}

	return summary, nil
}

func (s *reportService) GetReceivablesAging(ctx context.Context, tenantID uuid.UUID) (*models.ReceivablesAgingReport, error) {
	today := time.Now()
	report := &models.ReceivablesAgingReport{}

	// This is a simplified implementation
	// In production, you'd query actual invoice data with due dates
	var current, days1to30, days31to60, days61to90, over90 float64

	// For now, return the total receivables as current
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(current_balance), 0)
		FROM accounts WHERE tenant_id = ? AND sub_type = 'receivable' AND deleted_at IS NULL
	`, tenantID).Row().Scan(&current)

	report.Summary = models.AgingSummary{
		Current:    current,
		Days1To30:  days1to30,
		Days31To60: days31to60,
		Days61To90: days61to90,
		Over90Days: over90,
		Total:      current + days1to30 + days31to60 + days61to90 + over90,
	}

	_ = today // Would be used for actual aging calculation

	return report, nil
}

func (s *reportService) GetCashFlow(ctx context.Context, tenantID uuid.UUID, fromDate, toDate time.Time) (*models.CashFlowReport, error) {
	report := &models.CashFlowReport{
		Period: models.ReportPeriod{
			From: fromDate,
			To:   toDate,
		},
	}

	fromStr := fromDate.Format("2006-01-02")
	toStr := toDate.Format("2006-01-02")

	// Opening balance
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(a.opening_balance), 0)
		FROM accounts a
		WHERE a.tenant_id = ? AND a.sub_type IN ('cash', 'bank') AND a.deleted_at IS NULL
	`, tenantID).Row().Scan(&report.OpeningBalance)

	// Operating activities
	var opInflow, opOutflow float64
	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(total_amount), 0)
		FROM transactions
		WHERE tenant_id = ? AND transaction_date >= ? AND transaction_date <= ?
		AND transaction_type IN ('sale', 'receipt') AND status = 'posted' AND deleted_at IS NULL
	`, tenantID, fromStr, toStr).Row().Scan(&opInflow)

	s.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(total_amount), 0)
		FROM transactions
		WHERE tenant_id = ? AND transaction_date >= ? AND transaction_date <= ?
		AND transaction_type IN ('purchase', 'expense', 'payment') AND status = 'posted' AND deleted_at IS NULL
	`, tenantID, fromStr, toStr).Row().Scan(&opOutflow)

	report.OperatingActivities = models.CashFlowSection{
		Inflow:  opInflow,
		Outflow: opOutflow,
		Net:     opInflow - opOutflow,
	}

	// Net cash flow
	report.NetCashFlow = report.OperatingActivities.Net +
		report.InvestingActivities.Net +
		report.FinancingActivities.Net

	// Closing balance
	report.ClosingBalance = report.OpeningBalance + report.NetCashFlow

	return report, nil
}

func (s *reportService) GetPayablesAging(ctx context.Context, tenantID uuid.UUID) (*models.PayablesAgingReport, error) {
	today := time.Now()
	report := &models.PayablesAgingReport{}

	// Query bills with outstanding balances and calculate aging buckets
	type agingRow struct {
		VendorID   uuid.UUID
		VendorName string
		DueDate    time.Time
		Balance    float64
	}

	var rows []agingRow
	s.db.WithContext(ctx).Raw(`
		SELECT
			vendor_id,
			vendor_name,
			due_date,
			(total_amount - COALESCE(amount_paid, 0)) as balance
		FROM bills
		WHERE tenant_id = ?
		AND status NOT IN ('paid', 'cancelled', 'voided')
		AND (total_amount - COALESCE(amount_paid, 0)) > 0
		AND deleted_at IS NULL
	`, tenantID).Scan(&rows)

	// Group by vendor and calculate aging buckets
	vendorMap := make(map[uuid.UUID]*models.VendorAging)
	summary := models.AgingSummary{}

	for _, row := range rows {
		daysOverdue := int(today.Sub(row.DueDate).Hours() / 24)

		if _, exists := vendorMap[row.VendorID]; !exists {
			vendorMap[row.VendorID] = &models.VendorAging{
				VendorID:   row.VendorID,
				VendorName: row.VendorName,
			}
		}

		vendor := vendorMap[row.VendorID]

		switch {
		case daysOverdue <= 0:
			vendor.Current += row.Balance
			summary.Current += row.Balance
		case daysOverdue <= 30:
			vendor.Days1To30 += row.Balance
			summary.Days1To30 += row.Balance
		case daysOverdue <= 60:
			vendor.Days31To60 += row.Balance
			summary.Days31To60 += row.Balance
		case daysOverdue <= 90:
			vendor.Days61To90 += row.Balance
			summary.Days61To90 += row.Balance
		default:
			vendor.Over90Days += row.Balance
			summary.Over90Days += row.Balance
		}

		vendor.Total += row.Balance
		summary.Total += row.Balance
	}

	// Convert map to slice
	for _, vendor := range vendorMap {
		report.ByVendor = append(report.ByVendor, *vendor)
	}

	report.Summary = summary
	return report, nil
}

func (s *reportService) GetTrialBalance(ctx context.Context, tenantID uuid.UUID, asOfDate time.Time) (*models.TrialBalanceReport, error) {
	report := &models.TrialBalanceReport{
		AsOfDate: asOfDate,
	}

	asOfStr := asOfDate.Format("2006-01-02")

	// Get all accounts with their balances as of the specified date
	type accountRow struct {
		ID             uuid.UUID
		Code           string
		Name           string
		Type           string
		NormalBalance  string
		OpeningBalance float64
		DebitMovements float64
		CreditMovements float64
	}

	var rows []accountRow
	s.db.WithContext(ctx).Raw(`
		SELECT
			a.id,
			a.code,
			a.name,
			a.type,
			a.normal_balance,
			COALESCE(a.opening_balance, 0) as opening_balance,
			COALESCE(SUM(tl.debit_amount), 0) as debit_movements,
			COALESCE(SUM(tl.credit_amount), 0) as credit_movements
		FROM accounts a
		LEFT JOIN transaction_lines tl ON tl.account_id = a.id
		LEFT JOIN transactions t ON t.id = tl.transaction_id
			AND t.transaction_date <= ?
			AND t.status = 'posted'
			AND t.deleted_at IS NULL
		WHERE a.tenant_id = ? AND a.deleted_at IS NULL
		GROUP BY a.id, a.code, a.name, a.type, a.normal_balance, a.opening_balance
		ORDER BY a.code
	`, asOfStr, tenantID).Scan(&rows)

	var totalDebit, totalCredit float64

	for _, row := range rows {
		entry := models.TrialBalanceEntry{
			AccountID:   row.ID,
			AccountCode: row.Code,
			AccountName: row.Name,
			AccountType: row.Type,
		}

		// Calculate net balance
		netBalance := row.OpeningBalance + row.DebitMovements - row.CreditMovements

		// Assign to debit or credit column based on normal balance and net amount
		if row.NormalBalance == "debit" {
			if netBalance >= 0 {
				entry.DebitBalance = netBalance
			} else {
				entry.CreditBalance = -netBalance
			}
		} else {
			// Credit normal balance
			netBalance = row.OpeningBalance + row.CreditMovements - row.DebitMovements
			if netBalance >= 0 {
				entry.CreditBalance = netBalance
			} else {
				entry.DebitBalance = -netBalance
			}
		}

		totalDebit += entry.DebitBalance
		totalCredit += entry.CreditBalance

		// Only include accounts with non-zero balances
		if entry.DebitBalance != 0 || entry.CreditBalance != 0 {
			report.Accounts = append(report.Accounts, entry)
		}
	}

	report.TotalDebit = totalDebit
	report.TotalCredit = totalCredit

	return report, nil
}
