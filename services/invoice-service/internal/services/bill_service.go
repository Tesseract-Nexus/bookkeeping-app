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
	ErrBillNotFound = errors.New("bill not found")
	ErrInvalidBill  = errors.New("invalid bill data")
	ErrCannotModifyBill = errors.New("cannot modify bill in current status")
)

// BillService handles bill business logic
type BillService interface {
	Create(ctx context.Context, req CreateBillRequest) (*models.Bill, error)
	Get(ctx context.Context, id uuid.UUID) (*models.Bill, error)
	List(ctx context.Context, tenantID uuid.UUID, filters repository.BillFilters) ([]models.Bill, int64, error)
	Update(ctx context.Context, id uuid.UUID, req UpdateBillRequest) (*models.Bill, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Approve(ctx context.Context, id uuid.UUID, approverID uuid.UUID) (*models.Bill, error)
	RecordPayment(ctx context.Context, billID uuid.UUID, req RecordBillPaymentRequest) (*models.BillPayment, error)
	GetOverdueBills(ctx context.Context, tenantID uuid.UUID) ([]models.Bill, error)
	GetPayablesSummary(ctx context.Context, tenantID uuid.UUID) (*repository.PayablesSummary, error)
	MarkOverdue(ctx context.Context, tenantID uuid.UUID) error
}

type billService struct {
	billRepo    repository.BillRepository
	paymentRepo repository.BillPaymentRepository
}

// NewBillService creates a new bill service
func NewBillService(
	billRepo repository.BillRepository,
	paymentRepo repository.BillPaymentRepository,
) BillService {
	return &billService{
		billRepo:    billRepo,
		paymentRepo: paymentRepo,
	}
}

// CreateBillRequest represents a request to create a bill
type CreateBillRequest struct {
	TenantID      uuid.UUID              `json:"-"`
	CreatedBy     uuid.UUID              `json:"-"`
	VendorID      uuid.UUID              `json:"vendor_id" binding:"required"`
	VendorName    string                 `json:"vendor_name" binding:"required"`
	VendorGSTIN   string                 `json:"vendor_gstin"`
	VendorAddress string                 `json:"vendor_address"`
	VendorState   string                 `json:"vendor_state" binding:"required"`
	VendorEmail   string                 `json:"vendor_email"`
	VendorPhone   string                 `json:"vendor_phone"`
	VendorBillNo  string                 `json:"vendor_bill_no"`
	BillDate      string                 `json:"bill_date" binding:"required"`
	DueDate       string                 `json:"due_date"`
	Items         []CreateBillItemRequest `json:"items" binding:"required,min=1"`
	DiscountType  string                 `json:"discount_type"`
	DiscountValue decimal.Decimal        `json:"discount_value"`
	TDSApplicable bool                   `json:"tds_applicable"`
	TDSSection    string                 `json:"tds_section"`
	TDSRate       decimal.Decimal        `json:"tds_rate"`
	ITCEligible   bool                   `json:"itc_eligible"`
	ITCCategory   string                 `json:"itc_category"`
	Notes         string                 `json:"notes"`
}

// CreateBillItemRequest represents a line item in the bill
type CreateBillItemRequest struct {
	ProductID   *uuid.UUID      `json:"product_id"`
	Description string          `json:"description" binding:"required"`
	HSNCode     string          `json:"hsn_code"`
	SACCode     string          `json:"sac_code"`
	Quantity    decimal.Decimal `json:"quantity" binding:"required"`
	Unit        string          `json:"unit"`
	Rate        decimal.Decimal `json:"rate" binding:"required"`
	CGSTRate    decimal.Decimal `json:"cgst_rate"`
	SGSTRate    decimal.Decimal `json:"sgst_rate"`
	IGSTRate    decimal.Decimal `json:"igst_rate"`
	CessRate    decimal.Decimal `json:"cess_rate"`
	ITCEligible bool            `json:"itc_eligible"`
}

// UpdateBillRequest represents a request to update a bill
type UpdateBillRequest struct {
	VendorName    string                 `json:"vendor_name"`
	VendorGSTIN   string                 `json:"vendor_gstin"`
	VendorAddress string                 `json:"vendor_address"`
	VendorState   string                 `json:"vendor_state"`
	VendorEmail   string                 `json:"vendor_email"`
	VendorPhone   string                 `json:"vendor_phone"`
	VendorBillNo  string                 `json:"vendor_bill_no"`
	DueDate       string                 `json:"due_date"`
	Items         []CreateBillItemRequest `json:"items"`
	DiscountType  string                 `json:"discount_type"`
	DiscountValue decimal.Decimal        `json:"discount_value"`
	TDSApplicable bool                   `json:"tds_applicable"`
	TDSSection    string                 `json:"tds_section"`
	TDSRate       decimal.Decimal        `json:"tds_rate"`
	ITCEligible   bool                   `json:"itc_eligible"`
	ITCCategory   string                 `json:"itc_category"`
	Notes         string                 `json:"notes"`
}

// RecordBillPaymentRequest represents a request to record a payment
type RecordBillPaymentRequest struct {
	TenantID      uuid.UUID       `json:"-"`
	CreatedBy     uuid.UUID       `json:"-"`
	PaymentDate   string          `json:"payment_date" binding:"required"`
	Amount        decimal.Decimal `json:"amount" binding:"required"`
	PaymentMethod string          `json:"payment_method" binding:"required"`
	BankAccountID *uuid.UUID      `json:"bank_account_id"`
	Reference     string          `json:"reference"`
	Notes         string          `json:"notes"`
}

func (s *billService) Create(ctx context.Context, req CreateBillRequest) (*models.Bill, error) {
	billDate, err := time.Parse("2006-01-02", req.BillDate)
	if err != nil {
		return nil, ErrInvalidBill
	}

	var dueDate time.Time
	if req.DueDate != "" {
		dueDate, _ = time.Parse("2006-01-02", req.DueDate)
	} else {
		dueDate = billDate.AddDate(0, 0, 30) // Default 30 days
	}

	// Generate bill number
	prefix := fmt.Sprintf("BILL-%s", time.Now().Format("0601"))
	billNumber, err := s.billRepo.GetNextBillNumber(ctx, req.TenantID, prefix)
	if err != nil {
		return nil, err
	}

	bill := &models.Bill{
		TenantID:      req.TenantID,
		BillNumber:    billNumber,
		VendorBillNo:  req.VendorBillNo,
		VendorID:      req.VendorID,
		VendorName:    req.VendorName,
		VendorGSTIN:   req.VendorGSTIN,
		VendorAddress: req.VendorAddress,
		VendorState:   req.VendorState,
		VendorEmail:   req.VendorEmail,
		VendorPhone:   req.VendorPhone,
		BillDate:      billDate,
		DueDate:       dueDate,
		Status:        models.BillStatusDraft,
		DiscountType:  req.DiscountType,
		DiscountValue: req.DiscountValue,
		TDSApplicable: req.TDSApplicable,
		TDSSection:    req.TDSSection,
		TDSRate:       req.TDSRate,
		ITCEligible:   req.ITCEligible,
		ITCCategory:   req.ITCCategory,
		Notes:         req.Notes,
		CreatedBy:     req.CreatedBy,
	}

	// Create bill items
	for _, itemReq := range req.Items {
		item := models.BillItem{
			ProductID:   itemReq.ProductID,
			Description: itemReq.Description,
			HSNCode:     itemReq.HSNCode,
			SACCode:     itemReq.SACCode,
			Quantity:    itemReq.Quantity,
			Unit:        itemReq.Unit,
			Rate:        itemReq.Rate,
			CGSTRate:    itemReq.CGSTRate,
			SGSTRate:    itemReq.SGSTRate,
			IGSTRate:    itemReq.IGSTRate,
			CessRate:    itemReq.CessRate,
			ITCEligible: itemReq.ITCEligible,
		}
		item.CalculateAmounts()
		bill.Items = append(bill.Items, item)
	}

	bill.CalculateTotals()

	if err := s.billRepo.Create(ctx, bill); err != nil {
		return nil, err
	}

	return bill, nil
}

func (s *billService) Get(ctx context.Context, id uuid.UUID) (*models.Bill, error) {
	return s.billRepo.GetByID(ctx, id)
}

func (s *billService) List(ctx context.Context, tenantID uuid.UUID, filters repository.BillFilters) ([]models.Bill, int64, error) {
	return s.billRepo.GetByTenantID(ctx, tenantID, filters)
}

func (s *billService) Update(ctx context.Context, id uuid.UUID, req UpdateBillRequest) (*models.Bill, error) {
	bill, err := s.billRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrBillNotFound
	}

	// Only allow updating draft or pending bills
	if bill.Status != models.BillStatusDraft && bill.Status != models.BillStatusPending {
		return nil, ErrCannotModifyBill
	}

	// Update fields
	if req.VendorName != "" {
		bill.VendorName = req.VendorName
	}
	if req.VendorGSTIN != "" {
		bill.VendorGSTIN = req.VendorGSTIN
	}
	if req.VendorAddress != "" {
		bill.VendorAddress = req.VendorAddress
	}
	if req.VendorState != "" {
		bill.VendorState = req.VendorState
	}
	if req.VendorEmail != "" {
		bill.VendorEmail = req.VendorEmail
	}
	if req.VendorPhone != "" {
		bill.VendorPhone = req.VendorPhone
	}
	if req.VendorBillNo != "" {
		bill.VendorBillNo = req.VendorBillNo
	}
	if req.DueDate != "" {
		dueDate, _ := time.Parse("2006-01-02", req.DueDate)
		bill.DueDate = dueDate
	}
	if req.DiscountType != "" {
		bill.DiscountType = req.DiscountType
	}
	bill.DiscountValue = req.DiscountValue
	bill.TDSApplicable = req.TDSApplicable
	bill.TDSSection = req.TDSSection
	bill.TDSRate = req.TDSRate
	bill.ITCEligible = req.ITCEligible
	bill.ITCCategory = req.ITCCategory
	bill.Notes = req.Notes

	// Update items if provided
	if len(req.Items) > 0 {
		bill.Items = nil
		for _, itemReq := range req.Items {
			item := models.BillItem{
				BillID:      bill.ID,
				ProductID:   itemReq.ProductID,
				Description: itemReq.Description,
				HSNCode:     itemReq.HSNCode,
				SACCode:     itemReq.SACCode,
				Quantity:    itemReq.Quantity,
				Unit:        itemReq.Unit,
				Rate:        itemReq.Rate,
				CGSTRate:    itemReq.CGSTRate,
				SGSTRate:    itemReq.SGSTRate,
				IGSTRate:    itemReq.IGSTRate,
				CessRate:    itemReq.CessRate,
				ITCEligible: itemReq.ITCEligible,
			}
			item.CalculateAmounts()
			bill.Items = append(bill.Items, item)
		}
	}

	bill.CalculateTotals()

	if err := s.billRepo.Update(ctx, bill); err != nil {
		return nil, err
	}

	return bill, nil
}

func (s *billService) Delete(ctx context.Context, id uuid.UUID) error {
	bill, err := s.billRepo.GetByID(ctx, id)
	if err != nil {
		return ErrBillNotFound
	}

	// Only allow deleting draft bills
	if bill.Status != models.BillStatusDraft {
		return ErrCannotModifyBill
	}

	return s.billRepo.Delete(ctx, id)
}

func (s *billService) Approve(ctx context.Context, id uuid.UUID, approverID uuid.UUID) (*models.Bill, error) {
	bill, err := s.billRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrBillNotFound
	}

	if bill.Status != models.BillStatusDraft && bill.Status != models.BillStatusPending {
		return nil, ErrCannotModifyBill
	}

	bill.Status = models.BillStatusApproved
	bill.ApprovedBy = &approverID
	now := time.Now()
	bill.ApprovedAt = &now

	if err := s.billRepo.Update(ctx, bill); err != nil {
		return nil, err
	}

	return bill, nil
}

func (s *billService) RecordPayment(ctx context.Context, billID uuid.UUID, req RecordBillPaymentRequest) (*models.BillPayment, error) {
	bill, err := s.billRepo.GetByID(ctx, billID)
	if err != nil {
		return nil, ErrBillNotFound
	}

	paymentDate, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		return nil, ErrInvalidBill
	}

	// Generate payment number
	paymentNumber := fmt.Sprintf("PAY-%s-%05d", time.Now().Format("060102"), time.Now().UnixNano()%100000)

	payment := &models.BillPayment{
		TenantID:      req.TenantID,
		BillID:        billID,
		PaymentNumber: paymentNumber,
		PaymentDate:   paymentDate,
		Amount:        req.Amount,
		PaymentMethod: req.PaymentMethod,
		BankAccountID: req.BankAccountID,
		Reference:     req.Reference,
		Notes:         req.Notes,
		CreatedBy:     req.CreatedBy,
	}

	if err := s.paymentRepo.Create(ctx, payment); err != nil {
		return nil, err
	}

	// Update bill amounts
	bill.AmountPaid = bill.AmountPaid.Add(req.Amount)
	bill.BalanceDue = bill.TotalAmount.Sub(bill.AmountPaid)

	if bill.BalanceDue.LessThanOrEqual(decimal.Zero) {
		bill.Status = models.BillStatusPaid
	} else if bill.AmountPaid.GreaterThan(decimal.Zero) {
		bill.Status = models.BillStatusPartial
	}

	if err := s.billRepo.Update(ctx, bill); err != nil {
		return nil, err
	}

	return payment, nil
}

func (s *billService) GetOverdueBills(ctx context.Context, tenantID uuid.UUID) ([]models.Bill, error) {
	return s.billRepo.GetOverdueBills(ctx, tenantID)
}

func (s *billService) GetPayablesSummary(ctx context.Context, tenantID uuid.UUID) (*repository.PayablesSummary, error) {
	return s.billRepo.GetPayablesSummary(ctx, tenantID)
}

func (s *billService) MarkOverdue(ctx context.Context, tenantID uuid.UUID) error {
	bills, err := s.billRepo.GetOverdueBills(ctx, tenantID)
	if err != nil {
		return err
	}

	for _, bill := range bills {
		if bill.Status != models.BillStatusOverdue {
			bill.Status = models.BillStatusOverdue
			if err := s.billRepo.Update(ctx, &bill); err != nil {
				return err
			}
		}
	}

	return nil
}
