package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/repository"
)

var (
	ErrInvoiceNotFound = errors.New("invoice not found")
	ErrInvalidInvoice  = errors.New("invalid invoice data")
	ErrCannotModify    = errors.New("cannot modify invoice in current status")
)

// InvoiceService handles invoice business logic
type InvoiceService interface {
	Create(ctx context.Context, req CreateInvoiceRequest) (*models.Invoice, error)
	Get(ctx context.Context, id uuid.UUID) (*models.Invoice, error)
	List(ctx context.Context, tenantID uuid.UUID, filters repository.InvoiceFilters) ([]models.Invoice, int64, error)
	Update(ctx context.Context, id uuid.UUID, req UpdateInvoiceRequest) (*models.Invoice, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Send(ctx context.Context, id uuid.UUID) error
	RecordPayment(ctx context.Context, invoiceID uuid.UUID, req RecordPaymentRequest) (*models.Payment, error)
	GenerateEInvoice(ctx context.Context, id uuid.UUID) (*models.Invoice, error)
	CancelEInvoice(ctx context.Context, id uuid.UUID, reason string) error
}

type invoiceService struct {
	invoiceRepo repository.InvoiceRepository
	paymentRepo repository.PaymentRepository
}

// NewInvoiceService creates a new invoice service
func NewInvoiceService(
	invoiceRepo repository.InvoiceRepository,
	paymentRepo repository.PaymentRepository,
) InvoiceService {
	return &invoiceService{
		invoiceRepo: invoiceRepo,
		paymentRepo: paymentRepo,
	}
}

// CreateInvoiceRequest represents a request to create an invoice
type CreateInvoiceRequest struct {
	TenantID        uuid.UUID                `json:"-"`
	CreatedBy       uuid.UUID                `json:"-"`
	CustomerID      uuid.UUID                `json:"customer_id"`
	CustomerName    string                   `json:"customer_name" binding:"required"`
	CustomerGSTIN   string                   `json:"customer_gstin"`
	CustomerAddress string                   `json:"customer_address"`
	CustomerState   string                   `json:"customer_state" binding:"required"`
	CustomerEmail   string                   `json:"customer_email"`
	CustomerPhone   string                   `json:"customer_phone"`
	InvoiceDate     string                   `json:"invoice_date" binding:"required"`
	DueDate         string                   `json:"due_date"`
	Items           []CreateInvoiceItemRequest `json:"items" binding:"required,min=1"`
	DiscountType    string                   `json:"discount_type"`
	DiscountValue   decimal.Decimal          `json:"discount_value"`
	Notes           string                   `json:"notes"`
	Terms           string                   `json:"terms"`
}

// CreateInvoiceItemRequest represents a line item in the invoice
type CreateInvoiceItemRequest struct {
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

// UpdateInvoiceRequest represents a request to update an invoice
type UpdateInvoiceRequest struct {
	CustomerName    string                   `json:"customer_name"`
	CustomerGSTIN   string                   `json:"customer_gstin"`
	CustomerAddress string                   `json:"customer_address"`
	CustomerState   string                   `json:"customer_state"`
	CustomerEmail   string                   `json:"customer_email"`
	CustomerPhone   string                   `json:"customer_phone"`
	DueDate         string                   `json:"due_date"`
	Items           []CreateInvoiceItemRequest `json:"items"`
	DiscountType    string                   `json:"discount_type"`
	DiscountValue   decimal.Decimal          `json:"discount_value"`
	Notes           string                   `json:"notes"`
	Terms           string                   `json:"terms"`
}

// RecordPaymentRequest represents a request to record a payment
type RecordPaymentRequest struct {
	TenantID      uuid.UUID       `json:"-"`
	CreatedBy     uuid.UUID       `json:"-"`
	PaymentDate   string          `json:"payment_date" binding:"required"`
	Amount        decimal.Decimal `json:"amount" binding:"required"`
	PaymentMethod string          `json:"payment_method" binding:"required"`
	Reference     string          `json:"reference"`
	Notes         string          `json:"notes"`
}

func (s *invoiceService) Create(ctx context.Context, req CreateInvoiceRequest) (*models.Invoice, error) {
	invoiceDate, err := time.Parse("2006-01-02", req.InvoiceDate)
	if err != nil {
		return nil, ErrInvalidInvoice
	}

	var dueDate time.Time
	if req.DueDate != "" {
		dueDate, _ = time.Parse("2006-01-02", req.DueDate)
	} else {
		dueDate = invoiceDate.AddDate(0, 0, 30) // Default 30 days
	}

	// Generate invoice number
	prefix := fmt.Sprintf("INV-%s", time.Now().Format("0601"))
	invoiceNumber, err := s.invoiceRepo.GetNextInvoiceNumber(ctx, req.TenantID, prefix)
	if err != nil {
		return nil, err
	}

	invoice := &models.Invoice{
		TenantID:        req.TenantID,
		InvoiceNumber:   invoiceNumber,
		CustomerID:      req.CustomerID,
		CustomerName:    req.CustomerName,
		CustomerGSTIN:   req.CustomerGSTIN,
		CustomerAddress: req.CustomerAddress,
		CustomerState:   req.CustomerState,
		CustomerEmail:   req.CustomerEmail,
		CustomerPhone:   req.CustomerPhone,
		InvoiceDate:     invoiceDate,
		DueDate:         dueDate,
		Status:          models.InvoiceStatusDraft,
		DiscountType:    req.DiscountType,
		DiscountValue:   req.DiscountValue,
		Notes:           req.Notes,
		Terms:           req.Terms,
		CreatedBy:       req.CreatedBy,
	}

	// Create invoice items
	for _, itemReq := range req.Items {
		item := models.InvoiceItem{
			ProductID:   itemReq.ProductID,
			Description: itemReq.Description,
			HSNCode:     itemReq.HSNCode,
			Quantity:    itemReq.Quantity,
			Unit:        itemReq.Unit,
			Rate:        itemReq.Rate,
			CGSTRate:    itemReq.CGSTRate,
			SGSTRate:    itemReq.SGSTRate,
			IGSTRate:    itemReq.IGSTRate,
			CessRate:    itemReq.CessRate,
		}
		item.CalculateAmounts()
		invoice.Items = append(invoice.Items, item)
	}

	invoice.CalculateTotals()

	if err := s.invoiceRepo.Create(ctx, invoice); err != nil {
		return nil, err
	}

	return invoice, nil
}

func (s *invoiceService) Get(ctx context.Context, id uuid.UUID) (*models.Invoice, error) {
	return s.invoiceRepo.GetByID(ctx, id)
}

func (s *invoiceService) List(ctx context.Context, tenantID uuid.UUID, filters repository.InvoiceFilters) ([]models.Invoice, int64, error) {
	return s.invoiceRepo.GetByTenantID(ctx, tenantID, filters)
}

func (s *invoiceService) Update(ctx context.Context, id uuid.UUID, req UpdateInvoiceRequest) (*models.Invoice, error) {
	invoice, err := s.invoiceRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrInvoiceNotFound
	}

	// Only allow updating draft invoices
	if invoice.Status != models.InvoiceStatusDraft {
		return nil, ErrCannotModify
	}

	// Update fields
	if req.CustomerName != "" {
		invoice.CustomerName = req.CustomerName
	}
	if req.CustomerGSTIN != "" {
		invoice.CustomerGSTIN = req.CustomerGSTIN
	}
	if req.CustomerAddress != "" {
		invoice.CustomerAddress = req.CustomerAddress
	}
	if req.CustomerState != "" {
		invoice.CustomerState = req.CustomerState
	}
	if req.CustomerEmail != "" {
		invoice.CustomerEmail = req.CustomerEmail
	}
	if req.CustomerPhone != "" {
		invoice.CustomerPhone = req.CustomerPhone
	}
	if req.DueDate != "" {
		dueDate, _ := time.Parse("2006-01-02", req.DueDate)
		invoice.DueDate = dueDate
	}
	if req.DiscountType != "" {
		invoice.DiscountType = req.DiscountType
	}
	invoice.DiscountValue = req.DiscountValue
	invoice.Notes = req.Notes
	invoice.Terms = req.Terms

	// Update items if provided
	if len(req.Items) > 0 {
		invoice.Items = nil
		for _, itemReq := range req.Items {
			item := models.InvoiceItem{
				InvoiceID:   invoice.ID,
				ProductID:   itemReq.ProductID,
				Description: itemReq.Description,
				HSNCode:     itemReq.HSNCode,
				Quantity:    itemReq.Quantity,
				Unit:        itemReq.Unit,
				Rate:        itemReq.Rate,
				CGSTRate:    itemReq.CGSTRate,
				SGSTRate:    itemReq.SGSTRate,
				IGSTRate:    itemReq.IGSTRate,
				CessRate:    itemReq.CessRate,
			}
			item.CalculateAmounts()
			invoice.Items = append(invoice.Items, item)
		}
	}

	invoice.CalculateTotals()

	if err := s.invoiceRepo.Update(ctx, invoice); err != nil {
		return nil, err
	}

	return invoice, nil
}

func (s *invoiceService) Delete(ctx context.Context, id uuid.UUID) error {
	invoice, err := s.invoiceRepo.GetByID(ctx, id)
	if err != nil {
		return ErrInvoiceNotFound
	}

	// Only allow deleting draft invoices
	if invoice.Status != models.InvoiceStatusDraft {
		return ErrCannotModify
	}

	return s.invoiceRepo.Delete(ctx, id)
}

func (s *invoiceService) Send(ctx context.Context, id uuid.UUID) error {
	invoice, err := s.invoiceRepo.GetByID(ctx, id)
	if err != nil {
		return ErrInvoiceNotFound
	}

	if invoice.Status != models.InvoiceStatusDraft {
		return ErrCannotModify
	}

	invoice.Status = models.InvoiceStatusSent

	return s.invoiceRepo.Update(ctx, invoice)
}

func (s *invoiceService) RecordPayment(ctx context.Context, invoiceID uuid.UUID, req RecordPaymentRequest) (*models.Payment, error) {
	invoice, err := s.invoiceRepo.GetByID(ctx, invoiceID)
	if err != nil {
		return nil, ErrInvoiceNotFound
	}

	paymentDate, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		return nil, ErrInvalidInvoice
	}

	payment := &models.Payment{
		TenantID:      req.TenantID,
		InvoiceID:     invoiceID,
		PaymentDate:   paymentDate,
		Amount:        req.Amount,
		PaymentMethod: req.PaymentMethod,
		Reference:     req.Reference,
		Notes:         req.Notes,
		CreatedBy:     req.CreatedBy,
	}

	if err := s.paymentRepo.Create(ctx, payment); err != nil {
		return nil, err
	}

	// Update invoice amounts
	invoice.AmountPaid = invoice.AmountPaid.Add(req.Amount)
	invoice.BalanceDue = invoice.TotalAmount.Sub(invoice.AmountPaid)

	if invoice.BalanceDue.LessThanOrEqual(decimal.Zero) {
		invoice.Status = models.InvoiceStatusPaid
	} else if invoice.AmountPaid.GreaterThan(decimal.Zero) {
		invoice.Status = models.InvoiceStatusPartial
	}

	if err := s.invoiceRepo.Update(ctx, invoice); err != nil {
		return nil, err
	}

	return payment, nil
}

func (s *invoiceService) GenerateEInvoice(ctx context.Context, id uuid.UUID) (*models.Invoice, error) {
	invoice, err := s.invoiceRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrInvoiceNotFound
	}

	// TODO: Integrate with GST E-Invoice portal
	// This would involve:
	// 1. Building the E-Invoice JSON payload
	// 2. Signing with GSP credentials
	// 3. Calling the IRP API
	// 4. Storing the IRN and QR code

	invoice.EInvoiceStatus = "pending"
	now := time.Now()
	invoice.EInvoiceDate = &now

	if err := s.invoiceRepo.Update(ctx, invoice); err != nil {
		return nil, err
	}

	return invoice, nil
}

func (s *invoiceService) CancelEInvoice(ctx context.Context, id uuid.UUID, reason string) error {
	invoice, err := s.invoiceRepo.GetByID(ctx, id)
	if err != nil {
		return ErrInvoiceNotFound
	}

	if invoice.IRN == "" {
		return errors.New("e-invoice not generated")
	}

	// TODO: Call GST E-Invoice cancellation API

	invoice.EInvoiceStatus = "cancelled"

	return s.invoiceRepo.Update(ctx, invoice)
}
