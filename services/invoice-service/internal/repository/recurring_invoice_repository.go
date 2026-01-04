package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/models"
	"gorm.io/gorm"
)

// RecurringInvoiceFilters defines filters for listing recurring invoices
type RecurringInvoiceFilters struct {
	Status     models.RecurringInvoiceStatus
	CustomerID uuid.UUID
	Search     string
	Page       int
	Limit      int
}

// RecurringInvoiceRepository defines the interface for recurring invoice data access
type RecurringInvoiceRepository interface {
	Create(ctx context.Context, recurring *models.RecurringInvoice) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.RecurringInvoice, error)
	Update(ctx context.Context, recurring *models.RecurringInvoice) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, tenantID uuid.UUID, filters RecurringInvoiceFilters) ([]models.RecurringInvoice, int64, error)
	GetDueForGeneration(ctx context.Context) ([]models.RecurringInvoice, error)
	RecordGeneratedInvoice(ctx context.Context, gen *models.GeneratedInvoice) error
	GetGeneratedInvoices(ctx context.Context, recurringID uuid.UUID) ([]models.GeneratedInvoice, error)
}

type recurringInvoiceRepository struct {
	db *gorm.DB
}

// NewRecurringInvoiceRepository creates a new recurring invoice repository
func NewRecurringInvoiceRepository(db *gorm.DB) RecurringInvoiceRepository {
	return &recurringInvoiceRepository{db: db}
}

func (r *recurringInvoiceRepository) Create(ctx context.Context, recurring *models.RecurringInvoice) error {
	return r.db.WithContext(ctx).Create(recurring).Error
}

func (r *recurringInvoiceRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.RecurringInvoice, error) {
	var recurring models.RecurringInvoice
	err := r.db.WithContext(ctx).
		Preload("Items").
		First(&recurring, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &recurring, nil
}

func (r *recurringInvoiceRepository) Update(ctx context.Context, recurring *models.RecurringInvoice) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete existing items
		if err := tx.Where("recurring_invoice_id = ?", recurring.ID).Delete(&models.RecurringInvoiceItem{}).Error; err != nil {
			return err
		}

		// Save the recurring invoice with new items
		return tx.Save(recurring).Error
	})
}

func (r *recurringInvoiceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.RecurringInvoice{}, "id = ?", id).Error
}

func (r *recurringInvoiceRepository) List(ctx context.Context, tenantID uuid.UUID, filters RecurringInvoiceFilters) ([]models.RecurringInvoice, int64, error) {
	var recurring []models.RecurringInvoice
	var total int64

	query := r.db.WithContext(ctx).Model(&models.RecurringInvoice{}).Where("tenant_id = ?", tenantID)

	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}

	if filters.CustomerID != uuid.Nil {
		query = query.Where("customer_id = ?", filters.CustomerID)
	}

	if filters.Search != "" {
		search := "%" + filters.Search + "%"
		query = query.Where("name ILIKE ? OR customer_name ILIKE ?", search, search)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	if filters.Page <= 0 {
		filters.Page = 1
	}
	if filters.Limit <= 0 {
		filters.Limit = 20
	}
	offset := (filters.Page - 1) * filters.Limit

	err := query.
		Preload("Items").
		Order("created_at DESC").
		Offset(offset).
		Limit(filters.Limit).
		Find(&recurring).Error

	return recurring, total, err
}

func (r *recurringInvoiceRepository) GetDueForGeneration(ctx context.Context) ([]models.RecurringInvoice, error) {
	var recurring []models.RecurringInvoice
	now := time.Now()

	err := r.db.WithContext(ctx).
		Preload("Items").
		Where("status = ?", models.RecurringStatusActive).
		Where("next_run_date <= ?", now).
		Where("(end_date IS NULL OR end_date >= ?)", now).
		Where("(max_occurrences IS NULL OR occurrence_count < max_occurrences)").
		Find(&recurring).Error

	return recurring, err
}

func (r *recurringInvoiceRepository) RecordGeneratedInvoice(ctx context.Context, gen *models.GeneratedInvoice) error {
	return r.db.WithContext(ctx).Create(gen).Error
}

func (r *recurringInvoiceRepository) GetGeneratedInvoices(ctx context.Context, recurringID uuid.UUID) ([]models.GeneratedInvoice, error) {
	var generated []models.GeneratedInvoice
	err := r.db.WithContext(ctx).
		Where("recurring_invoice_id = ?", recurringID).
		Order("occurrence_number DESC").
		Find(&generated).Error
	return generated, err
}
