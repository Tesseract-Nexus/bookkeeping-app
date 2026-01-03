package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/models"
	"gorm.io/gorm"
)

// GlobalTenantID is the special tenant ID for global data accessible to all tenants
const GlobalTenantID = "global"

// TaxRepository handles tax data operations
type TaxRepository struct {
	db *gorm.DB
}

// NewTaxRepository creates a new tax repository
func NewTaxRepository(db *gorm.DB) *TaxRepository {
	return &TaxRepository{db: db}
}

// ============ Jurisdiction Methods ============

func (r *TaxRepository) GetJurisdictionByLocation(ctx context.Context, tenantID, country, state, city, zip string) ([]models.TaxJurisdiction, error) {
	var jurisdictions []models.TaxJurisdiction
	query := r.db.WithContext(ctx).Where("tenant_id IN ? AND is_active = true", []string{tenantID, GlobalTenantID})

	if zip != "" {
		query = query.Where("(type = ? AND code = ?) OR (type = ? AND code = ?) OR (type = ? AND code = ?) OR (type = ? AND code = ?)",
			models.JurisdictionTypeZIP, zip,
			models.JurisdictionTypeCity, city,
			models.JurisdictionTypeState, state,
			models.JurisdictionTypeCountry, country)
	} else if city != "" {
		query = query.Where("(type = ? AND code = ?) OR (type = ? AND code = ?) OR (type = ? AND code = ?)",
			models.JurisdictionTypeCity, city,
			models.JurisdictionTypeState, state,
			models.JurisdictionTypeCountry, country)
	} else if state != "" {
		query = query.Where("(type = ? AND code = ?) OR (type = ? AND code = ?)",
			models.JurisdictionTypeState, state,
			models.JurisdictionTypeCountry, country)
	} else {
		query = query.Where("type = ? AND code = ?", models.JurisdictionTypeCountry, country)
	}

	err := query.Order("type DESC").Find(&jurisdictions).Error
	return jurisdictions, err
}

func (r *TaxRepository) GetJurisdictionByStateCode(ctx context.Context, tenantID string, stateCode string) (*models.TaxJurisdiction, error) {
	var jurisdiction models.TaxJurisdiction
	err := r.db.WithContext(ctx).
		Where("tenant_id IN ? AND state_code = ? AND is_active = true", []string{tenantID, GlobalTenantID}, stateCode).
		First(&jurisdiction).Error
	if err != nil {
		return nil, err
	}
	return &jurisdiction, nil
}

func (r *TaxRepository) ListJurisdictions(ctx context.Context, tenantID string) ([]models.TaxJurisdiction, error) {
	var jurisdictions []models.TaxJurisdiction
	err := r.db.WithContext(ctx).
		Where("tenant_id IN ?", []string{tenantID, GlobalTenantID}).
		Preload("TaxRates").
		Order("type, name").
		Find(&jurisdictions).Error
	return jurisdictions, err
}

func (r *TaxRepository) GetJurisdiction(ctx context.Context, jurisdictionID uuid.UUID) (*models.TaxJurisdiction, error) {
	var jurisdiction models.TaxJurisdiction
	err := r.db.WithContext(ctx).
		Preload("Parent").
		Preload("Children").
		Preload("TaxRates").
		First(&jurisdiction, "id = ?", jurisdictionID).Error
	if err != nil {
		return nil, err
	}
	return &jurisdiction, nil
}

func (r *TaxRepository) CreateJurisdiction(ctx context.Context, jurisdiction *models.TaxJurisdiction) error {
	return r.db.WithContext(ctx).Create(jurisdiction).Error
}

func (r *TaxRepository) UpdateJurisdiction(ctx context.Context, jurisdiction *models.TaxJurisdiction) error {
	jurisdiction.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(jurisdiction).Error
}

func (r *TaxRepository) DeleteJurisdiction(ctx context.Context, jurisdictionID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.TaxJurisdiction{}).
		Where("id = ?", jurisdictionID).
		Update("is_active", false).Error
}

// ============ Tax Rate Methods ============

func (r *TaxRepository) GetActiveTaxRates(ctx context.Context, jurisdictionIDs []uuid.UUID) ([]models.TaxRate, error) {
	var rates []models.TaxRate
	now := time.Now()
	err := r.db.WithContext(ctx).
		Where("jurisdiction_id IN ? AND is_active = true", jurisdictionIDs).
		Where("effective_from <= ?", now).
		Where("effective_to IS NULL OR effective_to >= ?", now).
		Order("priority ASC").
		Find(&rates).Error
	return rates, err
}

func (r *TaxRepository) ListTaxRates(ctx context.Context, jurisdictionID uuid.UUID) ([]models.TaxRate, error) {
	var rates []models.TaxRate
	err := r.db.WithContext(ctx).
		Where("jurisdiction_id = ?", jurisdictionID).
		Order("priority ASC").
		Find(&rates).Error
	return rates, err
}

func (r *TaxRepository) CreateTaxRate(ctx context.Context, rate *models.TaxRate) error {
	return r.db.WithContext(ctx).Create(rate).Error
}

func (r *TaxRepository) UpdateTaxRate(ctx context.Context, rate *models.TaxRate) error {
	rate.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(rate).Error
}

func (r *TaxRepository) DeleteTaxRate(ctx context.Context, rateID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.TaxRate{}).
		Where("id = ?", rateID).
		Update("is_active", false).Error
}

// ============ Product Category Methods ============

func (r *TaxRepository) GetProductCategory(ctx context.Context, categoryID uuid.UUID) (*models.ProductTaxCategory, error) {
	var category models.ProductTaxCategory
	err := r.db.WithContext(ctx).First(&category, "id = ?", categoryID).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *TaxRepository) GetProductCategoryByHSN(ctx context.Context, tenantID string, hsnCode string) (*models.ProductTaxCategory, error) {
	var category models.ProductTaxCategory
	err := r.db.WithContext(ctx).
		Where("tenant_id IN ? AND hsn_code = ?", []string{tenantID, GlobalTenantID}, hsnCode).
		First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *TaxRepository) GetProductCategoryBySAC(ctx context.Context, tenantID string, sacCode string) (*models.ProductTaxCategory, error) {
	var category models.ProductTaxCategory
	err := r.db.WithContext(ctx).
		Where("tenant_id IN ? AND sac_code = ?", []string{tenantID, GlobalTenantID}, sacCode).
		First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *TaxRepository) ListProductCategories(ctx context.Context, tenantID string) ([]models.ProductTaxCategory, error) {
	var categories []models.ProductTaxCategory
	err := r.db.WithContext(ctx).
		Where("tenant_id IN ?", []string{tenantID, GlobalTenantID}).
		Order("name").
		Find(&categories).Error
	return categories, err
}

func (r *TaxRepository) CreateProductCategory(ctx context.Context, category *models.ProductTaxCategory) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *TaxRepository) UpdateProductCategory(ctx context.Context, category *models.ProductTaxCategory) error {
	category.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(category).Error
}

func (r *TaxRepository) DeleteProductCategory(ctx context.Context, categoryID uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.ProductTaxCategory{}, "id = ?", categoryID).Error
}

// ============ Nexus Methods ============

func (r *TaxRepository) GetNexusByCountry(ctx context.Context, tenantID string, countryCode string) (*models.TaxNexus, error) {
	var nexus models.TaxNexus
	err := r.db.WithContext(ctx).
		Joins("JOIN tax_jurisdictions ON tax_jurisdictions.id = tax_nexus.jurisdiction_id").
		Where("tax_nexus.tenant_id = ? AND tax_jurisdictions.code = ? AND tax_jurisdictions.type = ? AND tax_nexus.is_active = true",
			tenantID, countryCode, models.JurisdictionTypeCountry).
		Preload("Jurisdiction").
		First(&nexus).Error
	if err != nil {
		return nil, err
	}
	return &nexus, nil
}

func (r *TaxRepository) GetNexusByJurisdiction(ctx context.Context, tenantID string, jurisdictionID uuid.UUID) (*models.TaxNexus, error) {
	var nexus models.TaxNexus
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND jurisdiction_id = ? AND is_active = true", tenantID, jurisdictionID).
		Preload("Jurisdiction").
		First(&nexus).Error
	if err != nil {
		return nil, err
	}
	return &nexus, nil
}

// ============ TDS Methods ============

func (r *TaxRepository) GetTDSRate(ctx context.Context, tenantID string, section models.TDSSection) (*models.TDSRate, error) {
	var rate models.TDSRate
	now := time.Now()
	err := r.db.WithContext(ctx).
		Where("tenant_id IN ? AND section = ? AND is_active = true", []string{tenantID, GlobalTenantID}, section).
		Where("effective_from <= ?", now).
		Where("effective_to IS NULL OR effective_to >= ?", now).
		First(&rate).Error
	if err != nil {
		return nil, err
	}
	return &rate, nil
}

func (r *TaxRepository) ListTDSRates(ctx context.Context, tenantID string) ([]models.TDSRate, error) {
	var rates []models.TDSRate
	err := r.db.WithContext(ctx).
		Where("tenant_id IN ? AND is_active = true", []string{tenantID, GlobalTenantID}).
		Order("section").
		Find(&rates).Error
	return rates, err
}

func (r *TaxRepository) CreateTDSDeduction(ctx context.Context, deduction *models.TDSDeduction) error {
	return r.db.WithContext(ctx).Create(deduction).Error
}

func (r *TaxRepository) GetTDSDeduction(ctx context.Context, id uuid.UUID) (*models.TDSDeduction, error) {
	var deduction models.TDSDeduction
	err := r.db.WithContext(ctx).First(&deduction, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &deduction, nil
}

func (r *TaxRepository) ListTDSDeductions(ctx context.Context, tenantID, financialYear string, quarter int) ([]models.TDSDeduction, error) {
	var deductions []models.TDSDeduction
	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	if financialYear != "" {
		query = query.Where("financial_year = ?", financialYear)
	}
	if quarter > 0 {
		query = query.Where("quarter = ?", quarter)
	}
	err := query.Order("deduction_date DESC").Find(&deductions).Error
	return deductions, err
}

func (r *TaxRepository) GetTDSSummaryByDeductee(ctx context.Context, tenantID string, deducteeID uuid.UUID, financialYear string) (decimal.Decimal, error) {
	var total decimal.Decimal
	err := r.db.WithContext(ctx).
		Model(&models.TDSDeduction{}).
		Select("COALESCE(SUM(gross_amount), 0)").
		Where("tenant_id = ? AND deductee_id = ? AND financial_year = ?", tenantID, deducteeID, financialYear).
		Scan(&total).Error
	return total, err
}

func (r *TaxRepository) UpdateTDSDeduction(ctx context.Context, deduction *models.TDSDeduction) error {
	deduction.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(deduction).Error
}

// ============ TCS Methods ============

func (r *TaxRepository) GetTCSRate(ctx context.Context, tenantID string, section models.TCSSection) (*models.TCSRate, error) {
	var rate models.TCSRate
	now := time.Now()
	err := r.db.WithContext(ctx).
		Where("tenant_id IN ? AND section = ? AND is_active = true", []string{tenantID, GlobalTenantID}, section).
		Where("effective_from <= ?", now).
		Where("effective_to IS NULL OR effective_to >= ?", now).
		First(&rate).Error
	if err != nil {
		return nil, err
	}
	return &rate, nil
}

func (r *TaxRepository) CreateTCSCollection(ctx context.Context, collection *models.TCSCollection) error {
	return r.db.WithContext(ctx).Create(collection).Error
}

func (r *TaxRepository) ListTCSCollections(ctx context.Context, tenantID, financialYear string, quarter int) ([]models.TCSCollection, error) {
	var collections []models.TCSCollection
	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	if financialYear != "" {
		query = query.Where("financial_year = ?", financialYear)
	}
	if quarter > 0 {
		query = query.Where("quarter = ?", quarter)
	}
	err := query.Order("collection_date DESC").Find(&collections).Error
	return collections, err
}

func (r *TaxRepository) GetTCSSummaryByCustomer(ctx context.Context, tenantID string, customerID uuid.UUID, financialYear string) (decimal.Decimal, error) {
	var total decimal.Decimal
	err := r.db.WithContext(ctx).
		Model(&models.TCSCollection{}).
		Select("COALESCE(SUM(sale_amount), 0)").
		Where("tenant_id = ? AND customer_id = ? AND financial_year = ?", tenantID, customerID, financialYear).
		Scan(&total).Error
	return total, err
}

// ============ ITC Methods ============

func (r *TaxRepository) CreateInputTaxCredit(ctx context.Context, itc *models.InputTaxCredit) error {
	return r.db.WithContext(ctx).Create(itc).Error
}

func (r *TaxRepository) GetInputTaxCredit(ctx context.Context, id uuid.UUID) (*models.InputTaxCredit, error) {
	var itc models.InputTaxCredit
	err := r.db.WithContext(ctx).First(&itc, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &itc, nil
}

func (r *TaxRepository) ListInputTaxCredits(ctx context.Context, tenantID, period string, status models.ITCStatus) ([]models.InputTaxCredit, error) {
	var itcs []models.InputTaxCredit
	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	if period != "" {
		query = query.Where("claim_period = ?", period)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	err := query.Order("invoice_date DESC").Find(&itcs).Error
	return itcs, err
}

func (r *TaxRepository) GetITCSummary(ctx context.Context, tenantID, period string) (*models.ITCSummaryResponse, error) {
	var summary models.ITCSummaryResponse
	summary.TenantID = tenantID
	summary.Period = period

	row := r.db.WithContext(ctx).
		Model(&models.InputTaxCredit{}).
		Select(`
			COALESCE(SUM(cgst_amount), 0) as total_itc_cgst,
			COALESCE(SUM(sgst_amount), 0) as total_itc_sgst,
			COALESCE(SUM(igst_amount), 0) as total_itc_igst,
			COALESCE(SUM(cess_amount), 0) as total_itc_cess,
			COALESCE(SUM(total_itc), 0) as total_itc,
			COALESCE(SUM(eligible_itc), 0) as eligible_itc,
			COALESCE(SUM(reversal_amount), 0) as reversed_itc,
			COUNT(CASE WHEN gstr2b_matched = true THEN 1 END) as matched_count,
			COUNT(CASE WHEN gstr2b_matched = false THEN 1 END) as unmatched_count
		`).
		Where("tenant_id = ?", tenantID).
		Where("claim_period = ?", period).
		Row()

	err := row.Scan(
		&summary.TotalITCCGST,
		&summary.TotalITCSGST,
		&summary.TotalITCIGST,
		&summary.TotalITCCess,
		&summary.TotalITC,
		&summary.EligibleITC,
		&summary.ReversedITC,
		&summary.MatchedCount,
		&summary.UnmatchedCount,
	)
	return &summary, err
}

func (r *TaxRepository) UpdateInputTaxCredit(ctx context.Context, itc *models.InputTaxCredit) error {
	itc.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(itc).Error
}

// ============ GSTR Filing Methods ============

func (r *TaxRepository) CreateGSTRFiling(ctx context.Context, filing *models.GSTRFiling) error {
	return r.db.WithContext(ctx).Create(filing).Error
}

func (r *TaxRepository) GetGSTRFiling(ctx context.Context, tenantID string, returnType models.GSTRType, period string) (*models.GSTRFiling, error) {
	var filing models.GSTRFiling
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND return_type = ? AND period = ?", tenantID, returnType, period).
		First(&filing).Error
	if err != nil {
		return nil, err
	}
	return &filing, nil
}

func (r *TaxRepository) ListGSTRFilings(ctx context.Context, tenantID, financialYear string) ([]models.GSTRFiling, error) {
	var filings []models.GSTRFiling
	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	if financialYear != "" {
		query = query.Where("financial_year = ?", financialYear)
	}
	err := query.Order("period DESC").Find(&filings).Error
	return filings, err
}

func (r *TaxRepository) UpdateGSTRFiling(ctx context.Context, filing *models.GSTRFiling) error {
	filing.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(filing).Error
}

// ============ Cache Methods ============

func (r *TaxRepository) GetCachedTaxCalculation(ctx context.Context, cacheKey string) (*models.TaxCalculationCache, error) {
	var cache models.TaxCalculationCache
	err := r.db.WithContext(ctx).
		Where("cache_key = ? AND expires_at > ?", cacheKey, time.Now()).
		First(&cache).Error
	if err != nil {
		return nil, err
	}
	return &cache, nil
}

func (r *TaxRepository) CacheTaxCalculation(ctx context.Context, cache *models.TaxCalculationCache) error {
	return r.db.WithContext(ctx).Create(cache).Error
}
