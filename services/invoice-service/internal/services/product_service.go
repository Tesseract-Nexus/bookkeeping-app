package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/repository"
)

var (
	ErrProductNotFound     = errors.New("product not found")
	ErrProductSKUExists    = errors.New("product with this SKU already exists")
	ErrInvalidProductType  = errors.New("invalid product type")
)

// CreateProductRequest represents a request to create a product
type CreateProductRequest struct {
	TenantID         uuid.UUID           `json:"-"`
	CreatedBy        uuid.UUID           `json:"-"`
	Type             models.ProductType  `json:"type" binding:"required"`
	Name             string              `json:"name" binding:"required"`
	SKU              string              `json:"sku"`
	Description      string              `json:"description"`
	SellingPrice     decimal.Decimal     `json:"selling_price"`
	CostPrice        decimal.Decimal     `json:"cost_price"`
	Currency         string              `json:"currency"`
	UnitOfMeasure    string              `json:"unit_of_measure"`
	IncomeAccountID  *uuid.UUID          `json:"income_account_id"`
	ExpenseAccountID *uuid.UUID          `json:"expense_account_id"`
	HSNCode          string              `json:"hsn_code"`
	SACCode          string              `json:"sac_code"`
	TaxRateID        *uuid.UUID          `json:"tax_rate_id"`
	GSTRate          decimal.Decimal     `json:"gst_rate"`
	IsExempt         bool                `json:"is_exempt"`
	Category         string              `json:"category"`
	TrackInventory   bool                `json:"track_inventory"`
	CurrentStock     decimal.Decimal     `json:"current_stock"`
	ReorderLevel     decimal.Decimal     `json:"reorder_level"`
}

// UpdateProductRequest represents a request to update a product
type UpdateProductRequest struct {
	Name             *string             `json:"name"`
	SKU              *string             `json:"sku"`
	Description      *string             `json:"description"`
	SellingPrice     *decimal.Decimal    `json:"selling_price"`
	CostPrice        *decimal.Decimal    `json:"cost_price"`
	UnitOfMeasure    *string             `json:"unit_of_measure"`
	IncomeAccountID  *uuid.UUID          `json:"income_account_id"`
	ExpenseAccountID *uuid.UUID          `json:"expense_account_id"`
	HSNCode          *string             `json:"hsn_code"`
	SACCode          *string             `json:"sac_code"`
	TaxRateID        *uuid.UUID          `json:"tax_rate_id"`
	GSTRate          *decimal.Decimal    `json:"gst_rate"`
	IsExempt         *bool               `json:"is_exempt"`
	Category         *string             `json:"category"`
	TrackInventory   *bool               `json:"track_inventory"`
	ReorderLevel     *decimal.Decimal    `json:"reorder_level"`
	IsActive         *bool               `json:"is_active"`
}

// ProductService handles product business logic
type ProductService interface {
	Create(ctx context.Context, req CreateProductRequest) (*models.Product, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Product, error)
	List(ctx context.Context, tenantID uuid.UUID, filters repository.ProductFilters) ([]models.Product, int64, error)
	Update(ctx context.Context, id uuid.UUID, req UpdateProductRequest) (*models.Product, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetCategories(ctx context.Context, tenantID uuid.UUID) ([]string, error)
	ImportProducts(ctx context.Context, tenantID uuid.UUID, createdBy uuid.UUID, products []CreateProductRequest) (int, []error)
	UpdateStock(ctx context.Context, productID uuid.UUID, quantity float64) error
}

type productService struct {
	repo repository.ProductRepository
}

// NewProductService creates a new product service
func NewProductService(repo repository.ProductRepository) ProductService {
	return &productService{repo: repo}
}

func (s *productService) Create(ctx context.Context, req CreateProductRequest) (*models.Product, error) {
	// Validate product type
	if req.Type != models.ProductTypeGoods && req.Type != models.ProductTypeService {
		return nil, ErrInvalidProductType
	}

	// Check for duplicate SKU
	if req.SKU != "" {
		existing, _ := s.repo.GetBySKU(ctx, req.TenantID, req.SKU)
		if existing != nil {
			return nil, ErrProductSKUExists
		}
	}

	// Set defaults
	if req.Currency == "" {
		req.Currency = "INR"
	}

	product := &models.Product{
		TenantID:         req.TenantID,
		Type:             req.Type,
		Name:             req.Name,
		SKU:              req.SKU,
		Description:      req.Description,
		SellingPrice:     req.SellingPrice,
		CostPrice:        req.CostPrice,
		Currency:         req.Currency,
		UnitOfMeasure:    req.UnitOfMeasure,
		IncomeAccountID:  req.IncomeAccountID,
		ExpenseAccountID: req.ExpenseAccountID,
		HSNCode:          req.HSNCode,
		SACCode:          req.SACCode,
		TaxRateID:        req.TaxRateID,
		GSTRate:          req.GSTRate,
		IsExempt:         req.IsExempt,
		Category:         req.Category,
		TrackInventory:   req.TrackInventory,
		CurrentStock:     req.CurrentStock,
		ReorderLevel:     req.ReorderLevel,
		IsActive:         true,
		CreatedBy:        req.CreatedBy,
	}

	if err := s.repo.Create(ctx, product); err != nil {
		return nil, err
	}

	return product, nil
}

func (s *productService) GetByID(ctx context.Context, id uuid.UUID) (*models.Product, error) {
	product, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrProductNotFound
	}
	return product, nil
}

func (s *productService) List(ctx context.Context, tenantID uuid.UUID, filters repository.ProductFilters) ([]models.Product, int64, error) {
	return s.repo.GetByTenantID(ctx, tenantID, filters)
}

func (s *productService) Update(ctx context.Context, id uuid.UUID, req UpdateProductRequest) (*models.Product, error) {
	product, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrProductNotFound
	}

	// Update fields if provided
	if req.Name != nil {
		product.Name = *req.Name
	}
	if req.SKU != nil {
		// Check for duplicate SKU if changing
		if *req.SKU != product.SKU && *req.SKU != "" {
			existing, _ := s.repo.GetBySKU(ctx, product.TenantID, *req.SKU)
			if existing != nil && existing.ID != product.ID {
				return nil, ErrProductSKUExists
			}
		}
		product.SKU = *req.SKU
	}
	if req.Description != nil {
		product.Description = *req.Description
	}
	if req.SellingPrice != nil {
		product.SellingPrice = *req.SellingPrice
	}
	if req.CostPrice != nil {
		product.CostPrice = *req.CostPrice
	}
	if req.UnitOfMeasure != nil {
		product.UnitOfMeasure = *req.UnitOfMeasure
	}
	if req.IncomeAccountID != nil {
		product.IncomeAccountID = req.IncomeAccountID
	}
	if req.ExpenseAccountID != nil {
		product.ExpenseAccountID = req.ExpenseAccountID
	}
	if req.HSNCode != nil {
		product.HSNCode = *req.HSNCode
	}
	if req.SACCode != nil {
		product.SACCode = *req.SACCode
	}
	if req.TaxRateID != nil {
		product.TaxRateID = req.TaxRateID
	}
	if req.GSTRate != nil {
		product.GSTRate = *req.GSTRate
	}
	if req.IsExempt != nil {
		product.IsExempt = *req.IsExempt
	}
	if req.Category != nil {
		product.Category = *req.Category
	}
	if req.TrackInventory != nil {
		product.TrackInventory = *req.TrackInventory
	}
	if req.ReorderLevel != nil {
		product.ReorderLevel = *req.ReorderLevel
	}
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}

	if err := s.repo.Update(ctx, product); err != nil {
		return nil, err
	}

	return product, nil
}

func (s *productService) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrProductNotFound
	}
	return s.repo.Delete(ctx, id)
}

func (s *productService) GetCategories(ctx context.Context, tenantID uuid.UUID) ([]string, error) {
	return s.repo.GetCategories(ctx, tenantID)
}

func (s *productService) ImportProducts(ctx context.Context, tenantID uuid.UUID, createdBy uuid.UUID, products []CreateProductRequest) (int, []error) {
	var errs []error
	successCount := 0

	for _, req := range products {
		req.TenantID = tenantID
		req.CreatedBy = createdBy
		_, err := s.Create(ctx, req)
		if err != nil {
			errs = append(errs, err)
		} else {
			successCount++
		}
	}

	return successCount, errs
}

func (s *productService) UpdateStock(ctx context.Context, productID uuid.UUID, quantity float64) error {
	return s.repo.UpdateStock(ctx, productID, quantity)
}
