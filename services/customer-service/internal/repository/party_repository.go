package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/customer-service/internal/models"
	"gorm.io/gorm"
)

// PartyRepository defines the interface for party data access
type PartyRepository interface {
	Create(ctx context.Context, party *models.Party) error
	Update(ctx context.Context, party *models.Party) error
	Delete(ctx context.Context, id, tenantID uuid.UUID) error
	FindByID(ctx context.Context, id, tenantID uuid.UUID) (*models.Party, error)
	FindByGSTIN(ctx context.Context, gstin string, tenantID uuid.UUID) (*models.Party, error)
	FindAll(ctx context.Context, tenantID uuid.UUID, filter PartyFilter) ([]models.Party, int64, error)
	UpdateBalance(ctx context.Context, id uuid.UUID, amount float64) error
	GetLedger(ctx context.Context, id, tenantID uuid.UUID, fromDate, toDate string) ([]LedgerEntry, error)
}

// PartyFilter defines filter options for listing parties
type PartyFilter struct {
	PartyType  string
	Search     string
	HasBalance bool
	IsActive   *bool
	Tags       []string
	Page       int
	PerPage    int
	SortBy     string
	SortOrder  string
}

// LedgerEntry represents a ledger entry for a party
type LedgerEntry struct {
	Date        string  `json:"date"`
	Type        string  `json:"type"`
	Reference   string  `json:"reference"`
	Description string  `json:"description"`
	Debit       float64 `json:"debit"`
	Credit      float64 `json:"credit"`
	Balance     float64 `json:"balance"`
}

type partyRepository struct {
	db *gorm.DB
}

// NewPartyRepository creates a new party repository
func NewPartyRepository(db *gorm.DB) PartyRepository {
	return &partyRepository{db: db}
}

func (r *partyRepository) Create(ctx context.Context, party *models.Party) error {
	return r.db.WithContext(ctx).Create(party).Error
}

func (r *partyRepository) Update(ctx context.Context, party *models.Party) error {
	return r.db.WithContext(ctx).Save(party).Error
}

func (r *partyRepository) Delete(ctx context.Context, id, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&models.Party{}).Error
}

func (r *partyRepository) FindByID(ctx context.Context, id, tenantID uuid.UUID) (*models.Party, error) {
	var party models.Party
	err := r.db.WithContext(ctx).
		Preload("Contacts").
		Preload("BankDetails").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&party).Error
	if err != nil {
		return nil, err
	}
	return &party, nil
}

func (r *partyRepository) FindByGSTIN(ctx context.Context, gstin string, tenantID uuid.UUID) (*models.Party, error) {
	var party models.Party
	err := r.db.WithContext(ctx).
		Where("gstin = ? AND tenant_id = ?", gstin, tenantID).
		First(&party).Error
	if err != nil {
		return nil, err
	}
	return &party, nil
}

func (r *partyRepository) FindAll(ctx context.Context, tenantID uuid.UUID, filter PartyFilter) ([]models.Party, int64, error) {
	var parties []models.Party
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Party{}).Where("tenant_id = ?", tenantID)

	// Apply filters
	if filter.PartyType != "" {
		query = query.Where("party_type = ?", filter.PartyType)
	}

	if filter.Search != "" {
		searchPattern := "%" + filter.Search + "%"
		query = query.Where("name ILIKE ? OR email ILIKE ? OR phone ILIKE ? OR gstin ILIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern)
	}

	if filter.HasBalance {
		query = query.Where("current_balance != 0")
	}

	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}

	if len(filter.Tags) > 0 {
		query = query.Where("tags && ?", filter.Tags)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply sorting
	sortBy := filter.SortBy
	if sortBy == "" {
		sortBy = "name"
	}
	sortOrder := filter.SortOrder
	if sortOrder == "" {
		sortOrder = "asc"
	}
	query = query.Order(sortBy + " " + sortOrder)

	// Apply pagination
	page := filter.Page
	if page < 1 {
		page = 1
	}
	perPage := filter.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	err := query.Offset(offset).Limit(perPage).Find(&parties).Error
	if err != nil {
		return nil, 0, err
	}

	return parties, total, nil
}

func (r *partyRepository) UpdateBalance(ctx context.Context, id uuid.UUID, amount float64) error {
	return r.db.WithContext(ctx).
		Model(&models.Party{}).
		Where("id = ?", id).
		Update("current_balance", gorm.Expr("current_balance + ?", amount)).Error
}

func (r *partyRepository) GetLedger(ctx context.Context, id, tenantID uuid.UUID, fromDate, toDate string) ([]LedgerEntry, error) {
	// This would typically query transactions and invoices
	// For now, return empty slice - will be populated when transaction service is integrated
	return []LedgerEntry{}, nil
}
