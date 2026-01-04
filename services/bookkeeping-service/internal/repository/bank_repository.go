package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/models"
	"gorm.io/gorm"
)

// BankRepository handles bank account and bank transaction operations
type BankRepository interface {
	// Bank Accounts
	CreateBankAccount(ctx context.Context, account *models.BankAccount) error
	GetBankAccountByID(ctx context.Context, id uuid.UUID) (*models.BankAccount, error)
	GetBankAccountsByTenant(ctx context.Context, tenantID uuid.UUID) ([]models.BankAccount, error)
	UpdateBankAccount(ctx context.Context, account *models.BankAccount) error
	DeleteBankAccount(ctx context.Context, id uuid.UUID) error

	// Bank Transactions
	CreateBankTransaction(ctx context.Context, tx *models.BankTransaction) error
	CreateBankTransactions(ctx context.Context, txs []models.BankTransaction) error
	GetBankTransactionByID(ctx context.Context, id uuid.UUID) (*models.BankTransaction, error)
	GetBankTransactions(ctx context.Context, bankAccountID uuid.UUID, filters BankTransactionFilters) ([]models.BankTransaction, int64, error)
	GetUnreconciledTransactions(ctx context.Context, bankAccountID uuid.UUID) ([]models.BankTransaction, error)
	ReconcileTransaction(ctx context.Context, bankTxID uuid.UUID, ledgerTxID uuid.UUID, reconciledBy uuid.UUID) error
	UnreconcileTransaction(ctx context.Context, bankTxID uuid.UUID) error
	GetReconciliationSummary(ctx context.Context, bankAccountID uuid.UUID, asOfDate time.Time) (*ReconciliationSummary, error)
}

// BankTransactionFilters for filtering bank transactions
type BankTransactionFilters struct {
	FromDate     string
	ToDate       string
	IsReconciled *bool
	MinAmount    *float64
	MaxAmount    *float64
	SearchTerm   string
	Page         int
	Limit        int
}

// ReconciliationSummary represents the reconciliation status
type ReconciliationSummary struct {
	BankAccountID       uuid.UUID `json:"bank_account_id"`
	BankAccountName     string    `json:"bank_account_name"`
	BankName            string    `json:"bank_name"`
	AsOfDate            time.Time `json:"as_of_date"`
	BankBalance         float64   `json:"bank_balance"`
	LedgerBalance       float64   `json:"ledger_balance"`
	UnreconciledCount   int64     `json:"unreconciled_count"`
	UnreconciledDebits  float64   `json:"unreconciled_debits"`
	UnreconciledCredits float64   `json:"unreconciled_credits"`
	Difference          float64   `json:"difference"`
	IsReconciled        bool      `json:"is_reconciled"`
}

type bankRepository struct {
	db *gorm.DB
}

// NewBankRepository creates a new bank repository
func NewBankRepository(db *gorm.DB) BankRepository {
	return &bankRepository{db: db}
}

// Bank Account methods

func (r *bankRepository) CreateBankAccount(ctx context.Context, account *models.BankAccount) error {
	return r.db.WithContext(ctx).Create(account).Error
}

func (r *bankRepository) GetBankAccountByID(ctx context.Context, id uuid.UUID) (*models.BankAccount, error) {
	var account models.BankAccount
	err := r.db.WithContext(ctx).First(&account, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *bankRepository) GetBankAccountsByTenant(ctx context.Context, tenantID uuid.UUID) ([]models.BankAccount, error) {
	var accounts []models.BankAccount
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND is_active = true", tenantID).
		Order("is_primary DESC, bank_name ASC").
		Find(&accounts).Error
	return accounts, err
}

func (r *bankRepository) UpdateBankAccount(ctx context.Context, account *models.BankAccount) error {
	return r.db.WithContext(ctx).Save(account).Error
}

func (r *bankRepository) DeleteBankAccount(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.BankAccount{}, "id = ?", id).Error
}

// Bank Transaction methods

func (r *bankRepository) CreateBankTransaction(ctx context.Context, tx *models.BankTransaction) error {
	return r.db.WithContext(ctx).Create(tx).Error
}

func (r *bankRepository) CreateBankTransactions(ctx context.Context, txs []models.BankTransaction) error {
	if len(txs) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).CreateInBatches(txs, 100).Error
}

func (r *bankRepository) GetBankTransactionByID(ctx context.Context, id uuid.UUID) (*models.BankTransaction, error) {
	var tx models.BankTransaction
	err := r.db.WithContext(ctx).First(&tx, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *bankRepository) GetBankTransactions(ctx context.Context, bankAccountID uuid.UUID, filters BankTransactionFilters) ([]models.BankTransaction, int64, error) {
	var transactions []models.BankTransaction
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.BankTransaction{}).
		Where("bank_account_id = ?", bankAccountID)

	if filters.FromDate != "" {
		query = query.Where("transaction_date >= ?", filters.FromDate)
	}
	if filters.ToDate != "" {
		query = query.Where("transaction_date <= ?", filters.ToDate)
	}
	if filters.IsReconciled != nil {
		query = query.Where("is_reconciled = ?", *filters.IsReconciled)
	}
	if filters.MinAmount != nil {
		query = query.Where("(debit_amount >= ? OR credit_amount >= ?)", *filters.MinAmount, *filters.MinAmount)
	}
	if filters.MaxAmount != nil {
		query = query.Where("(debit_amount <= ? OR credit_amount <= ?)", *filters.MaxAmount, *filters.MaxAmount)
	}
	if filters.SearchTerm != "" {
		query = query.Where("description ILIKE ? OR reference ILIKE ?", "%"+filters.SearchTerm+"%", "%"+filters.SearchTerm+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (filters.Page - 1) * filters.Limit
	err := query.
		Offset(offset).
		Limit(filters.Limit).
		Order("transaction_date DESC, created_at DESC").
		Find(&transactions).Error

	return transactions, total, err
}

func (r *bankRepository) GetUnreconciledTransactions(ctx context.Context, bankAccountID uuid.UUID) ([]models.BankTransaction, error) {
	var transactions []models.BankTransaction
	err := r.db.WithContext(ctx).
		Where("bank_account_id = ? AND is_reconciled = false", bankAccountID).
		Order("transaction_date DESC").
		Find(&transactions).Error
	return transactions, err
}

func (r *bankRepository) ReconcileTransaction(ctx context.Context, bankTxID uuid.UUID, ledgerTxID uuid.UUID, reconciledBy uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&models.BankTransaction{}).
		Where("id = ?", bankTxID).
		Updates(map[string]interface{}{
			"is_reconciled":              true,
			"reconciled_transaction_id":  ledgerTxID,
			"reconciled_at":              now,
			"reconciled_by":              reconciledBy,
		}).Error
}

func (r *bankRepository) UnreconcileTransaction(ctx context.Context, bankTxID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.BankTransaction{}).
		Where("id = ?", bankTxID).
		Updates(map[string]interface{}{
			"is_reconciled":              false,
			"reconciled_transaction_id":  nil,
			"reconciled_at":              nil,
			"reconciled_by":              nil,
		}).Error
}

func (r *bankRepository) GetReconciliationSummary(ctx context.Context, bankAccountID uuid.UUID, asOfDate time.Time) (*ReconciliationSummary, error) {
	// Get bank account details
	var bankAccount models.BankAccount
	if err := r.db.WithContext(ctx).First(&bankAccount, "id = ?", bankAccountID).Error; err != nil {
		return nil, err
	}

	summary := &ReconciliationSummary{
		BankAccountID:   bankAccountID,
		BankAccountName: bankAccount.AccountName,
		BankName:        bankAccount.BankName,
		AsOfDate:        asOfDate,
		BankBalance:     bankAccount.CurrentBalance,
	}

	// Get unreconciled count and amounts
	var unreconciledStats struct {
		Count   int64
		Debits  float64
		Credits float64
	}
	err := r.db.WithContext(ctx).
		Model(&models.BankTransaction{}).
		Select("COUNT(*) as count, COALESCE(SUM(debit_amount), 0) as debits, COALESCE(SUM(credit_amount), 0) as credits").
		Where("bank_account_id = ? AND is_reconciled = false AND transaction_date <= ?", bankAccountID, asOfDate).
		Scan(&unreconciledStats).Error
	if err != nil {
		return nil, err
	}

	summary.UnreconciledCount = unreconciledStats.Count
	summary.UnreconciledDebits = unreconciledStats.Debits
	summary.UnreconciledCredits = unreconciledStats.Credits

	// Get ledger balance from linked account if available
	if bankAccount.AccountID != nil {
		var account models.Account
		if err := r.db.WithContext(ctx).First(&account, "id = ?", bankAccount.AccountID).Error; err == nil {
			summary.LedgerBalance = account.CurrentBalance
		}
	}

	summary.Difference = summary.BankBalance - summary.LedgerBalance
	summary.IsReconciled = summary.UnreconciledCount == 0 && summary.Difference == 0

	return summary, nil
}
