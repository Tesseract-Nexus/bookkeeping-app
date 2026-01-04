package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/models"
	"gorm.io/gorm"
)

// ProductFilters represents filters for product queries
type ProductFilters struct {
	Type       models.ProductType
	Category   string
	IsActive   *bool
	Search     string
	Page       int
	Limit      int
}

// ProductRepository handles product data operations
type ProductRepository interface {
	Create(ctx context.Context, product *models.Product) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Product, error)
	GetByTenantID(ctx context.Context, tenantID uuid.UUID, filters ProductFilters) ([]models.Product, int64, error)
	GetBySKU(ctx context.Context, tenantID uuid.UUID, sku string) (*models.Product, error)
	Update(ctx context.Context, product *models.Product) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetCategories(ctx context.Context, tenantID uuid.UUID) ([]string, error)
	BulkCreate(ctx context.Context, products []models.Product) error
	UpdateStock(ctx context.Context, productID uuid.UUID, quantity float64) error
}

type productRepository struct {
	db *gorm.DB
}

// NewProductRepository creates a new product repository
func NewProductRepository(db *gorm.DB) ProductRepository {
	return &productRepository{db: db}
}

func (r *productRepository) Create(ctx context.Context, product *models.Product) error {
	return r.db.WithContext(ctx).Create(product).Error
}

func (r *productRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Product, error) {
	var product models.Product
	err := r.db.WithContext(ctx).First(&product, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *productRepository) GetByTenantID(ctx context.Context, tenantID uuid.UUID, filters ProductFilters) ([]models.Product, int64, error) {
	var products []models.Product
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Product{}).Where("tenant_id = ?", tenantID)

	// Apply filters
	if filters.Type != "" {
		query = query.Where("type = ?", filters.Type)
	}
	if filters.Category != "" {
		query = query.Where("category = ?", filters.Category)
	}
	if filters.IsActive != nil {
		query = query.Where("is_active = ?", *filters.IsActive)
	}
	if filters.Search != "" {
		searchPattern := "%" + filters.Search + "%"
		query = query.Where("name ILIKE ? OR sku ILIKE ? OR description ILIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	// Get total count
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

	// Get products
	err := query.
		Order("name ASC").
		Offset(offset).
		Limit(filters.Limit).
		Find(&products).Error
	if err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

func (r *productRepository) GetBySKU(ctx context.Context, tenantID uuid.UUID, sku string) (*models.Product, error) {
	var product models.Product
	err := r.db.WithContext(ctx).First(&product, "tenant_id = ? AND sku = ?", tenantID, sku).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *productRepository) Update(ctx context.Context, product *models.Product) error {
	return r.db.WithContext(ctx).Save(product).Error
}

func (r *productRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Product{}, "id = ?", id).Error
}

func (r *productRepository) GetCategories(ctx context.Context, tenantID uuid.UUID) ([]string, error) {
	var categories []string
	err := r.db.WithContext(ctx).
		Model(&models.Product{}).
		Where("tenant_id = ? AND category IS NOT NULL AND category != ''", tenantID).
		Distinct("category").
		Pluck("category", &categories).Error
	if err != nil {
		return nil, err
	}
	return categories, nil
}

func (r *productRepository) BulkCreate(ctx context.Context, products []models.Product) error {
	return r.db.WithContext(ctx).CreateInBatches(products, 100).Error
}

func (r *productRepository) UpdateStock(ctx context.Context, productID uuid.UUID, quantity float64) error {
	return r.db.WithContext(ctx).
		Model(&models.Product{}).
		Where("id = ?", productID).
		Update("current_stock", gorm.Expr("current_stock + ?", quantity)).Error
}
