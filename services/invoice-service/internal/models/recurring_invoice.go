package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// RecurrenceFrequency represents how often an invoice recurs
type RecurrenceFrequency string

const (
	FrequencyDaily    RecurrenceFrequency = "daily"
	FrequencyWeekly   RecurrenceFrequency = "weekly"
	FrequencyBiweekly RecurrenceFrequency = "biweekly"
	FrequencyMonthly  RecurrenceFrequency = "monthly"
	FrequencyQuarterly RecurrenceFrequency = "quarterly"
	FrequencyAnnually RecurrenceFrequency = "annually"
)

// RecurringInvoiceStatus represents the status of a recurring invoice
type RecurringInvoiceStatus string

const (
	RecurringStatusActive    RecurringInvoiceStatus = "active"
	RecurringStatusPaused    RecurringInvoiceStatus = "paused"
	RecurringStatusCompleted RecurringInvoiceStatus = "completed"
	RecurringStatusCancelled RecurringInvoiceStatus = "cancelled"
)

// RecurringInvoice represents a template for generating recurring invoices
type RecurringInvoice struct {
	ID              uuid.UUID              `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID        uuid.UUID              `gorm:"type:uuid;index;not null" json:"tenant_id"`
	Name            string                 `gorm:"size:200;not null" json:"name"`

	// Customer info (copied to generated invoices)
	CustomerID      uuid.UUID              `gorm:"type:uuid;index;not null" json:"customer_id"`
	CustomerName    string                 `gorm:"size:200" json:"customer_name"`
	CustomerGSTIN   string                 `gorm:"size:15" json:"customer_gstin,omitempty"`
	CustomerAddress string                 `gorm:"type:text" json:"customer_address"`
	CustomerState   string                 `gorm:"size:50" json:"customer_state"`
	CustomerEmail   string                 `gorm:"size:255" json:"customer_email"`
	CustomerPhone   string                 `gorm:"size:20" json:"customer_phone"`

	// Recurrence settings
	Frequency       RecurrenceFrequency    `gorm:"size:20;not null" json:"frequency"`
	IntervalCount   int                    `gorm:"default:1" json:"interval_count"` // e.g., every 2 weeks
	StartDate       time.Time              `gorm:"not null" json:"start_date"`
	EndDate         *time.Time             `json:"end_date,omitempty"` // null means indefinite
	MaxOccurrences  *int                   `json:"max_occurrences,omitempty"`
	OccurrenceCount int                    `gorm:"default:0" json:"occurrence_count"`
	NextRunDate     time.Time              `gorm:"index" json:"next_run_date"`
	LastRunDate     *time.Time             `json:"last_run_date,omitempty"`
	DaysUntilDue    int                    `gorm:"default:30" json:"days_until_due"`

	// Status
	Status          RecurringInvoiceStatus `gorm:"size:20;default:'active'" json:"status"`

	// Invoice template data
	Items           []RecurringInvoiceItem `gorm:"foreignKey:RecurringInvoiceID" json:"items"`

	// Amounts (calculated from items)
	Subtotal       decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"subtotal"`
	DiscountType   string          `gorm:"size:20" json:"discount_type"`
	DiscountValue  decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"discount_value"`
	DiscountAmount decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"discount_amount"`
	TaxableAmount  decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"taxable_amount"`

	// GST components
	CGSTAmount     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"cgst_amount"`
	SGSTAmount     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"sgst_amount"`
	IGSTAmount     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"igst_amount"`
	CessAmount     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"cess_amount"`
	TotalTax       decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"total_tax"`
	TotalAmount    decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"total_amount"`

	// Options
	AutoSend       bool   `gorm:"default:false" json:"auto_send"`
	Notes          string `gorm:"type:text" json:"notes"`
	Terms          string `gorm:"type:text" json:"terms"`

	// Audit fields
	CreatedBy      uuid.UUID      `gorm:"type:uuid" json:"created_by"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for RecurringInvoice
func (RecurringInvoice) TableName() string {
	return "recurring_invoices"
}

// BeforeCreate hook
func (ri *RecurringInvoice) BeforeCreate(tx *gorm.DB) error {
	if ri.ID == uuid.Nil {
		ri.ID = uuid.New()
	}
	return nil
}

// CalculateTotals recalculates all recurring invoice totals
func (ri *RecurringInvoice) CalculateTotals() {
	ri.Subtotal = decimal.Zero
	ri.CGSTAmount = decimal.Zero
	ri.SGSTAmount = decimal.Zero
	ri.IGSTAmount = decimal.Zero
	ri.CessAmount = decimal.Zero

	for _, item := range ri.Items {
		ri.Subtotal = ri.Subtotal.Add(item.Amount)
		ri.CGSTAmount = ri.CGSTAmount.Add(item.CGSTAmount)
		ri.SGSTAmount = ri.SGSTAmount.Add(item.SGSTAmount)
		ri.IGSTAmount = ri.IGSTAmount.Add(item.IGSTAmount)
		ri.CessAmount = ri.CessAmount.Add(item.CessAmount)
	}

	if ri.DiscountType == "percentage" {
		ri.DiscountAmount = ri.Subtotal.Mul(ri.DiscountValue.Div(decimal.NewFromInt(100)))
	} else {
		ri.DiscountAmount = ri.DiscountValue
	}

	ri.TaxableAmount = ri.Subtotal.Sub(ri.DiscountAmount)
	ri.TotalTax = ri.CGSTAmount.Add(ri.SGSTAmount).Add(ri.IGSTAmount).Add(ri.CessAmount)
	ri.TotalAmount = ri.TaxableAmount.Add(ri.TotalTax)
}

// CalculateNextRunDate calculates the next run date based on frequency
func (ri *RecurringInvoice) CalculateNextRunDate() time.Time {
	base := ri.NextRunDate
	if ri.LastRunDate != nil {
		base = *ri.LastRunDate
	}

	interval := ri.IntervalCount
	if interval <= 0 {
		interval = 1
	}

	switch ri.Frequency {
	case FrequencyDaily:
		return base.AddDate(0, 0, interval)
	case FrequencyWeekly:
		return base.AddDate(0, 0, 7*interval)
	case FrequencyBiweekly:
		return base.AddDate(0, 0, 14*interval)
	case FrequencyMonthly:
		return base.AddDate(0, interval, 0)
	case FrequencyQuarterly:
		return base.AddDate(0, 3*interval, 0)
	case FrequencyAnnually:
		return base.AddDate(interval, 0, 0)
	default:
		return base.AddDate(0, 1, 0) // Default to monthly
	}
}

// ShouldGenerate checks if an invoice should be generated
func (ri *RecurringInvoice) ShouldGenerate() bool {
	if ri.Status != RecurringStatusActive {
		return false
	}

	now := time.Now()
	if ri.NextRunDate.After(now) {
		return false
	}

	if ri.EndDate != nil && now.After(*ri.EndDate) {
		return false
	}

	if ri.MaxOccurrences != nil && ri.OccurrenceCount >= *ri.MaxOccurrences {
		return false
	}

	return true
}

// RecurringInvoiceItem represents a line item template
type RecurringInvoiceItem struct {
	ID                  uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	RecurringInvoiceID  uuid.UUID       `gorm:"type:uuid;index;not null" json:"recurring_invoice_id"`
	ProductID           *uuid.UUID      `gorm:"type:uuid" json:"product_id,omitempty"`
	Description         string          `gorm:"size:500;not null" json:"description"`
	HSNCode             string          `gorm:"size:10" json:"hsn_code"`
	Quantity            decimal.Decimal `gorm:"type:decimal(10,3);not null" json:"quantity"`
	Unit                string          `gorm:"size:20;default:'pcs'" json:"unit"`
	Rate                decimal.Decimal `gorm:"type:decimal(15,2);not null" json:"rate"`
	Amount              decimal.Decimal `gorm:"type:decimal(15,2);not null" json:"amount"`

	// Tax rates
	CGSTRate   decimal.Decimal `gorm:"type:decimal(5,2);default:0" json:"cgst_rate"`
	SGSTRate   decimal.Decimal `gorm:"type:decimal(5,2);default:0" json:"sgst_rate"`
	IGSTRate   decimal.Decimal `gorm:"type:decimal(5,2);default:0" json:"igst_rate"`
	CessRate   decimal.Decimal `gorm:"type:decimal(5,2);default:0" json:"cess_rate"`

	// Tax amounts
	CGSTAmount decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"cgst_amount"`
	SGSTAmount decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"sgst_amount"`
	IGSTAmount decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"igst_amount"`
	CessAmount decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"cess_amount"`

	TotalAmount decimal.Decimal `gorm:"type:decimal(15,2);not null" json:"total_amount"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// TableName returns the table name for RecurringInvoiceItem
func (RecurringInvoiceItem) TableName() string {
	return "recurring_invoice_items"
}

// BeforeCreate hook
func (rii *RecurringInvoiceItem) BeforeCreate(tx *gorm.DB) error {
	if rii.ID == uuid.Nil {
		rii.ID = uuid.New()
	}
	return nil
}

// CalculateAmounts calculates line item amounts including taxes
func (rii *RecurringInvoiceItem) CalculateAmounts() {
	rii.Amount = rii.Quantity.Mul(rii.Rate)

	hundred := decimal.NewFromInt(100)
	rii.CGSTAmount = rii.Amount.Mul(rii.CGSTRate.Div(hundred))
	rii.SGSTAmount = rii.Amount.Mul(rii.SGSTRate.Div(hundred))
	rii.IGSTAmount = rii.Amount.Mul(rii.IGSTRate.Div(hundred))
	rii.CessAmount = rii.Amount.Mul(rii.CessRate.Div(hundred))

	rii.TotalAmount = rii.Amount.Add(rii.CGSTAmount).Add(rii.SGSTAmount).Add(rii.IGSTAmount).Add(rii.CessAmount)
}

// GeneratedInvoice tracks which invoices were generated from recurring templates
type GeneratedInvoice struct {
	ID                  uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	RecurringInvoiceID  uuid.UUID  `gorm:"type:uuid;index;not null" json:"recurring_invoice_id"`
	InvoiceID           uuid.UUID  `gorm:"type:uuid;index;not null" json:"invoice_id"`
	OccurrenceNumber    int        `gorm:"not null" json:"occurrence_number"`
	GeneratedAt         time.Time  `gorm:"not null" json:"generated_at"`
}

// TableName returns the table name for GeneratedInvoice
func (GeneratedInvoice) TableName() string {
	return "generated_invoices"
}

// BeforeCreate hook
func (gi *GeneratedInvoice) BeforeCreate(tx *gorm.DB) error {
	if gi.ID == uuid.Nil {
		gi.ID = uuid.New()
	}
	return nil
}
