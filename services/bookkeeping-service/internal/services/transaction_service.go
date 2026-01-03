package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/repository"
)

var (
	ErrTransactionNotFound   = errors.New("transaction not found")
	ErrTransactionNotBalanced = errors.New("transaction is not balanced")
	ErrAccountNotFound       = errors.New("account not found")
	ErrInvalidAmount         = errors.New("invalid amount")
	ErrCannotVoidTransaction = errors.New("cannot void this transaction")
)

// TransactionService defines the interface for transaction business logic
type TransactionService interface {
	CreateTransaction(ctx context.Context, tenantID, userID uuid.UUID, req CreateTransactionRequest) (*models.Transaction, error)
	CreateQuickSale(ctx context.Context, tenantID, userID uuid.UUID, req QuickSaleRequest) (*models.Transaction, error)
	CreateQuickExpense(ctx context.Context, tenantID, userID uuid.UUID, req QuickExpenseRequest) (*models.Transaction, error)
	GetTransaction(ctx context.Context, id, tenantID uuid.UUID) (*models.Transaction, error)
	ListTransactions(ctx context.Context, tenantID uuid.UUID, filter repository.TransactionFilter) ([]models.Transaction, int64, error)
	VoidTransaction(ctx context.Context, id, tenantID uuid.UUID) error
	GetDailySummary(ctx context.Context, tenantID uuid.UUID, date time.Time) (*repository.DailySummary, error)
}

// CreateTransactionRequest represents a request to create a transaction
type CreateTransactionRequest struct {
	TransactionDate   string                   `json:"transaction_date" binding:"required"`
	TransactionType   string                   `json:"transaction_type" binding:"required"`
	PartyID           *uuid.UUID               `json:"party_id"`
	PartyName         string                   `json:"party_name"`
	Description       string                   `json:"description"`
	Notes             string                   `json:"notes"`
	Lines             []TransactionLineRequest `json:"lines" binding:"required,min=2"`
	PaymentMode       string                   `json:"payment_mode"`
	PaymentReference  string                   `json:"payment_reference"`
}

// TransactionLineRequest represents a transaction line in a request
type TransactionLineRequest struct {
	AccountID    uuid.UUID `json:"account_id" binding:"required"`
	Description  string    `json:"description"`
	DebitAmount  float64   `json:"debit_amount"`
	CreditAmount float64   `json:"credit_amount"`
	TaxRateID    *uuid.UUID `json:"tax_rate_id"`
	TaxAmount    float64   `json:"tax_amount"`
}

// QuickSaleRequest represents a simplified sale transaction request
type QuickSaleRequest struct {
	Date             string              `json:"date" binding:"required"`
	CustomerID       *uuid.UUID          `json:"customer_id"`
	CustomerName     string              `json:"customer_name"`
	Items            []QuickSaleItem     `json:"items" binding:"required,min=1"`
	PaymentMode      string              `json:"payment_mode" binding:"required"`
	PaymentReference string              `json:"payment_reference"`
	Notes            string              `json:"notes"`
}

// QuickSaleItem represents an item in a quick sale
type QuickSaleItem struct {
	Description string  `json:"description" binding:"required"`
	Quantity    float64 `json:"quantity" binding:"required"`
	Rate        float64 `json:"rate" binding:"required"`
	TaxRate     float64 `json:"tax_rate"`
}

// QuickExpenseRequest represents a simplified expense transaction request
type QuickExpenseRequest struct {
	Date             string     `json:"date" binding:"required"`
	ExpenseAccountID uuid.UUID  `json:"expense_account_id" binding:"required"`
	Amount           float64    `json:"amount" binding:"required"`
	VendorID         *uuid.UUID `json:"vendor_id"`
	VendorName       string     `json:"vendor_name"`
	Description      string     `json:"description"`
	PaymentMode      string     `json:"payment_mode" binding:"required"`
	PaymentReference string     `json:"payment_reference"`
	Notes            string     `json:"notes"`
}

type transactionService struct {
	transactionRepo repository.TransactionRepository
	accountRepo     repository.AccountRepository
}

// NewTransactionService creates a new transaction service
func NewTransactionService(
	transactionRepo repository.TransactionRepository,
	accountRepo repository.AccountRepository,
) TransactionService {
	return &transactionService{
		transactionRepo: transactionRepo,
		accountRepo:     accountRepo,
	}
}

func (s *transactionService) CreateTransaction(ctx context.Context, tenantID, userID uuid.UUID, req CreateTransactionRequest) (*models.Transaction, error) {
	// Parse date
	txnDate, err := time.Parse("2006-01-02", req.TransactionDate)
	if err != nil {
		return nil, err
	}

	// Get next transaction number
	txnNumber, err := s.transactionRepo.GetNextNumber(ctx, tenantID, models.TransactionType(req.TransactionType))
	if err != nil {
		return nil, err
	}

	// Validate and create lines
	var lines []models.TransactionLine
	var totalDebit, totalCredit float64
	var subtotal float64

	for i, lineReq := range req.Lines {
		// Verify account exists
		account, err := s.accountRepo.FindByID(ctx, lineReq.AccountID, tenantID)
		if err != nil {
			return nil, ErrAccountNotFound
		}

		line := models.TransactionLine{
			AccountID:    lineReq.AccountID,
			Description:  lineReq.Description,
			DebitAmount:  lineReq.DebitAmount,
			CreditAmount: lineReq.CreditAmount,
			TaxRateID:    lineReq.TaxRateID,
			TaxAmount:    lineReq.TaxAmount,
			LineOrder:    i,
		}
		line.Account = account

		lines = append(lines, line)
		totalDebit += lineReq.DebitAmount
		totalCredit += lineReq.CreditAmount

		if lineReq.DebitAmount > 0 {
			subtotal += lineReq.DebitAmount
		}
	}

	// Check if balanced
	if totalDebit != totalCredit {
		return nil, ErrTransactionNotBalanced
	}

	transaction := &models.Transaction{
		TenantID:          tenantID,
		TransactionNumber: txnNumber,
		TransactionDate:   txnDate,
		TransactionType:   models.TransactionType(req.TransactionType),
		PartyID:           req.PartyID,
		PartyName:         req.PartyName,
		Description:       req.Description,
		Notes:             req.Notes,
		Subtotal:          subtotal,
		TotalAmount:       totalDebit,
		PaymentMode:       models.PaymentMode(req.PaymentMode),
		PaymentReference:  req.PaymentReference,
		Status:            models.TransactionStatusPosted,
		Lines:             lines,
		CreatedBy:         userID,
	}

	if err := s.transactionRepo.Create(ctx, transaction); err != nil {
		return nil, err
	}

	return transaction, nil
}

func (s *transactionService) CreateQuickSale(ctx context.Context, tenantID, userID uuid.UUID, req QuickSaleRequest) (*models.Transaction, error) {
	// Parse date
	txnDate, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return nil, err
	}

	// Calculate totals
	var subtotal, taxAmount float64
	for _, item := range req.Items {
		itemTotal := item.Quantity * item.Rate
		subtotal += itemTotal
		if item.TaxRate > 0 {
			taxAmount += itemTotal * (item.TaxRate / 100)
		}
	}
	totalAmount := subtotal + taxAmount

	// Get default accounts
	salesAccount, _ := s.accountRepo.FindByCode(ctx, "4100", tenantID)
	var paymentAccountCode string
	switch req.PaymentMode {
	case "cash":
		paymentAccountCode = "1100"
	case "bank", "upi", "card":
		paymentAccountCode = "1200"
	default:
		paymentAccountCode = "1300" // Accounts Receivable
	}
	paymentAccount, _ := s.accountRepo.FindByCode(ctx, paymentAccountCode, tenantID)

	if salesAccount == nil || paymentAccount == nil {
		return nil, ErrAccountNotFound
	}

	// Get next transaction number
	txnNumber, err := s.transactionRepo.GetNextNumber(ctx, tenantID, models.TransactionTypeSale)
	if err != nil {
		return nil, err
	}

	// Build description
	var description string
	for i, item := range req.Items {
		if i > 0 {
			description += ", "
		}
		description += item.Description
	}

	// Create transaction lines (double-entry)
	lines := []models.TransactionLine{
		{
			AccountID:    paymentAccount.ID,
			Description:  "Payment received",
			DebitAmount:  totalAmount,
			CreditAmount: 0,
			LineOrder:    0,
		},
		{
			AccountID:    salesAccount.ID,
			Description:  "Sales revenue",
			DebitAmount:  0,
			CreditAmount: totalAmount,
			LineOrder:    1,
		},
	}

	transaction := &models.Transaction{
		TenantID:          tenantID,
		TransactionNumber: txnNumber,
		TransactionDate:   txnDate,
		TransactionType:   models.TransactionTypeSale,
		PartyID:           req.CustomerID,
		PartyName:         req.CustomerName,
		PartyType:         "customer",
		Description:       description,
		Notes:             req.Notes,
		Subtotal:          subtotal,
		TaxAmount:         taxAmount,
		TotalAmount:       totalAmount,
		PaymentMode:       models.PaymentMode(req.PaymentMode),
		PaymentReference:  req.PaymentReference,
		Status:            models.TransactionStatusPosted,
		Lines:             lines,
		CreatedBy:         userID,
	}

	if err := s.transactionRepo.Create(ctx, transaction); err != nil {
		return nil, err
	}

	return transaction, nil
}

func (s *transactionService) CreateQuickExpense(ctx context.Context, tenantID, userID uuid.UUID, req QuickExpenseRequest) (*models.Transaction, error) {
	// Parse date
	txnDate, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return nil, err
	}

	if req.Amount <= 0 {
		return nil, ErrInvalidAmount
	}

	// Get expense account
	expenseAccount, err := s.accountRepo.FindByID(ctx, req.ExpenseAccountID, tenantID)
	if err != nil {
		return nil, ErrAccountNotFound
	}

	// Get payment account
	var paymentAccountCode string
	switch req.PaymentMode {
	case "cash":
		paymentAccountCode = "1100"
	case "bank", "upi", "card":
		paymentAccountCode = "1200"
	default:
		paymentAccountCode = "2100" // Accounts Payable
	}
	paymentAccount, _ := s.accountRepo.FindByCode(ctx, paymentAccountCode, tenantID)

	if paymentAccount == nil {
		return nil, ErrAccountNotFound
	}

	// Get next transaction number
	txnNumber, err := s.transactionRepo.GetNextNumber(ctx, tenantID, models.TransactionTypeExpense)
	if err != nil {
		return nil, err
	}

	// Create transaction lines (double-entry)
	lines := []models.TransactionLine{
		{
			AccountID:    expenseAccount.ID,
			Description:  req.Description,
			DebitAmount:  req.Amount,
			CreditAmount: 0,
			LineOrder:    0,
		},
		{
			AccountID:    paymentAccount.ID,
			Description:  "Payment made",
			DebitAmount:  0,
			CreditAmount: req.Amount,
			LineOrder:    1,
		},
	}

	transaction := &models.Transaction{
		TenantID:          tenantID,
		TransactionNumber: txnNumber,
		TransactionDate:   txnDate,
		TransactionType:   models.TransactionTypeExpense,
		PartyID:           req.VendorID,
		PartyName:         req.VendorName,
		PartyType:         "vendor",
		Description:       req.Description,
		Notes:             req.Notes,
		Subtotal:          req.Amount,
		TotalAmount:       req.Amount,
		PaymentMode:       models.PaymentMode(req.PaymentMode),
		PaymentReference:  req.PaymentReference,
		Status:            models.TransactionStatusPosted,
		Lines:             lines,
		CreatedBy:         userID,
	}

	if err := s.transactionRepo.Create(ctx, transaction); err != nil {
		return nil, err
	}

	return transaction, nil
}

func (s *transactionService) GetTransaction(ctx context.Context, id, tenantID uuid.UUID) (*models.Transaction, error) {
	return s.transactionRepo.FindByID(ctx, id, tenantID)
}

func (s *transactionService) ListTransactions(ctx context.Context, tenantID uuid.UUID, filter repository.TransactionFilter) ([]models.Transaction, int64, error) {
	return s.transactionRepo.FindAll(ctx, tenantID, filter)
}

func (s *transactionService) VoidTransaction(ctx context.Context, id, tenantID uuid.UUID) error {
	transaction, err := s.transactionRepo.FindByID(ctx, id, tenantID)
	if err != nil {
		return ErrTransactionNotFound
	}

	if transaction.Status == models.TransactionStatusVoid {
		return ErrCannotVoidTransaction
	}

	return s.transactionRepo.VoidTransaction(ctx, id, tenantID)
}

func (s *transactionService) GetDailySummary(ctx context.Context, tenantID uuid.UUID, date time.Time) (*repository.DailySummary, error) {
	return s.transactionRepo.GetDailySummary(ctx, tenantID, date)
}
