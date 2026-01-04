package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/repository"
)

var (
	ErrRecurringInvoiceNotFound = errors.New("recurring invoice not found")
	ErrInvalidRecurrence        = errors.New("invalid recurrence settings")
)

// CreateRecurringInvoiceRequest defines the request for creating a recurring invoice
type CreateRecurringInvoiceRequest struct {
	TenantID        uuid.UUID                 `json:"-"`
	CreatedBy       uuid.UUID                 `json:"-"`
	Name            string                    `json:"name" binding:"required"`
	CustomerID      uuid.UUID                 `json:"customer_id" binding:"required"`
	CustomerName    string                    `json:"customer_name"`
	CustomerGSTIN   string                    `json:"customer_gstin"`
	CustomerAddress string                    `json:"customer_address"`
	CustomerState   string                    `json:"customer_state"`
	CustomerEmail   string                    `json:"customer_email"`
	CustomerPhone   string                    `json:"customer_phone"`
	Frequency       string                    `json:"frequency" binding:"required"`
	IntervalCount   int                       `json:"interval_count"`
	StartDate       time.Time                 `json:"start_date" binding:"required"`
	EndDate         *time.Time                `json:"end_date"`
	MaxOccurrences  *int                      `json:"max_occurrences"`
	DaysUntilDue    int                       `json:"days_until_due"`
	AutoSend        bool                      `json:"auto_send"`
	Items           []RecurringInvoiceItemReq `json:"items" binding:"required,min=1"`
	DiscountType    string                    `json:"discount_type"`
	DiscountValue   decimal.Decimal           `json:"discount_value"`
	Notes           string                    `json:"notes"`
	Terms           string                    `json:"terms"`
}

// RecurringInvoiceItemReq defines a line item for recurring invoice request
type RecurringInvoiceItemReq struct {
	ProductID   *uuid.UUID      `json:"product_id"`
	Description string          `json:"description" binding:"required"`
	HSNCode     string          `json:"hsn_code"`
	Quantity    decimal.Decimal `json:"quantity" binding:"required"`
	Unit        string          `json:"unit"`
	Rate        decimal.Decimal `json:"rate" binding:"required"`
	CGSTRate    decimal.Decimal `json:"cgst_rate"`
	SGSTRate    decimal.Decimal `json:"sgst_rate"`
	IGSTRate    decimal.Decimal `json:"igst_rate"`
	CessRate    decimal.Decimal `json:"cess_rate"`
}

// UpdateRecurringInvoiceRequest defines the request for updating a recurring invoice
type UpdateRecurringInvoiceRequest struct {
	Name           string                    `json:"name"`
	Frequency      string                    `json:"frequency"`
	IntervalCount  int                       `json:"interval_count"`
	EndDate        *time.Time                `json:"end_date"`
	MaxOccurrences *int                      `json:"max_occurrences"`
	DaysUntilDue   int                       `json:"days_until_due"`
	AutoSend       *bool                     `json:"auto_send"`
	Items          []RecurringInvoiceItemReq `json:"items"`
	DiscountType   string                    `json:"discount_type"`
	DiscountValue  *decimal.Decimal          `json:"discount_value"`
	Notes          string                    `json:"notes"`
	Terms          string                    `json:"terms"`
}

// RecurringInvoiceService defines the interface for recurring invoice business logic
type RecurringInvoiceService interface {
	Create(ctx context.Context, req CreateRecurringInvoiceRequest) (*models.RecurringInvoice, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.RecurringInvoice, error)
	Update(ctx context.Context, id uuid.UUID, req UpdateRecurringInvoiceRequest) (*models.RecurringInvoice, error)
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, tenantID uuid.UUID, filters repository.RecurringInvoiceFilters) ([]models.RecurringInvoice, int64, error)
	Pause(ctx context.Context, id uuid.UUID) error
	Resume(ctx context.Context, id uuid.UUID) error
	GenerateDueInvoices(ctx context.Context) ([]uuid.UUID, error)
	GenerateInvoiceNow(ctx context.Context, id uuid.UUID) (*models.Invoice, error)
	GetGeneratedInvoices(ctx context.Context, recurringID uuid.UUID) ([]models.GeneratedInvoice, error)
}

type recurringInvoiceService struct {
	recurringRepo  repository.RecurringInvoiceRepository
	invoiceRepo    repository.InvoiceRepository
	invoiceService InvoiceService
}

// NewRecurringInvoiceService creates a new recurring invoice service
func NewRecurringInvoiceService(
	recurringRepo repository.RecurringInvoiceRepository,
	invoiceRepo repository.InvoiceRepository,
	invoiceService InvoiceService,
) RecurringInvoiceService {
	return &recurringInvoiceService{
		recurringRepo:  recurringRepo,
		invoiceRepo:    invoiceRepo,
		invoiceService: invoiceService,
	}
}

func (s *recurringInvoiceService) Create(ctx context.Context, req CreateRecurringInvoiceRequest) (*models.RecurringInvoice, error) {
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

	if req.DaysUntilDue <= 0 {
		req.DaysUntilDue = 30
	}

	recurring := &models.RecurringInvoice{
		TenantID:        req.TenantID,
		Name:            req.Name,
		CustomerID:      req.CustomerID,
		CustomerName:    req.CustomerName,
		CustomerGSTIN:   req.CustomerGSTIN,
		CustomerAddress: req.CustomerAddress,
		CustomerState:   req.CustomerState,
		CustomerEmail:   req.CustomerEmail,
		CustomerPhone:   req.CustomerPhone,
		Frequency:       freq,
		IntervalCount:   req.IntervalCount,
		StartDate:       req.StartDate,
		EndDate:         req.EndDate,
		MaxOccurrences:  req.MaxOccurrences,
		NextRunDate:     req.StartDate,
		DaysUntilDue:    req.DaysUntilDue,
		Status:          models.RecurringStatusActive,
		AutoSend:        req.AutoSend,
		DiscountType:    req.DiscountType,
		DiscountValue:   req.DiscountValue,
		Notes:           req.Notes,
		Terms:           req.Terms,
		CreatedBy:       req.CreatedBy,
	}

	// Create items
	for _, itemReq := range req.Items {
		unit := itemReq.Unit
		if unit == "" {
			unit = "pcs"
		}

		item := models.RecurringInvoiceItem{
			ProductID:   itemReq.ProductID,
			Description: itemReq.Description,
			HSNCode:     itemReq.HSNCode,
			Quantity:    itemReq.Quantity,
			Unit:        unit,
			Rate:        itemReq.Rate,
			CGSTRate:    itemReq.CGSTRate,
			SGSTRate:    itemReq.SGSTRate,
			IGSTRate:    itemReq.IGSTRate,
			CessRate:    itemReq.CessRate,
		}
		item.CalculateAmounts()
		recurring.Items = append(recurring.Items, item)
	}

	recurring.CalculateTotals()

	if err := s.recurringRepo.Create(ctx, recurring); err != nil {
		return nil, err
	}

	return recurring, nil
}

func (s *recurringInvoiceService) GetByID(ctx context.Context, id uuid.UUID) (*models.RecurringInvoice, error) {
	recurring, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrRecurringInvoiceNotFound
	}
	return recurring, nil
}

func (s *recurringInvoiceService) Update(ctx context.Context, id uuid.UUID, req UpdateRecurringInvoiceRequest) (*models.RecurringInvoice, error) {
	recurring, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrRecurringInvoiceNotFound
	}

	if req.Name != "" {
		recurring.Name = req.Name
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

	if req.DaysUntilDue > 0 {
		recurring.DaysUntilDue = req.DaysUntilDue
	}

	if req.AutoSend != nil {
		recurring.AutoSend = *req.AutoSend
	}

	if req.DiscountType != "" {
		recurring.DiscountType = req.DiscountType
	}

	if req.DiscountValue != nil {
		recurring.DiscountValue = *req.DiscountValue
	}

	if req.Notes != "" {
		recurring.Notes = req.Notes
	}

	if req.Terms != "" {
		recurring.Terms = req.Terms
	}

	// Update items if provided
	if len(req.Items) > 0 {
		recurring.Items = nil
		for _, itemReq := range req.Items {
			unit := itemReq.Unit
			if unit == "" {
				unit = "pcs"
			}

			item := models.RecurringInvoiceItem{
				RecurringInvoiceID: recurring.ID,
				ProductID:          itemReq.ProductID,
				Description:        itemReq.Description,
				HSNCode:            itemReq.HSNCode,
				Quantity:           itemReq.Quantity,
				Unit:               unit,
				Rate:               itemReq.Rate,
				CGSTRate:           itemReq.CGSTRate,
				SGSTRate:           itemReq.SGSTRate,
				IGSTRate:           itemReq.IGSTRate,
				CessRate:           itemReq.CessRate,
			}
			item.CalculateAmounts()
			recurring.Items = append(recurring.Items, item)
		}
		recurring.CalculateTotals()
	}

	if err := s.recurringRepo.Update(ctx, recurring); err != nil {
		return nil, err
	}

	return recurring, nil
}

func (s *recurringInvoiceService) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return ErrRecurringInvoiceNotFound
	}
	return s.recurringRepo.Delete(ctx, id)
}

func (s *recurringInvoiceService) List(ctx context.Context, tenantID uuid.UUID, filters repository.RecurringInvoiceFilters) ([]models.RecurringInvoice, int64, error) {
	return s.recurringRepo.List(ctx, tenantID, filters)
}

func (s *recurringInvoiceService) Pause(ctx context.Context, id uuid.UUID) error {
	recurring, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return ErrRecurringInvoiceNotFound
	}

	recurring.Status = models.RecurringStatusPaused
	return s.recurringRepo.Update(ctx, recurring)
}

func (s *recurringInvoiceService) Resume(ctx context.Context, id uuid.UUID) error {
	recurring, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return ErrRecurringInvoiceNotFound
	}

	recurring.Status = models.RecurringStatusActive
	// Recalculate next run date if it's in the past
	if recurring.NextRunDate.Before(time.Now()) {
		recurring.NextRunDate = time.Now()
	}
	return s.recurringRepo.Update(ctx, recurring)
}

func (s *recurringInvoiceService) GenerateDueInvoices(ctx context.Context) ([]uuid.UUID, error) {
	dueRecurring, err := s.recurringRepo.GetDueForGeneration(ctx)
	if err != nil {
		return nil, err
	}

	var generatedIDs []uuid.UUID

	for _, recurring := range dueRecurring {
		invoice, err := s.generateInvoiceFromRecurring(ctx, &recurring)
		if err != nil {
			// Log error but continue with other recurring invoices
			continue
		}
		generatedIDs = append(generatedIDs, invoice.ID)
	}

	return generatedIDs, nil
}

func (s *recurringInvoiceService) GenerateInvoiceNow(ctx context.Context, id uuid.UUID) (*models.Invoice, error) {
	recurring, err := s.recurringRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrRecurringInvoiceNotFound
	}

	return s.generateInvoiceFromRecurring(ctx, recurring)
}

func (s *recurringInvoiceService) generateInvoiceFromRecurring(ctx context.Context, recurring *models.RecurringInvoice) (*models.Invoice, error) {
	now := time.Now()
	dueDate := now.AddDate(0, 0, recurring.DaysUntilDue)

	// Create invoice items from recurring items
	var invoiceItems []CreateInvoiceItemRequest
	for _, item := range recurring.Items {
		invoiceItems = append(invoiceItems, CreateInvoiceItemRequest{
			ProductID:   item.ProductID,
			Description: item.Description,
			HSNCode:     item.HSNCode,
			Quantity:    item.Quantity,
			Unit:        item.Unit,
			Rate:        item.Rate,
			CGSTRate:    item.CGSTRate,
			SGSTRate:    item.SGSTRate,
			IGSTRate:    item.IGSTRate,
			CessRate:    item.CessRate,
		})
	}

	// Create the invoice
	createReq := CreateInvoiceRequest{
		TenantID:        recurring.TenantID,
		CreatedBy:       recurring.CreatedBy,
		CustomerID:      recurring.CustomerID,
		CustomerName:    recurring.CustomerName,
		CustomerGSTIN:   recurring.CustomerGSTIN,
		CustomerAddress: recurring.CustomerAddress,
		CustomerState:   recurring.CustomerState,
		CustomerEmail:   recurring.CustomerEmail,
		CustomerPhone:   recurring.CustomerPhone,
		InvoiceDate:     now.Format("2006-01-02"),
		DueDate:         dueDate.Format("2006-01-02"),
		Items:           invoiceItems,
		DiscountType:    recurring.DiscountType,
		DiscountValue:   recurring.DiscountValue,
		Notes:           recurring.Notes,
		Terms:           recurring.Terms,
	}

	invoice, err := s.invoiceService.Create(ctx, createReq)
	if err != nil {
		return nil, err
	}

	// Record the generated invoice
	gen := &models.GeneratedInvoice{
		RecurringInvoiceID: recurring.ID,
		InvoiceID:          invoice.ID,
		OccurrenceNumber:   recurring.OccurrenceCount + 1,
		GeneratedAt:        now,
	}
	if err := s.recurringRepo.RecordGeneratedInvoice(ctx, gen); err != nil {
		// Log error but don't fail the invoice generation
	}

	// Update recurring invoice
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
		// Log error but don't fail - invoice is already created
	}

	// Auto-send if enabled
	if recurring.AutoSend && recurring.CustomerEmail != "" {
		_ = s.invoiceService.Send(ctx, invoice.ID)
	}

	return invoice, nil
}

func (s *recurringInvoiceService) GetGeneratedInvoices(ctx context.Context, recurringID uuid.UUID) ([]models.GeneratedInvoice, error) {
	return s.recurringRepo.GetGeneratedInvoices(ctx, recurringID)
}
