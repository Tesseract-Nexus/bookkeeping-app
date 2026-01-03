package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/models"
	"gorm.io/gorm"
)

// TransactionRepository defines the interface for transaction data access
type TransactionRepository interface {
	Create(ctx context.Context, transaction *models.Transaction) error
	Update(ctx context.Context, transaction *models.Transaction) error
	Delete(ctx context.Context, id, tenantID uuid.UUID) error
	FindByID(ctx context.Context, id, tenantID uuid.UUID) (*models.Transaction, error)
	FindByNumber(ctx context.Context, number string, tenantID uuid.UUID) (*models.Transaction, error)
	FindAll(ctx context.Context, tenantID uuid.UUID, filter TransactionFilter) ([]models.Transaction, int64, error)
	GetNextNumber(ctx context.Context, tenantID uuid.UUID, txnType models.TransactionType) (string, error)
	VoidTransaction(ctx context.Context, id, tenantID uuid.UUID) error
	GetDailySummary(ctx context.Context, tenantID uuid.UUID, date time.Time) (*DailySummary, error)
	GetAccountBalance(ctx context.Context, accountID, tenantID uuid.UUID, asOfDate time.Time) (float64, error)
}

// TransactionFilter defines filter options for listing transactions
type TransactionFilter struct {
	Type      string
	Status    string
	FromDate  string
	ToDate    string
	PartyID   *uuid.UUID
	StoreID   *uuid.UUID
	Search    string
	Page      int
	PerPage   int
	SortBy    string
	SortOrder string
}

// DailySummary represents daily transaction summary
type DailySummary struct {
	Date             time.Time `json:"date"`
	TotalSales       float64   `json:"total_sales"`
	TotalPurchases   float64   `json:"total_purchases"`
	TotalExpenses    float64   `json:"total_expenses"`
	TotalReceipts    float64   `json:"total_receipts"`
	TotalPayments    float64   `json:"total_payments"`
	TransactionCount int       `json:"transaction_count"`
}

type transactionRepository struct {
	db *gorm.DB
}

// NewTransactionRepository creates a new transaction repository
func NewTransactionRepository(db *gorm.DB) TransactionRepository {
	return &transactionRepository{db: db}
}

func (r *transactionRepository) Create(ctx context.Context, transaction *models.Transaction) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Create transaction
		if err := tx.Create(transaction).Error; err != nil {
			return err
		}

		// Update account balances
		for _, line := range transaction.Lines {
			balanceChange := line.DebitAmount - line.CreditAmount
			if err := tx.Model(&models.Account{}).
				Where("id = ?", line.AccountID).
				Update("current_balance", gorm.Expr("current_balance + ?", balanceChange)).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *transactionRepository) Update(ctx context.Context, transaction *models.Transaction) error {
	return r.db.WithContext(ctx).Save(transaction).Error
}

func (r *transactionRepository) Delete(ctx context.Context, id, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&models.Transaction{}).Error
}

func (r *transactionRepository) FindByID(ctx context.Context, id, tenantID uuid.UUID) (*models.Transaction, error) {
	var transaction models.Transaction
	err := r.db.WithContext(ctx).
		Preload("Lines").
		Preload("Lines.Account").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&transaction).Error
	if err != nil {
		return nil, err
	}
	return &transaction, nil
}

func (r *transactionRepository) FindByNumber(ctx context.Context, number string, tenantID uuid.UUID) (*models.Transaction, error) {
	var transaction models.Transaction
	err := r.db.WithContext(ctx).
		Preload("Lines").
		Where("transaction_number = ? AND tenant_id = ?", number, tenantID).
		First(&transaction).Error
	if err != nil {
		return nil, err
	}
	return &transaction, nil
}

func (r *transactionRepository) FindAll(ctx context.Context, tenantID uuid.UUID, filter TransactionFilter) ([]models.Transaction, int64, error) {
	var transactions []models.Transaction
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Transaction{}).Where("tenant_id = ?", tenantID)

	if filter.Type != "" {
		query = query.Where("transaction_type = ?", filter.Type)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.FromDate != "" {
		query = query.Where("transaction_date >= ?", filter.FromDate)
	}
	if filter.ToDate != "" {
		query = query.Where("transaction_date <= ?", filter.ToDate)
	}
	if filter.PartyID != nil {
		query = query.Where("party_id = ?", *filter.PartyID)
	}
	if filter.StoreID != nil {
		query = query.Where("store_id = ?", *filter.StoreID)
	}
	if filter.Search != "" {
		searchPattern := "%" + filter.Search + "%"
		query = query.Where("description ILIKE ? OR transaction_number ILIKE ?", searchPattern, searchPattern)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy := filter.SortBy
	if sortBy == "" {
		sortBy = "transaction_date"
	}
	sortOrder := filter.SortOrder
	if sortOrder == "" {
		sortOrder = "desc"
	}
	query = query.Order(sortBy + " " + sortOrder)

	page := filter.Page
	if page < 1 {
		page = 1
	}
	perPage := filter.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	err := query.Offset(offset).Limit(perPage).Find(&transactions).Error
	return transactions, total, err
}

func (r *transactionRepository) GetNextNumber(ctx context.Context, tenantID uuid.UUID, txnType models.TransactionType) (string, error) {
	var count int64
	year := time.Now().Year()

	r.db.WithContext(ctx).Model(&models.Transaction{}).
		Where("tenant_id = ? AND transaction_type = ? AND EXTRACT(YEAR FROM transaction_date) = ?", tenantID, txnType, year).
		Count(&count)

	prefix := "TXN"
	switch txnType {
	case models.TransactionTypeSale:
		prefix = "SAL"
	case models.TransactionTypePurchase:
		prefix = "PUR"
	case models.TransactionTypeReceipt:
		prefix = "REC"
	case models.TransactionTypePayment:
		prefix = "PAY"
	case models.TransactionTypeExpense:
		prefix = "EXP"
	case models.TransactionTypeJournal:
		prefix = "JRN"
	case models.TransactionTypeTransfer:
		prefix = "TRF"
	}

	return fmt.Sprintf("%s-%d-%04d", prefix, year, count+1), nil
}

func (r *transactionRepository) VoidTransaction(ctx context.Context, id, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get transaction with lines
		var transaction models.Transaction
		if err := tx.Preload("Lines").
			Where("id = ? AND tenant_id = ?", id, tenantID).
			First(&transaction).Error; err != nil {
			return err
		}

		// Reverse account balances
		for _, line := range transaction.Lines {
			balanceChange := line.CreditAmount - line.DebitAmount // Reverse
			if err := tx.Model(&models.Account{}).
				Where("id = ?", line.AccountID).
				Update("current_balance", gorm.Expr("current_balance + ?", balanceChange)).Error; err != nil {
				return err
			}
		}

		// Update status to void
		return tx.Model(&transaction).Update("status", models.TransactionStatusVoid).Error
	})
}

func (r *transactionRepository) GetDailySummary(ctx context.Context, tenantID uuid.UUID, date time.Time) (*DailySummary, error) {
	summary := &DailySummary{Date: date}
	dateStr := date.Format("2006-01-02")

	var results []struct {
		Type  string
		Total float64
		Count int
	}

	err := r.db.WithContext(ctx).
		Model(&models.Transaction{}).
		Select("transaction_type as type, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count").
		Where("tenant_id = ? AND transaction_date = ? AND status = ?", tenantID, dateStr, models.TransactionStatusPosted).
		Group("transaction_type").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	for _, r := range results {
		summary.TransactionCount += r.Count
		switch models.TransactionType(r.Type) {
		case models.TransactionTypeSale:
			summary.TotalSales = r.Total
		case models.TransactionTypePurchase:
			summary.TotalPurchases = r.Total
		case models.TransactionTypeExpense:
			summary.TotalExpenses = r.Total
		case models.TransactionTypeReceipt:
			summary.TotalReceipts = r.Total
		case models.TransactionTypePayment:
			summary.TotalPayments = r.Total
		}
	}

	return summary, nil
}

func (r *transactionRepository) GetAccountBalance(ctx context.Context, accountID, tenantID uuid.UUID, asOfDate time.Time) (float64, error) {
	var balance float64

	err := r.db.WithContext(ctx).
		Model(&models.TransactionLine{}).
		Joins("JOIN transactions t ON t.id = transaction_lines.transaction_id").
		Where("transaction_lines.account_id = ? AND t.tenant_id = ? AND t.transaction_date <= ? AND t.status = ?",
			accountID, tenantID, asOfDate, models.TransactionStatusPosted).
		Select("COALESCE(SUM(debit_amount - credit_amount), 0)").
		Scan(&balance).Error

	return balance, err
}
