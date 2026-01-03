package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/models"
	"gorm.io/gorm"
)

// AccountRepository defines the interface for account data access
type AccountRepository interface {
	Create(ctx context.Context, account *models.Account) error
	Update(ctx context.Context, account *models.Account) error
	Delete(ctx context.Context, id, tenantID uuid.UUID) error
	FindByID(ctx context.Context, id, tenantID uuid.UUID) (*models.Account, error)
	FindByCode(ctx context.Context, code string, tenantID uuid.UUID) (*models.Account, error)
	FindAll(ctx context.Context, tenantID uuid.UUID, filter AccountFilter) ([]models.Account, int64, error)
	FindByType(ctx context.Context, tenantID uuid.UUID, accountType models.AccountType) ([]models.Account, error)
	GetChartOfAccounts(ctx context.Context, tenantID uuid.UUID) ([]models.Account, error)
	UpdateBalance(ctx context.Context, id uuid.UUID, amount float64) error
	CreateDefaultAccounts(ctx context.Context, tenantID uuid.UUID) error
}

// AccountFilter defines filter options for listing accounts
type AccountFilter struct {
	Type      string
	SubType   string
	Search    string
	IsActive  *bool
	ParentID  *uuid.UUID
	Page      int
	PerPage   int
	SortBy    string
	SortOrder string
}

type accountRepository struct {
	db *gorm.DB
}

// NewAccountRepository creates a new account repository
func NewAccountRepository(db *gorm.DB) AccountRepository {
	return &accountRepository{db: db}
}

func (r *accountRepository) Create(ctx context.Context, account *models.Account) error {
	return r.db.WithContext(ctx).Create(account).Error
}

func (r *accountRepository) Update(ctx context.Context, account *models.Account) error {
	return r.db.WithContext(ctx).Save(account).Error
}

func (r *accountRepository) Delete(ctx context.Context, id, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ? AND is_system = false", id, tenantID).
		Delete(&models.Account{}).Error
}

func (r *accountRepository) FindByID(ctx context.Context, id, tenantID uuid.UUID) (*models.Account, error) {
	var account models.Account
	err := r.db.WithContext(ctx).
		Preload("Parent").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&account).Error
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *accountRepository) FindByCode(ctx context.Context, code string, tenantID uuid.UUID) (*models.Account, error) {
	var account models.Account
	err := r.db.WithContext(ctx).
		Where("code = ? AND tenant_id = ?", code, tenantID).
		First(&account).Error
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *accountRepository) FindAll(ctx context.Context, tenantID uuid.UUID, filter AccountFilter) ([]models.Account, int64, error) {
	var accounts []models.Account
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Account{}).Where("tenant_id = ?", tenantID)

	if filter.Type != "" {
		query = query.Where("type = ?", filter.Type)
	}
	if filter.SubType != "" {
		query = query.Where("sub_type = ?", filter.SubType)
	}
	if filter.Search != "" {
		searchPattern := "%" + filter.Search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ?", searchPattern, searchPattern)
	}
	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}
	if filter.ParentID != nil {
		query = query.Where("parent_id = ?", *filter.ParentID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy := filter.SortBy
	if sortBy == "" {
		sortBy = "code"
	}
	sortOrder := filter.SortOrder
	if sortOrder == "" {
		sortOrder = "asc"
	}
	query = query.Order(sortBy + " " + sortOrder)

	page := filter.Page
	if page < 1 {
		page = 1
	}
	perPage := filter.PerPage
	if perPage < 1 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	err := query.Offset(offset).Limit(perPage).Find(&accounts).Error
	return accounts, total, err
}

func (r *accountRepository) FindByType(ctx context.Context, tenantID uuid.UUID, accountType models.AccountType) ([]models.Account, error) {
	var accounts []models.Account
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND type = ? AND is_active = true", tenantID, accountType).
		Order("code asc").
		Find(&accounts).Error
	return accounts, err
}

func (r *accountRepository) GetChartOfAccounts(ctx context.Context, tenantID uuid.UUID) ([]models.Account, error) {
	var accounts []models.Account
	err := r.db.WithContext(ctx).
		Preload("Children").
		Where("tenant_id = ? AND parent_id IS NULL", tenantID).
		Order("type, code").
		Find(&accounts).Error
	return accounts, err
}

func (r *accountRepository) UpdateBalance(ctx context.Context, id uuid.UUID, amount float64) error {
	return r.db.WithContext(ctx).
		Model(&models.Account{}).
		Where("id = ?", id).
		Update("current_balance", gorm.Expr("current_balance + ?", amount)).Error
}

func (r *accountRepository) CreateDefaultAccounts(ctx context.Context, tenantID uuid.UUID) error {
	defaultAccounts := []models.Account{
		// Assets
		{TenantID: tenantID, Code: "1000", Name: "Assets", Type: models.AccountTypeAsset, IsSystem: true},
		{TenantID: tenantID, Code: "1100", Name: "Cash", Type: models.AccountTypeAsset, SubType: models.AccountSubTypeCash, IsSystem: true},
		{TenantID: tenantID, Code: "1200", Name: "Bank Accounts", Type: models.AccountTypeAsset, SubType: models.AccountSubTypeBank, IsSystem: true},
		{TenantID: tenantID, Code: "1300", Name: "Accounts Receivable", Type: models.AccountTypeAsset, SubType: models.AccountSubTypeReceivable, IsSystem: true},
		{TenantID: tenantID, Code: "1400", Name: "Inventory", Type: models.AccountTypeAsset, SubType: models.AccountSubTypeInventory, IsSystem: true},
		{TenantID: tenantID, Code: "1500", Name: "Fixed Assets", Type: models.AccountTypeAsset, SubType: models.AccountSubTypeFixedAsset, IsSystem: true},

		// Liabilities
		{TenantID: tenantID, Code: "2000", Name: "Liabilities", Type: models.AccountTypeLiability, IsSystem: true},
		{TenantID: tenantID, Code: "2100", Name: "Accounts Payable", Type: models.AccountTypeLiability, SubType: models.AccountSubTypePayable, IsSystem: true},
		{TenantID: tenantID, Code: "2200", Name: "GST Payable", Type: models.AccountTypeLiability, SubType: models.AccountSubTypeTax, IsSystem: true},
		{TenantID: tenantID, Code: "2300", Name: "TDS Payable", Type: models.AccountTypeLiability, SubType: models.AccountSubTypeTax, IsSystem: true},

		// Equity
		{TenantID: tenantID, Code: "3000", Name: "Equity", Type: models.AccountTypeEquity, IsSystem: true},
		{TenantID: tenantID, Code: "3100", Name: "Owner's Capital", Type: models.AccountTypeEquity, SubType: models.AccountSubTypeCapital, IsSystem: true},
		{TenantID: tenantID, Code: "3200", Name: "Retained Earnings", Type: models.AccountTypeEquity, IsSystem: true},

		// Income
		{TenantID: tenantID, Code: "4000", Name: "Income", Type: models.AccountTypeIncome, IsSystem: true},
		{TenantID: tenantID, Code: "4100", Name: "Sales Revenue", Type: models.AccountTypeIncome, SubType: models.AccountSubTypeSales, IsSystem: true},
		{TenantID: tenantID, Code: "4200", Name: "Service Revenue", Type: models.AccountTypeIncome, SubType: models.AccountSubTypeSales, IsSystem: true},
		{TenantID: tenantID, Code: "4900", Name: "Other Income", Type: models.AccountTypeIncome, IsSystem: true},

		// Expenses
		{TenantID: tenantID, Code: "5000", Name: "Expenses", Type: models.AccountTypeExpense, IsSystem: true},
		{TenantID: tenantID, Code: "5100", Name: "Cost of Goods Sold", Type: models.AccountTypeExpense, SubType: models.AccountSubTypePurchase, IsSystem: true},
		{TenantID: tenantID, Code: "5200", Name: "Purchase", Type: models.AccountTypeExpense, SubType: models.AccountSubTypePurchase, IsSystem: true},
		{TenantID: tenantID, Code: "5300", Name: "Rent Expense", Type: models.AccountTypeExpense, SubType: models.AccountSubTypeIndirectExpense, IsSystem: true},
		{TenantID: tenantID, Code: "5400", Name: "Salary Expense", Type: models.AccountTypeExpense, SubType: models.AccountSubTypeIndirectExpense, IsSystem: true},
		{TenantID: tenantID, Code: "5500", Name: "Utilities Expense", Type: models.AccountTypeExpense, SubType: models.AccountSubTypeIndirectExpense, IsSystem: true},
		{TenantID: tenantID, Code: "5600", Name: "Marketing Expense", Type: models.AccountTypeExpense, SubType: models.AccountSubTypeIndirectExpense, IsSystem: true},
		{TenantID: tenantID, Code: "5900", Name: "Other Expenses", Type: models.AccountTypeExpense, IsSystem: true},
	}

	for i := range defaultAccounts {
		defaultAccounts[i].IsActive = true
	}

	return r.db.WithContext(ctx).CreateInBatches(defaultAccounts, 100).Error
}
