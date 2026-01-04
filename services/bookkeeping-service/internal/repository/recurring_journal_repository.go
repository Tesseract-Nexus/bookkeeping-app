package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/models"
	"gorm.io/gorm"
)

// RecurringJournalFilters defines filters for listing recurring journals
type RecurringJournalFilters struct {
	Status  models.RecurringJournalStatus
	Search  string
	Page    int
	Limit   int
}

// RecurringJournalRepository defines the interface for recurring journal data access
type RecurringJournalRepository interface {
	Create(ctx context.Context, recurring *models.RecurringJournal) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.RecurringJournal, error)
	Update(ctx context.Context, recurring *models.RecurringJournal) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, tenantID uuid.UUID, filters RecurringJournalFilters) ([]models.RecurringJournal, int64, error)
	GetDueForGeneration(ctx context.Context) ([]models.RecurringJournal, error)
	RecordGeneratedJournal(ctx context.Context, gen *models.GeneratedJournal) error
	GetGeneratedJournals(ctx context.Context, recurringID uuid.UUID) ([]models.GeneratedJournal, error)
}

type recurringJournalRepository struct {
	db *gorm.DB
}

// NewRecurringJournalRepository creates a new recurring journal repository
func NewRecurringJournalRepository(db *gorm.DB) RecurringJournalRepository {
	return &recurringJournalRepository{db: db}
}

func (r *recurringJournalRepository) Create(ctx context.Context, recurring *models.RecurringJournal) error {
	return r.db.WithContext(ctx).Create(recurring).Error
}

func (r *recurringJournalRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.RecurringJournal, error) {
	var recurring models.RecurringJournal
	err := r.db.WithContext(ctx).
		Preload("Lines").
		First(&recurring, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &recurring, nil
}

func (r *recurringJournalRepository) Update(ctx context.Context, recurring *models.RecurringJournal) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete existing lines
		if err := tx.Where("recurring_journal_id = ?", recurring.ID).Delete(&models.RecurringJournalLine{}).Error; err != nil {
			return err
		}

		// Save the recurring journal with new lines
		return tx.Save(recurring).Error
	})
}

func (r *recurringJournalRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.RecurringJournal{}, "id = ?", id).Error
}

func (r *recurringJournalRepository) List(ctx context.Context, tenantID uuid.UUID, filters RecurringJournalFilters) ([]models.RecurringJournal, int64, error) {
	var recurring []models.RecurringJournal
	var total int64

	query := r.db.WithContext(ctx).Model(&models.RecurringJournal{}).Where("tenant_id = ?", tenantID)

	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}

	if filters.Search != "" {
		search := "%" + filters.Search + "%"
		query = query.Where("name ILIKE ? OR description ILIKE ?", search, search)
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
		Preload("Lines").
		Order("created_at DESC").
		Offset(offset).
		Limit(filters.Limit).
		Find(&recurring).Error

	return recurring, total, err
}

func (r *recurringJournalRepository) GetDueForGeneration(ctx context.Context) ([]models.RecurringJournal, error) {
	var recurring []models.RecurringJournal
	now := time.Now()

	err := r.db.WithContext(ctx).
		Preload("Lines").
		Where("status = ?", models.RecurringStatusActive).
		Where("next_run_date <= ?", now).
		Where("(end_date IS NULL OR end_date >= ?)", now).
		Where("(max_occurrences IS NULL OR occurrence_count < max_occurrences)").
		Find(&recurring).Error

	return recurring, err
}

func (r *recurringJournalRepository) RecordGeneratedJournal(ctx context.Context, gen *models.GeneratedJournal) error {
	return r.db.WithContext(ctx).Create(gen).Error
}

func (r *recurringJournalRepository) GetGeneratedJournals(ctx context.Context, recurringID uuid.UUID) ([]models.GeneratedJournal, error) {
	var generated []models.GeneratedJournal
	err := r.db.WithContext(ctx).
		Where("recurring_journal_id = ?", recurringID).
		Order("occurrence_number DESC").
		Find(&generated).Error
	return generated, err
}
