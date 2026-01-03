package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/models"
	"gorm.io/gorm"
)

// InvoiceRepository handles invoice data operations
type InvoiceRepository interface {
	Create(ctx context.Context, invoice *models.Invoice) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Invoice, error)
	GetByTenantID(ctx context.Context, tenantID uuid.UUID, filters InvoiceFilters) ([]models.Invoice, int64, error)
	Update(ctx context.Context, invoice *models.Invoice) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetNextInvoiceNumber(ctx context.Context, tenantID uuid.UUID, prefix string) (string, error)
}

// InvoiceFilters represents filters for listing invoices
type InvoiceFilters struct {
	Status     string
	CustomerID uuid.UUID
	FromDate   string
	ToDate     string
	Page       int
	Limit      int
}

type invoiceRepository struct {
	db *gorm.DB
}

// NewInvoiceRepository creates a new invoice repository
func NewInvoiceRepository(db *gorm.DB) InvoiceRepository {
	return &invoiceRepository{db: db}
}

func (r *invoiceRepository) Create(ctx context.Context, invoice *models.Invoice) error {
	return r.db.WithContext(ctx).Create(invoice).Error
}

func (r *invoiceRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Invoice, error) {
	var invoice models.Invoice
	err := r.db.WithContext(ctx).
		Preload("Items").
		Preload("Payments").
		First(&invoice, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &invoice, nil
}

func (r *invoiceRepository) GetByTenantID(ctx context.Context, tenantID uuid.UUID, filters InvoiceFilters) ([]models.Invoice, int64, error) {
	var invoices []models.Invoice
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Invoice{}).
		Where("tenant_id = ?", tenantID)

	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.CustomerID != uuid.Nil {
		query = query.Where("customer_id = ?", filters.CustomerID)
	}
	if filters.FromDate != "" {
		query = query.Where("invoice_date >= ?", filters.FromDate)
	}
	if filters.ToDate != "" {
		query = query.Where("invoice_date <= ?", filters.ToDate)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (filters.Page - 1) * filters.Limit
	err := query.
		Preload("Items").
		Offset(offset).
		Limit(filters.Limit).
		Order("invoice_date DESC, created_at DESC").
		Find(&invoices).Error

	return invoices, total, err
}

func (r *invoiceRepository) Update(ctx context.Context, invoice *models.Invoice) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete existing items
		if err := tx.Where("invoice_id = ?", invoice.ID).Delete(&models.InvoiceItem{}).Error; err != nil {
			return err
		}

		// Save invoice with new items
		return tx.Save(invoice).Error
	})
}

func (r *invoiceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Invoice{}, "id = ?", id).Error
}

func (r *invoiceRepository) GetNextInvoiceNumber(ctx context.Context, tenantID uuid.UUID, prefix string) (string, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Invoice{}).
		Where("tenant_id = ? AND invoice_number LIKE ?", tenantID, prefix+"%").
		Count(&count).Error
	if err != nil {
		return "", err
	}

	return prefix + "-" + padNumber(int(count)+1, 5), nil
}

func padNumber(n int, width int) string {
	s := ""
	for i := 0; i < width; i++ {
		s = "0" + s
	}
	result := s + string(rune(n))
	return result[len(result)-width:]
}
