package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AccountType represents the type of account
type AccountType string

const (
	AccountTypeAsset     AccountType = "asset"
	AccountTypeLiability AccountType = "liability"
	AccountTypeEquity    AccountType = "equity"
	AccountTypeIncome    AccountType = "income"
	AccountTypeExpense   AccountType = "expense"
)

// AccountSubType represents the sub-type of account
type AccountSubType string

const (
	AccountSubTypeCash          AccountSubType = "cash"
	AccountSubTypeBank          AccountSubType = "bank"
	AccountSubTypeReceivable    AccountSubType = "receivable"
	AccountSubTypePayable       AccountSubType = "payable"
	AccountSubTypeInventory     AccountSubType = "inventory"
	AccountSubTypeFixedAsset    AccountSubType = "fixed_asset"
	AccountSubTypeSales         AccountSubType = "sales"
	AccountSubTypePurchase      AccountSubType = "purchase"
	AccountSubTypeDirectExpense AccountSubType = "direct_expense"
	AccountSubTypeIndirectExpense AccountSubType = "indirect_expense"
	AccountSubTypeTax           AccountSubType = "tax"
	AccountSubTypeCapital       AccountSubType = "capital"
)

// Account represents a ledger account in the chart of accounts
type Account struct {
	ID       uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID      `gorm:"type:uuid;index;not null" json:"tenant_id"`
	ParentID *uuid.UUID     `gorm:"type:uuid;index" json:"parent_id,omitempty"`

	Code        string          `gorm:"size:20" json:"code"`
	Name        string          `gorm:"size:255;not null" json:"name"`
	Type        AccountType     `gorm:"type:varchar(50);not null" json:"type"`
	SubType     AccountSubType  `gorm:"type:varchar(50)" json:"sub_type"`
	Description string          `gorm:"type:text" json:"description"`

	IsSystem bool `gorm:"default:false" json:"is_system"`
	IsActive bool `gorm:"default:true" json:"is_active"`

	OpeningBalance float64 `gorm:"type:decimal(15,2);default:0" json:"opening_balance"`
	CurrentBalance float64 `gorm:"type:decimal(15,2);default:0" json:"current_balance"`

	Settings map[string]interface{} `gorm:"type:jsonb;default:'{}'" json:"settings"`

	// Relations
	Parent   *Account  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []Account `gorm:"foreignKey:ParentID" json:"children,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for Account
func (Account) TableName() string {
	return "accounts"
}

// BeforeCreate hook
func (a *Account) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// IsDebitNature returns true if account has debit nature (Asset, Expense)
func (a *Account) IsDebitNature() bool {
	return a.Type == AccountTypeAsset || a.Type == AccountTypeExpense
}

// IsCreditNature returns true if account has credit nature (Liability, Equity, Income)
func (a *Account) IsCreditNature() bool {
	return a.Type == AccountTypeLiability || a.Type == AccountTypeEquity || a.Type == AccountTypeIncome
}

// BankAccount represents a bank account linked to a ledger account
type BankAccount struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID  uuid.UUID  `gorm:"type:uuid;index;not null" json:"tenant_id"`
	AccountID *uuid.UUID `gorm:"type:uuid" json:"account_id,omitempty"`

	BankName               string `gorm:"size:255;not null" json:"bank_name"`
	AccountName            string `gorm:"size:255" json:"account_name"`
	AccountNumberEncrypted string `gorm:"size:500" json:"-"`
	AccountNumber          string `gorm:"-" json:"account_number,omitempty"`
	IFSCCode               string `gorm:"size:11" json:"ifsc_code"`
	Branch                 string `gorm:"size:255" json:"branch"`

	AccountType string `gorm:"size:50" json:"account_type"` // savings, current, overdraft

	OpeningBalance float64 `gorm:"type:decimal(15,2);default:0" json:"opening_balance"`
	CurrentBalance float64 `gorm:"type:decimal(15,2);default:0" json:"current_balance"`

	IsPrimary bool `gorm:"default:false" json:"is_primary"`
	IsActive  bool `gorm:"default:true" json:"is_active"`

	// For payment gateway integration
	RazorpayAccountID string `gorm:"size:100" json:"razorpay_account_id,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for BankAccount
func (BankAccount) TableName() string {
	return "bank_accounts"
}

// BeforeCreate hook
func (b *BankAccount) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// FinancialYear represents a financial year for closing
type FinancialYear struct {
	ID       uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;index;not null" json:"tenant_id"`

	YearStart time.Time `gorm:"type:date;not null" json:"year_start"`
	YearEnd   time.Time `gorm:"type:date;not null" json:"year_end"`
	Name      string    `gorm:"size:50" json:"name"` // e.g., "FY 2024-25"

	IsCurrent bool       `gorm:"default:false" json:"is_current"`
	IsClosed  bool       `gorm:"default:false" json:"is_closed"`
	ClosedAt  *time.Time `json:"closed_at,omitempty"`
	ClosedBy  *uuid.UUID `gorm:"type:uuid" json:"closed_by,omitempty"`

	OpeningBalances map[string]interface{} `gorm:"type:jsonb" json:"opening_balances,omitempty"`
	ClosingBalances map[string]interface{} `gorm:"type:jsonb" json:"closing_balances,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the table name for FinancialYear
func (FinancialYear) TableName() string {
	return "financial_years"
}

// BeforeCreate hook
func (f *FinancialYear) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}
