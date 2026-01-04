package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// ProductType represents whether this is a good or service
type ProductType string

const (
	ProductTypeGoods   ProductType = "goods"
	ProductTypeService ProductType = "service"
)

// Product represents a product or service in the catalog
type Product struct {
	ID             uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID       uuid.UUID       `gorm:"type:uuid;index;not null" json:"tenant_id"`
	Type           ProductType     `gorm:"size:20;not null" json:"type"`
	Name           string          `gorm:"size:200;not null" json:"name"`
	SKU            string          `gorm:"size:50;index" json:"sku"`
	Description    string          `gorm:"type:text" json:"description"`

	// Pricing
	SellingPrice   decimal.Decimal `gorm:"type:decimal(18,4)" json:"selling_price"`
	CostPrice      decimal.Decimal `gorm:"type:decimal(18,4)" json:"cost_price"`
	Currency       string          `gorm:"size:3;default:'INR'" json:"currency"`

	// Unit of Measure
	UnitOfMeasure  string          `gorm:"size:50" json:"unit_of_measure"` // pcs, kg, hr, etc.

	// Accounts
	IncomeAccountID  *uuid.UUID    `gorm:"type:uuid" json:"income_account_id"`
	ExpenseAccountID *uuid.UUID    `gorm:"type:uuid" json:"expense_account_id"`

	// Tax (India)
	HSNCode        string          `gorm:"size:20" json:"hsn_code"`   // HSN for goods
	SACCode        string          `gorm:"size:20" json:"sac_code"`   // SAC for services
	TaxRateID      *uuid.UUID      `gorm:"type:uuid" json:"tax_rate_id"`
	GSTRate        decimal.Decimal `gorm:"type:decimal(5,2)" json:"gst_rate"`
	IsExempt       bool            `gorm:"default:false" json:"is_exempt"`

	// Category
	Category       string          `gorm:"size:100;index" json:"category"`

	// Inventory tracking (for goods)
	TrackInventory bool            `gorm:"default:false" json:"track_inventory"`
	CurrentStock   decimal.Decimal `gorm:"type:decimal(18,4);default:0" json:"current_stock"`
	ReorderLevel   decimal.Decimal `gorm:"type:decimal(18,4)" json:"reorder_level"`

	// Status
	IsActive       bool            `gorm:"default:true" json:"is_active"`

	CreatedBy      uuid.UUID       `gorm:"type:uuid" json:"created_by"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	DeletedAt      gorm.DeletedAt  `gorm:"index" json:"-"`
}

// TableName returns the table name for Product
func (Product) TableName() string {
	return "products"
}

// BeforeCreate hook
func (p *Product) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

// TaxCode returns either HSN or SAC code based on product type
func (p *Product) TaxCode() string {
	if p.Type == ProductTypeGoods {
		return p.HSNCode
	}
	return p.SACCode
}

// UnitOfMeasureOption represents a unit of measure option
type UnitOfMeasureOption struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

// StandardUnitsOfMeasure returns common units of measure
var StandardUnitsOfMeasure = []UnitOfMeasureOption{
	{Code: "PCS", Name: "Pieces"},
	{Code: "NOS", Name: "Numbers"},
	{Code: "KG", Name: "Kilograms"},
	{Code: "G", Name: "Grams"},
	{Code: "L", Name: "Litres"},
	{Code: "ML", Name: "Millilitres"},
	{Code: "M", Name: "Metres"},
	{Code: "CM", Name: "Centimetres"},
	{Code: "SQM", Name: "Square Metres"},
	{Code: "CUM", Name: "Cubic Metres"},
	{Code: "HR", Name: "Hours"},
	{Code: "DAY", Name: "Days"},
	{Code: "MONTH", Name: "Months"},
	{Code: "YEAR", Name: "Years"},
	{Code: "SET", Name: "Sets"},
	{Code: "BOX", Name: "Boxes"},
	{Code: "PKT", Name: "Packets"},
	{Code: "PAIR", Name: "Pairs"},
	{Code: "DOZEN", Name: "Dozens"},
}
