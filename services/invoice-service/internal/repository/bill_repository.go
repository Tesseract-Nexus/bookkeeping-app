package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/models"
	"gorm.io/gorm"
)

// BillRepository handles bill data operations
type BillRepository interface {
	Create(ctx context.Context, bill *models.Bill) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Bill, error)
	GetByTenantID(ctx context.Context, tenantID uuid.UUID, filters BillFilters) ([]models.Bill, int64, error)
	Update(ctx context.Context, bill *models.Bill) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetNextBillNumber(ctx context.Context, tenantID uuid.UUID, prefix string) (string, error)
	GetOverdueBills(ctx context.Context, tenantID uuid.UUID) ([]models.Bill, error)
	GetPayablesSummary(ctx context.Context, tenantID uuid.UUID) (*PayablesSummary, error)
}

// BillFilters represents filters for listing bills
type BillFilters struct {
	Status    string
	VendorID  uuid.UUID
	FromDate  string
	ToDate    string
	Overdue   bool
	Page      int
	Limit     int
}

// PayablesSummary represents a summary of payables
type PayablesSummary struct {
	TotalPayables      float64 `json:"total_payables"`
	OverduePayables    float64 `json:"overdue_payables"`
	DueThisWeek        float64 `json:"due_this_week"`
	DueThisMonth       float64 `json:"due_this_month"`
	BillCount          int64   `json:"bill_count"`
	OverdueBillCount   int64   `json:"overdue_bill_count"`
}

type billRepository struct {
	db *gorm.DB
}

// NewBillRepository creates a new bill repository
func NewBillRepository(db *gorm.DB) BillRepository {
	return &billRepository{db: db}
}

func (r *billRepository) Create(ctx context.Context, bill *models.Bill) error {
	return r.db.WithContext(ctx).Create(bill).Error
}

func (r *billRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Bill, error) {
	var bill models.Bill
	err := r.db.WithContext(ctx).
		Preload("Items").
		Preload("Payments").
		First(&bill, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &bill, nil
}

func (r *billRepository) GetByTenantID(ctx context.Context, tenantID uuid.UUID, filters BillFilters) ([]models.Bill, int64, error) {
	var bills []models.Bill
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Bill{}).
		Where("tenant_id = ?", tenantID)

	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.VendorID != uuid.Nil {
		query = query.Where("vendor_id = ?", filters.VendorID)
	}
	if filters.FromDate != "" {
		query = query.Where("bill_date >= ?", filters.FromDate)
	}
	if filters.ToDate != "" {
		query = query.Where("bill_date <= ?", filters.ToDate)
	}
	if filters.Overdue {
		query = query.Where("due_date < ? AND status NOT IN ('paid', 'cancelled')", time.Now())
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (filters.Page - 1) * filters.Limit
	err := query.
		Preload("Items").
		Offset(offset).
		Limit(filters.Limit).
		Order("due_date ASC, created_at DESC").
		Find(&bills).Error

	return bills, total, err
}

func (r *billRepository) Update(ctx context.Context, bill *models.Bill) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete existing items
		if err := tx.Where("bill_id = ?", bill.ID).Delete(&models.BillItem{}).Error; err != nil {
			return err
		}

		// Save bill with new items
		return tx.Save(bill).Error
	})
}

func (r *billRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Bill{}, "id = ?", id).Error
}

func (r *billRepository) GetNextBillNumber(ctx context.Context, tenantID uuid.UUID, prefix string) (string, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Bill{}).
		Where("tenant_id = ? AND bill_number LIKE ?", tenantID, prefix+"%").
		Count(&count).Error
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s-%05d", prefix, count+1), nil
}

func (r *billRepository) GetOverdueBills(ctx context.Context, tenantID uuid.UUID) ([]models.Bill, error) {
	var bills []models.Bill
	err := r.db.WithContext(ctx).
		Preload("Items").
		Where("tenant_id = ? AND due_date < ? AND status NOT IN ('paid', 'cancelled')", tenantID, time.Now()).
		Order("due_date ASC").
		Find(&bills).Error
	return bills, err
}

func (r *billRepository) GetPayablesSummary(ctx context.Context, tenantID uuid.UUID) (*PayablesSummary, error) {
	now := time.Now()
	endOfWeek := now.AddDate(0, 0, 7)
	endOfMonth := now.AddDate(0, 1, 0)

	summary := &PayablesSummary{}

	// Total payables
	var totalPayables struct {
		Total float64
		Count int64
	}
	err := r.db.WithContext(ctx).
		Model(&models.Bill{}).
		Select("COALESCE(SUM(balance_due), 0) as total, COUNT(*) as count").
		Where("tenant_id = ? AND status NOT IN ('paid', 'cancelled')", tenantID).
		Scan(&totalPayables).Error
	if err != nil {
		return nil, err
	}
	summary.TotalPayables = totalPayables.Total
	summary.BillCount = totalPayables.Count

	// Overdue payables
	var overduePayables struct {
		Total float64
		Count int64
	}
	err = r.db.WithContext(ctx).
		Model(&models.Bill{}).
		Select("COALESCE(SUM(balance_due), 0) as total, COUNT(*) as count").
		Where("tenant_id = ? AND due_date < ? AND status NOT IN ('paid', 'cancelled')", tenantID, now).
		Scan(&overduePayables).Error
	if err != nil {
		return nil, err
	}
	summary.OverduePayables = overduePayables.Total
	summary.OverdueBillCount = overduePayables.Count

	// Due this week
	err = r.db.WithContext(ctx).
		Model(&models.Bill{}).
		Select("COALESCE(SUM(balance_due), 0)").
		Where("tenant_id = ? AND due_date BETWEEN ? AND ? AND status NOT IN ('paid', 'cancelled')", tenantID, now, endOfWeek).
		Scan(&summary.DueThisWeek).Error
	if err != nil {
		return nil, err
	}

	// Due this month
	err = r.db.WithContext(ctx).
		Model(&models.Bill{}).
		Select("COALESCE(SUM(balance_due), 0)").
		Where("tenant_id = ? AND due_date BETWEEN ? AND ? AND status NOT IN ('paid', 'cancelled')", tenantID, now, endOfMonth).
		Scan(&summary.DueThisMonth).Error
	if err != nil {
		return nil, err
	}

	return summary, nil
}

// BillPaymentRepository handles bill payment operations
type BillPaymentRepository interface {
	Create(ctx context.Context, payment *models.BillPayment) error
	GetByBillID(ctx context.Context, billID uuid.UUID) ([]models.BillPayment, error)
}

type billPaymentRepository struct {
	db *gorm.DB
}

// NewBillPaymentRepository creates a new bill payment repository
func NewBillPaymentRepository(db *gorm.DB) BillPaymentRepository {
	return &billPaymentRepository{db: db}
}

func (r *billPaymentRepository) Create(ctx context.Context, payment *models.BillPayment) error {
	return r.db.WithContext(ctx).Create(payment).Error
}

func (r *billPaymentRepository) GetByBillID(ctx context.Context, billID uuid.UUID) ([]models.BillPayment, error) {
	var payments []models.BillPayment
	err := r.db.WithContext(ctx).
		Where("bill_id = ?", billID).
		Order("payment_date DESC").
		Find(&payments).Error
	return payments, err
}
