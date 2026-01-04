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
	ErrRecurringJournalNotFound = errors.New("recurring journal not found")
	ErrInvalidRecurrence        = errors.New("invalid recurrence settings")
	ErrJournalNotBalanced       = errors.New("journal entries must be balanced")
)

// CreateRecurringJournalRequest defines the request for creating a recurring journal
type CreateRecurringJournalRequest struct {
	TenantID        uuid.UUID                    `json:"-"`
	CreatedBy       uuid.UUID                    `json:"-"`
	Name            string                       `json:"name" binding:"required"`
	Description     string                       `json:"description"`
	TransactionType string                       `json:"transaction_type" binding:"required"`
	Frequency       string                       `json:"frequency" binding:"required"`
	IntervalCount   int                          `json:"interval_count"`
	StartDate       time.Time                    `json:"start_date" binding:"required"`
	EndDate         *time.Time                   `json:"end_date"`
	MaxOccurrences  *int                         `json:"max_occurrences"`
	Lines           []RecurringJournalLineReq    `json:"lines" binding:"required,min=2"`
}

// RecurringJournalLineReq defines a line item for recurring journal request
type RecurringJournalLineReq struct {
	AccountID    uuid.UUID `json:"account_id" binding:"required"`
	Description  string    `json:"description"`
	DebitAmount  float64   `json:"debit_amount"`
	CreditAmount float64   `json:"credit_amount"`
}

// UpdateRecurringJournalRequest defines the request for updating a recurring journal
type UpdateRecurringJournalRequest struct {
	Name           string                    `json:"name"`
	Description    string                    `json:"description"`
	Frequency      string                    `json:"frequency"`
	IntervalCount  int                       `json:"interval_count"`
	EndDate        *time.Time                `json:"end_date"`
	MaxOccurrences *int                      `json:"max_occurrences"`
	Lines          []RecurringJournalLineReq `json:"lines"`
}

// RecurringJournalService defines the interface for recurring journal business logic
type RecurringJournalService interface {
	Create(ctx context.Context, req CreateRecurringJournalRequest) (*models.RecurringJournal, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.RecurringJournal, error)
	Update(ctx context.Context, id uuid.UUID, req UpdateRecurringJournalRequest) (*models.RecurringJournal, error)
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, tenantID uuid.UUID, filters repository.RecurringJournalFilters) ([]models.RecurringJournal, int64, error)
	Pause(ctx context.Context, id uuid.UUID) error
	Resume(ctx context.Context, id uuid.UUID) error
	GenerateDueJournals(ctx context.Context) ([]uuid.UUID, error)
	GenerateJournalNow(ctx context.Context, id uuid.UUID) (*models.Transaction, error)
	GetGeneratedJournals(ctx context.Context, recurringID uuid.UUID) ([]models.GeneratedJournal, error)
}

type recurringJournalService struct {
	recurringRepo      repository.RecurringJournalRepository
	transactionService TransactionService
}

// NewRecurringJournalService creates a new recurring journal service
func NewRecurringJournalService(
	recurringRepo repository.RecurringJournalRepository,
	transactionService TransactionService,
) RecurringJournalService {
	return &recurringJournalService{
		recurringRepo:      recurringRepo,
		transactionService: transactionService,
	}
}

func (s *recurringJournalService) Create(ctx context.Context, req CreateRecurringJournalRequest) (*models.RecurringJournal, error) {
	// Validate frequency
	freq := models.RecurrenceFrequency(req.Frequency)
	switch freq {
	case models.FrequencyDaily, models.FrequencyWeekly, models.FrequencyBiweekly,
		models.FrequencyMonthly, models.FrequencyQuarterly, models.FrequencyAnnually:
		// Valid
	default:
		return nil, ErrInvalidRecurrence
	}

	if req.IntervalCount <= 0 {
		req.IntervalCount = 1
	}

	// Validate that lines are balanced
	var totalDebit, totalCredit float64
	for _, line := range req.Lines {
		totalDebit += line.DebitAmount
		totalCredit += line.CreditAmount
	}
	if totalDebit != totalCredit {
		return nil, ErrJournalNotBalanced
	}

	recurring := &models.RecurringJournal{
		TenantID:        req.TenantID,
		Name:            req.Name,
		Description:     req.Description,
		TransactionType: models.TransactionType(req.TransactionType),
		TotalAmount:     totalDebit,
		Frequency:       freq,
		IntervalCount:   req.IntervalCount,
		StartDate:       req.StartDate,
		EndDate:         req.EndDate,
		MaxOccurrences:  req.MaxOccurrences,
		NextRunDate:     req.StartDate,
		Status:          models.RecurringStatusActive,
		CreatedBy:       req.CreatedBy,
	}

	// Create lines
	for i, lineReq := range req.Lines {
		line := models.RecurringJournalLine{
			AccountID:    lineReq.AccountID,
			Description:  lineReq.Description,
			DebitAmount:  lineReq.DebitAmount,
			CreditAmount: lineReq.CreditAmount,
			LineOrder:    i,
		}
		recurring.Lines = append(recurring.Lines, line)
	}

	if err := s.recurringRepo.Create(ctx, recurring); err != nil {
		return nil, err
	}

	return recurring, nil
}

func (s *recurringJournalService) GetByID(ctx context.Context, id uuid.UUID) (*models.RecurringJournal, error) {
	recurring, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrRecurringJournalNotFound
	}
	return recurring, nil
}

func (s *recurringJournalService) Update(ctx context.Context, id uuid.UUID, req UpdateRecurringJournalRequest) (*models.RecurringJournal, error) {
	recurring, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrRecurringJournalNotFound
	}

	if req.Name != "" {
		recurring.Name = req.Name
	}

	if req.Description != "" {
		recurring.Description = req.Description
	}

	if req.Frequency != "" {
		freq := models.RecurrenceFrequency(req.Frequency)
		switch freq {
		case models.FrequencyDaily, models.FrequencyWeekly, models.FrequencyBiweekly,
			models.FrequencyMonthly, models.FrequencyQuarterly, models.FrequencyAnnually:
			recurring.Frequency = freq
		default:
			return nil, ErrInvalidRecurrence
		}
	}

	if req.IntervalCount > 0 {
		recurring.IntervalCount = req.IntervalCount
	}

	if req.EndDate != nil {
		recurring.EndDate = req.EndDate
	}

	if req.MaxOccurrences != nil {
		recurring.MaxOccurrences = req.MaxOccurrences
	}

	// Update lines if provided
	if len(req.Lines) > 0 {
		// Validate that lines are balanced
		var totalDebit, totalCredit float64
		for _, line := range req.Lines {
			totalDebit += line.DebitAmount
			totalCredit += line.CreditAmount
		}
		if totalDebit != totalCredit {
			return nil, ErrJournalNotBalanced
		}

		recurring.Lines = nil
		recurring.TotalAmount = totalDebit
		for i, lineReq := range req.Lines {
			line := models.RecurringJournalLine{
				RecurringJournalID: recurring.ID,
				AccountID:          lineReq.AccountID,
				Description:        lineReq.Description,
				DebitAmount:        lineReq.DebitAmount,
				CreditAmount:       lineReq.CreditAmount,
				LineOrder:          i,
			}
			recurring.Lines = append(recurring.Lines, line)
		}
	}

	if err := s.recurringRepo.Update(ctx, recurring); err != nil {
		return nil, err
	}

	return recurring, nil
}

func (s *recurringJournalService) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return ErrRecurringJournalNotFound
	}
	return s.recurringRepo.Delete(ctx, id)
}

func (s *recurringJournalService) List(ctx context.Context, tenantID uuid.UUID, filters repository.RecurringJournalFilters) ([]models.RecurringJournal, int64, error) {
	return s.recurringRepo.List(ctx, tenantID, filters)
}

func (s *recurringJournalService) Pause(ctx context.Context, id uuid.UUID) error {
	recurring, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return ErrRecurringJournalNotFound
	}

	recurring.Status = models.RecurringStatusPaused
	return s.recurringRepo.Update(ctx, recurring)
}

func (s *recurringJournalService) Resume(ctx context.Context, id uuid.UUID) error {
	recurring, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return ErrRecurringJournalNotFound
	}

	recurring.Status = models.RecurringStatusActive
	if recurring.NextRunDate.Before(time.Now()) {
		recurring.NextRunDate = time.Now()
	}
	return s.recurringRepo.Update(ctx, recurring)
}

func (s *recurringJournalService) GenerateDueJournals(ctx context.Context) ([]uuid.UUID, error) {
	dueRecurring, err := s.recurringRepo.GetDueForGeneration(ctx)
	if err != nil {
		return nil, err
	}

	var generatedIDs []uuid.UUID

	for _, recurring := range dueRecurring {
		transaction, err := s.generateJournalFromRecurring(ctx, &recurring)
		if err != nil {
			continue
		}
		generatedIDs = append(generatedIDs, transaction.ID)
	}

	return generatedIDs, nil
}

func (s *recurringJournalService) GenerateJournalNow(ctx context.Context, id uuid.UUID) (*models.Transaction, error) {
	recurring, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrRecurringJournalNotFound
	}

	return s.generateJournalFromRecurring(ctx, recurring)
}

func (s *recurringJournalService) generateJournalFromRecurring(ctx context.Context, recurring *models.RecurringJournal) (*models.Transaction, error) {
	now := time.Now()

	// Build transaction lines from recurring lines
	var transactionLines []TransactionLineRequest
	for _, line := range recurring.Lines {
		transactionLines = append(transactionLines, TransactionLineRequest{
			AccountID:    line.AccountID,
			Description:  line.Description,
			DebitAmount:  line.DebitAmount,
			CreditAmount: line.CreditAmount,
		})
	}

	// Create the transaction
	createReq := CreateTransactionRequest{
		TransactionDate: now.Format("2006-01-02"),
		TransactionType: string(recurring.TransactionType),
		Description:     recurring.Description,
		Notes:           "Generated from recurring journal: " + recurring.Name,
		Lines:           transactionLines,
	}

	transaction, err := s.transactionService.CreateTransaction(ctx, recurring.TenantID, recurring.CreatedBy, createReq)
	if err != nil {
		return nil, err
	}

	// Record the generated journal
	gen := &models.GeneratedJournal{
		RecurringJournalID: recurring.ID,
		TransactionID:      transaction.ID,
		OccurrenceNumber:   recurring.OccurrenceCount + 1,
		GeneratedAt:        now,
	}
	if err := s.recurringRepo.RecordGeneratedJournal(ctx, gen); err != nil {
		// Log error but don't fail
	}

	// Update recurring journal
	recurring.OccurrenceCount++
	recurring.LastRunDate = &now
	recurring.NextRunDate = recurring.CalculateNextRunDate()

	// Check if we've reached max occurrences
	if recurring.MaxOccurrences != nil && recurring.OccurrenceCount >= *recurring.MaxOccurrences {
		recurring.Status = models.RecurringStatusCompleted
	}

	// Check if we've passed the end date
	if recurring.EndDate != nil && recurring.NextRunDate.After(*recurring.EndDate) {
		recurring.Status = models.RecurringStatusCompleted
	}

	if err := s.recurringRepo.Update(ctx, recurring); err != nil {
		// Log error but don't fail - transaction is already created
	}

	return transaction, nil
}

func (s *recurringJournalService) GetGeneratedJournals(ctx context.Context, recurringID uuid.UUID) ([]models.GeneratedJournal, error) {
	return s.recurringRepo.GetGeneratedJournals(ctx, recurringID)
}
