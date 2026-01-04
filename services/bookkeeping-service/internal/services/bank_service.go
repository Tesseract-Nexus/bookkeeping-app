package services

import (
	"bufio"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/repository"
)

var (
	ErrBankAccountNotFound = errors.New("bank account not found")
	ErrBankTxNotFound      = errors.New("bank transaction not found")
	ErrAlreadyReconciled   = errors.New("transaction already reconciled")
	ErrInvalidCSV          = errors.New("invalid CSV format")
)

// BankService handles bank account and reconciliation business logic
type BankService interface {
	// Bank Accounts
	CreateBankAccount(ctx context.Context, req CreateBankAccountRequest) (*models.BankAccount, error)
	GetBankAccount(ctx context.Context, id uuid.UUID) (*models.BankAccount, error)
	ListBankAccounts(ctx context.Context, tenantID uuid.UUID) ([]models.BankAccount, error)
	UpdateBankAccount(ctx context.Context, id uuid.UUID, req UpdateBankAccountRequest) (*models.BankAccount, error)
	DeleteBankAccount(ctx context.Context, id uuid.UUID) error

	// Bank Transactions & Reconciliation
	ImportBankStatement(ctx context.Context, bankAccountID uuid.UUID, tenantID uuid.UUID, reader io.Reader, format string) (*ImportResult, error)
	GetBankTransactions(ctx context.Context, bankAccountID uuid.UUID, filters repository.BankTransactionFilters) ([]models.BankTransaction, int64, error)
	GetUnreconciledTransactions(ctx context.Context, bankAccountID uuid.UUID) ([]models.BankTransaction, error)
	ReconcileTransaction(ctx context.Context, bankTxID uuid.UUID, ledgerTxID uuid.UUID, userID uuid.UUID) error
	AutoReconcile(ctx context.Context, bankAccountID uuid.UUID, userID uuid.UUID) (*AutoReconcileResult, error)
	UnreconcileTransaction(ctx context.Context, bankTxID uuid.UUID) error
	GetReconciliationSummary(ctx context.Context, bankAccountID uuid.UUID, asOfDate time.Time) (*repository.ReconciliationSummary, error)
	SuggestMatches(ctx context.Context, bankTxID uuid.UUID) ([]MatchSuggestion, error)
}

type bankService struct {
	bankRepo        repository.BankRepository
	transactionRepo repository.TransactionRepository
}

// NewBankService creates a new bank service
func NewBankService(bankRepo repository.BankRepository, transactionRepo repository.TransactionRepository) BankService {
	return &bankService{
		bankRepo:        bankRepo,
		transactionRepo: transactionRepo,
	}
}

// CreateBankAccountRequest for creating a bank account
type CreateBankAccountRequest struct {
	TenantID      uuid.UUID  `json:"-"`
	AccountID     *uuid.UUID `json:"account_id"`
	BankName      string     `json:"bank_name" binding:"required"`
	AccountName   string     `json:"account_name"`
	AccountNumber string     `json:"account_number" binding:"required"`
	IFSCCode      string     `json:"ifsc_code" binding:"required"`
	Branch        string     `json:"branch"`
	AccountType   string     `json:"account_type"` // savings, current, overdraft
	OpeningBalance float64   `json:"opening_balance"`
	IsPrimary     bool       `json:"is_primary"`
}

// UpdateBankAccountRequest for updating a bank account
type UpdateBankAccountRequest struct {
	BankName       string     `json:"bank_name"`
	AccountName    string     `json:"account_name"`
	AccountNumber  string     `json:"account_number"`
	IFSCCode       string     `json:"ifsc_code"`
	Branch         string     `json:"branch"`
	AccountType    string     `json:"account_type"`
	CurrentBalance *float64   `json:"current_balance"`
	IsPrimary      bool       `json:"is_primary"`
	IsActive       bool       `json:"is_active"`
}

// ImportResult represents the result of a bank statement import
type ImportResult struct {
	TotalRows       int   `json:"total_rows"`
	ImportedRows    int   `json:"imported_rows"`
	SkippedRows     int   `json:"skipped_rows"`
	DuplicateRows   int   `json:"duplicate_rows"`
	ErrorRows       int   `json:"error_rows"`
	Errors          []string `json:"errors,omitempty"`
}

// AutoReconcileResult represents the result of auto-reconciliation
type AutoReconcileResult struct {
	MatchedCount    int `json:"matched_count"`
	UnmatchedCount  int `json:"unmatched_count"`
	TotalProcessed  int `json:"total_processed"`
}

// MatchSuggestion represents a suggested match for reconciliation
type MatchSuggestion struct {
	TransactionID uuid.UUID `json:"transaction_id"`
	TransactionNumber string `json:"transaction_number"`
	TransactionDate time.Time `json:"transaction_date"`
	Description     string    `json:"description"`
	Amount          float64   `json:"amount"`
	MatchScore      float64   `json:"match_score"` // 0-100
	MatchReason     string    `json:"match_reason"`
}

// Bank Account methods

func (s *bankService) CreateBankAccount(ctx context.Context, req CreateBankAccountRequest) (*models.BankAccount, error) {
	account := &models.BankAccount{
		TenantID:       req.TenantID,
		AccountID:      req.AccountID,
		BankName:       req.BankName,
		AccountName:    req.AccountName,
		AccountNumber:  req.AccountNumber, // In production, encrypt this
		IFSCCode:       req.IFSCCode,
		Branch:         req.Branch,
		AccountType:    req.AccountType,
		OpeningBalance: req.OpeningBalance,
		CurrentBalance: req.OpeningBalance,
		IsPrimary:      req.IsPrimary,
		IsActive:       true,
	}

	if err := s.bankRepo.CreateBankAccount(ctx, account); err != nil {
		return nil, err
	}

	return account, nil
}

func (s *bankService) GetBankAccount(ctx context.Context, id uuid.UUID) (*models.BankAccount, error) {
	return s.bankRepo.GetBankAccountByID(ctx, id)
}

func (s *bankService) ListBankAccounts(ctx context.Context, tenantID uuid.UUID) ([]models.BankAccount, error) {
	return s.bankRepo.GetBankAccountsByTenant(ctx, tenantID)
}

func (s *bankService) UpdateBankAccount(ctx context.Context, id uuid.UUID, req UpdateBankAccountRequest) (*models.BankAccount, error) {
	account, err := s.bankRepo.GetBankAccountByID(ctx, id)
	if err != nil {
		return nil, ErrBankAccountNotFound
	}

	if req.BankName != "" {
		account.BankName = req.BankName
	}
	if req.AccountName != "" {
		account.AccountName = req.AccountName
	}
	if req.AccountNumber != "" {
		account.AccountNumber = req.AccountNumber
	}
	if req.IFSCCode != "" {
		account.IFSCCode = req.IFSCCode
	}
	if req.Branch != "" {
		account.Branch = req.Branch
	}
	if req.AccountType != "" {
		account.AccountType = req.AccountType
	}
	if req.CurrentBalance != nil {
		account.CurrentBalance = *req.CurrentBalance
	}
	account.IsPrimary = req.IsPrimary
	account.IsActive = req.IsActive

	if err := s.bankRepo.UpdateBankAccount(ctx, account); err != nil {
		return nil, err
	}

	return account, nil
}

func (s *bankService) DeleteBankAccount(ctx context.Context, id uuid.UUID) error {
	_, err := s.bankRepo.GetBankAccountByID(ctx, id)
	if err != nil {
		return ErrBankAccountNotFound
	}
	return s.bankRepo.DeleteBankAccount(ctx, id)
}

// Bank Transaction & Reconciliation methods

func (s *bankService) ImportBankStatement(ctx context.Context, bankAccountID uuid.UUID, tenantID uuid.UUID, reader io.Reader, format string) (*ImportResult, error) {
	result := &ImportResult{}

	// Verify bank account exists
	_, err := s.bankRepo.GetBankAccountByID(ctx, bankAccountID)
	if err != nil {
		return nil, ErrBankAccountNotFound
	}

	// Generate batch ID for this import
	batchID := uuid.New()

	var transactions []models.BankTransaction

	switch strings.ToLower(format) {
	case "csv", "":
		transactions, result, err = s.parseCSVStatement(reader, bankAccountID, tenantID, batchID)
	default:
		return nil, fmt.Errorf("unsupported format: %s", format)
	}

	if err != nil {
		return result, err
	}

	if len(transactions) > 0 {
		if err := s.bankRepo.CreateBankTransactions(ctx, transactions); err != nil {
			return result, err
		}
		result.ImportedRows = len(transactions)
	}

	return result, nil
}

func (s *bankService) parseCSVStatement(reader io.Reader, bankAccountID, tenantID, batchID uuid.UUID) ([]models.BankTransaction, *ImportResult, error) {
	result := &ImportResult{}
	var transactions []models.BankTransaction

	csvReader := csv.NewReader(bufio.NewReader(reader))
	csvReader.TrimLeadingSpace = true
	csvReader.FieldsPerRecord = -1 // Variable number of fields

	// Read header
	header, err := csvReader.Read()
	if err != nil {
		return nil, result, ErrInvalidCSV
	}

	// Map column indices
	colMap := make(map[string]int)
	for i, col := range header {
		colMap[strings.ToLower(strings.TrimSpace(col))] = i
	}

	// Required columns
	dateCol := findColumn(colMap, "date", "transaction date", "txn date", "value date")
	descCol := findColumn(colMap, "description", "narration", "particulars", "remarks")
	debitCol := findColumn(colMap, "debit", "withdrawal", "dr", "debit amount")
	creditCol := findColumn(colMap, "credit", "deposit", "cr", "credit amount")
	balanceCol := findColumn(colMap, "balance", "closing balance", "available balance")
	refCol := findColumn(colMap, "reference", "ref no", "cheque no", "utr")

	if dateCol == -1 || descCol == -1 {
		return nil, result, fmt.Errorf("required columns not found: need at least date and description")
	}

	lineNum := 1
	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.ErrorRows++
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: %v", lineNum, err))
			lineNum++
			continue
		}

		result.TotalRows++
		lineNum++

		// Skip empty rows
		if len(record) < 2 {
			result.SkippedRows++
			continue
		}

		// Parse date
		dateStr := ""
		if dateCol >= 0 && dateCol < len(record) {
			dateStr = strings.TrimSpace(record[dateCol])
		}
		txDate, err := parseDate(dateStr)
		if err != nil {
			result.SkippedRows++
			continue
		}

		// Parse amounts
		var debitAmt, creditAmt, balance float64
		if debitCol >= 0 && debitCol < len(record) {
			debitAmt = parseAmount(record[debitCol])
		}
		if creditCol >= 0 && creditCol < len(record) {
			creditAmt = parseAmount(record[creditCol])
		}
		if balanceCol >= 0 && balanceCol < len(record) {
			balance = parseAmount(record[balanceCol])
		}

		// Get description
		desc := ""
		if descCol >= 0 && descCol < len(record) {
			desc = strings.TrimSpace(record[descCol])
		}

		// Get reference
		ref := ""
		if refCol >= 0 && refCol < len(record) {
			ref = strings.TrimSpace(record[refCol])
		}

		tx := models.BankTransaction{
			BankAccountID:   bankAccountID,
			TenantID:        tenantID,
			TransactionDate: txDate,
			Description:     desc,
			Reference:       ref,
			DebitAmount:     debitAmt,
			CreditAmount:    creditAmt,
			Balance:         balance,
			ImportBatchID:   &batchID,
		}

		transactions = append(transactions, tx)
	}

	return transactions, result, nil
}

func (s *bankService) GetBankTransactions(ctx context.Context, bankAccountID uuid.UUID, filters repository.BankTransactionFilters) ([]models.BankTransaction, int64, error) {
	return s.bankRepo.GetBankTransactions(ctx, bankAccountID, filters)
}

func (s *bankService) GetUnreconciledTransactions(ctx context.Context, bankAccountID uuid.UUID) ([]models.BankTransaction, error) {
	return s.bankRepo.GetUnreconciledTransactions(ctx, bankAccountID)
}

func (s *bankService) ReconcileTransaction(ctx context.Context, bankTxID uuid.UUID, ledgerTxID uuid.UUID, userID uuid.UUID) error {
	bankTx, err := s.bankRepo.GetBankTransactionByID(ctx, bankTxID)
	if err != nil {
		return ErrBankTxNotFound
	}

	if bankTx.IsReconciled {
		return ErrAlreadyReconciled
	}

	return s.bankRepo.ReconcileTransaction(ctx, bankTxID, ledgerTxID, userID)
}

func (s *bankService) AutoReconcile(ctx context.Context, bankAccountID uuid.UUID, userID uuid.UUID) (*AutoReconcileResult, error) {
	result := &AutoReconcileResult{}

	// Get unreconciled bank transactions
	bankTxs, err := s.bankRepo.GetUnreconciledTransactions(ctx, bankAccountID)
	if err != nil {
		return nil, err
	}

	result.TotalProcessed = len(bankTxs)

	// Get bank account to find linked ledger account
	bankAccount, err := s.bankRepo.GetBankAccountByID(ctx, bankAccountID)
	if err != nil {
		return nil, err
	}

	if bankAccount.AccountID == nil {
		return result, nil // No linked ledger account
	}

	for _, bankTx := range bankTxs {
		// Find matching ledger transaction by amount and date
		amount := bankTx.CreditAmount - bankTx.DebitAmount

		// Search for transactions on same date with matching amount
		filters := repository.TransactionFilter{
			FromDate: bankTx.TransactionDate.Format("2006-01-02"),
			ToDate:   bankTx.TransactionDate.Format("2006-01-02"),
			Page:     1,
			PerPage:  100,
		}

		txs, _, err := s.transactionRepo.FindAll(ctx, bankTx.TenantID, filters)
		if err != nil {
			continue
		}

		for _, tx := range txs {
			// Check if any line matches the bank account and amount
			for _, line := range tx.Lines {
				if line.AccountID == *bankAccount.AccountID {
					lineAmount := line.CreditAmount - line.DebitAmount
					if lineAmount == amount {
						// Match found
						if err := s.bankRepo.ReconcileTransaction(ctx, bankTx.ID, tx.ID, userID); err == nil {
							result.MatchedCount++
						}
						break
					}
				}
			}
		}
	}

	result.UnmatchedCount = result.TotalProcessed - result.MatchedCount
	return result, nil
}

func (s *bankService) UnreconcileTransaction(ctx context.Context, bankTxID uuid.UUID) error {
	bankTx, err := s.bankRepo.GetBankTransactionByID(ctx, bankTxID)
	if err != nil {
		return ErrBankTxNotFound
	}

	if !bankTx.IsReconciled {
		return nil // Already unreconciled
	}

	return s.bankRepo.UnreconcileTransaction(ctx, bankTxID)
}

func (s *bankService) GetReconciliationSummary(ctx context.Context, bankAccountID uuid.UUID, asOfDate time.Time) (*repository.ReconciliationSummary, error) {
	return s.bankRepo.GetReconciliationSummary(ctx, bankAccountID, asOfDate)
}

func (s *bankService) SuggestMatches(ctx context.Context, bankTxID uuid.UUID) ([]MatchSuggestion, error) {
	bankTx, err := s.bankRepo.GetBankTransactionByID(ctx, bankTxID)
	if err != nil {
		return nil, ErrBankTxNotFound
	}

	// Get bank account
	bankAccount, err := s.bankRepo.GetBankAccountByID(ctx, bankTx.BankAccountID)
	if err != nil {
		return nil, err
	}

	if bankAccount.AccountID == nil {
		return nil, nil
	}

	var suggestions []MatchSuggestion
	amount := bankTx.CreditAmount - bankTx.DebitAmount

	// Search for transactions within 3 days with similar amount
	startDate := bankTx.TransactionDate.AddDate(0, 0, -3)
	endDate := bankTx.TransactionDate.AddDate(0, 0, 3)

	filters := repository.TransactionFilter{
		FromDate: startDate.Format("2006-01-02"),
		ToDate:   endDate.Format("2006-01-02"),
		Page:     1,
		PerPage:  50,
	}

	txs, _, err := s.transactionRepo.FindAll(ctx, bankTx.TenantID, filters)
	if err != nil {
		return nil, err
	}

	for _, tx := range txs {
		for _, line := range tx.Lines {
			if line.AccountID != *bankAccount.AccountID {
				continue
			}

			lineAmount := line.CreditAmount - line.DebitAmount

			// Calculate match score
			score := 0.0
			reason := ""

			// Exact amount match
			if lineAmount == amount {
				score += 50
				reason = "Exact amount match"
			} else if abs(lineAmount-amount) < 0.01 {
				score += 40
				reason = "Amount match within rounding"
			}

			// Same date
			if tx.TransactionDate.Format("2006-01-02") == bankTx.TransactionDate.Format("2006-01-02") {
				score += 30
				if reason != "" {
					reason += ", same date"
				} else {
					reason = "Same date"
				}
			} else {
				// Within 1 day
				diff := abs(float64(tx.TransactionDate.Sub(bankTx.TransactionDate).Hours() / 24))
				if diff <= 1 {
					score += 20
				}
			}

			// Description similarity
			if strings.Contains(strings.ToLower(tx.Description), strings.ToLower(bankTx.Description)) ||
				strings.Contains(strings.ToLower(bankTx.Description), strings.ToLower(tx.Description)) {
				score += 20
				if reason != "" {
					reason += ", similar description"
				}
			}

			if score > 30 {
				suggestions = append(suggestions, MatchSuggestion{
					TransactionID:     tx.ID,
					TransactionNumber: tx.TransactionNumber,
					TransactionDate:   tx.TransactionDate,
					Description:       tx.Description,
					Amount:            lineAmount,
					MatchScore:        score,
					MatchReason:       reason,
				})
			}
		}
	}

	return suggestions, nil
}

// Helper functions

func findColumn(colMap map[string]int, names ...string) int {
	for _, name := range names {
		if idx, ok := colMap[name]; ok {
			return idx
		}
	}
	return -1
}

func parseDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	formats := []string{
		"2006-01-02",
		"02-01-2006",
		"02/01/2006",
		"01/02/2006",
		"2006/01/02",
		"02-Jan-2006",
		"02 Jan 2006",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, s); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse date: %s", s)
}

func parseAmount(s string) float64 {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, " ", "")

	// Handle negative amounts in parentheses
	if strings.HasPrefix(s, "(") && strings.HasSuffix(s, ")") {
		s = "-" + s[1:len(s)-1]
	}

	amount, _ := strconv.ParseFloat(s, 64)
	return amount
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}
