package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// CreditNoteStatus represents the status of a credit note
type CreditNoteStatus string

const (
	CreditNoteStatusDraft     CreditNoteStatus = "draft"
	CreditNoteStatusApproved  CreditNoteStatus = "approved"
	CreditNoteStatusApplied   CreditNoteStatus = "applied"   // Applied to invoices
	CreditNoteStatusRefunded  CreditNoteStatus = "refunded"  // Refunded to customer
	CreditNoteStatusCancelled CreditNoteStatus = "cancelled"
)

// CreditNoteReason represents the reason for issuing a credit note
type CreditNoteReason string

const (
	CreditNoteReasonReturn         CreditNoteReason = "goods_returned"
	CreditNoteReasonDefective      CreditNoteReason = "defective_goods"
	CreditNoteReasonPriceReduction CreditNoteReason = "price_reduction"
	CreditNoteReasonDiscountAfter  CreditNoteReason = "discount_after_sale"
	CreditNoteReasonOvercharge     CreditNoteReason = "overcharge"
	CreditNoteReasonOther          CreditNoteReason = "other"
)

// CreditNote represents a credit note issued to a customer
type CreditNote struct {
	ID               uuid.UUID        `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID         uuid.UUID        `gorm:"type:uuid;index;not null" json:"tenant_id"`
	CreditNoteNumber string           `gorm:"size:50;uniqueIndex:idx_tenant_cn_num" json:"credit_note_number"`
	CreditNoteDate   time.Time        `gorm:"not null" json:"credit_note_date"`

	// Customer
	CustomerID   uuid.UUID `gorm:"type:uuid;index;not null" json:"customer_id"`
	CustomerName string    `gorm:"size:200" json:"customer_name"`

	// Original Invoice Reference (optional)
	InvoiceID     *uuid.UUID `gorm:"type:uuid;index" json:"invoice_id"`
	InvoiceNumber string     `gorm:"size:50" json:"invoice_number"`

	// Reason
	Reason       CreditNoteReason `gorm:"size:50;not null" json:"reason"`
	ReasonDetail string           `gorm:"type:text" json:"reason_detail"`

	// Status
	Status     CreditNoteStatus `gorm:"size:20;default:'draft'" json:"status"`
	ApprovedAt *time.Time       `json:"approved_at,omitempty"`
	ApprovedBy *uuid.UUID       `gorm:"type:uuid" json:"approved_by,omitempty"`

	// Amounts
	Subtotal   decimal.Decimal `gorm:"type:decimal(18,2);not null" json:"subtotal"`

	// GST (India)
	CGSTAmount decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"cgst_amount"`
	SGSTAmount decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"sgst_amount"`
	IGSTAmount decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"igst_amount"`
	CessAmount decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"cess_amount"`

	// GST (Australia)
	GSTAmount  decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"gst_amount"`

	TotalTax   decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"total_tax"`
	TotalAmount decimal.Decimal `gorm:"type:decimal(18,2);not null" json:"total_amount"`

	// Application/Refund tracking
	AmountApplied  decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"amount_applied"`
	AmountRefunded decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"amount_refunded"`
	BalanceAmount  decimal.Decimal `gorm:"type:decimal(18,2);not null" json:"balance_amount"`

	// Currency
	Currency     string          `gorm:"size:3;default:'INR'" json:"currency"`
	ExchangeRate decimal.Decimal `gorm:"type:decimal(18,6);default:1" json:"exchange_rate"`

	// GST Place of Supply (India)
	PlaceOfSupply string `gorm:"size:50" json:"place_of_supply"`

	Notes string `gorm:"type:text" json:"notes"`

	// Items
	Items []CreditNoteItem `gorm:"foreignKey:CreditNoteID" json:"items"`

	// Applications
	Applications []CreditNoteApplication `gorm:"foreignKey:CreditNoteID" json:"applications,omitempty"`

	CreatedBy uuid.UUID      `gorm:"type:uuid" json:"created_by"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for CreditNote
func (CreditNote) TableName() string {
	return "credit_notes"
}

// BeforeCreate hook
func (cn *CreditNote) BeforeCreate(tx *gorm.DB) error {
	if cn.ID == uuid.Nil {
		cn.ID = uuid.New()
	}
	return nil
}

// CreditNoteItem represents a line item in a credit note
type CreditNoteItem struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreditNoteID uuid.UUID `gorm:"type:uuid;index;not null" json:"credit_note_id"`
	LineNumber   int       `gorm:"not null" json:"line_number"`

	// Product reference
	ProductID   *uuid.UUID `gorm:"type:uuid" json:"product_id"`
	Description string     `gorm:"type:text;not null" json:"description"`

	// Tax codes
	HSNSACCode string `gorm:"size:20" json:"hsn_sac_code"`

	// Quantity and pricing
	Quantity  decimal.Decimal `gorm:"type:decimal(18,4);not null" json:"quantity"`
	UnitPrice decimal.Decimal `gorm:"type:decimal(18,4);not null" json:"unit_price"`

	// Tax
	CGSTRate   decimal.Decimal `gorm:"type:decimal(5,2);default:0" json:"cgst_rate"`
	CGSTAmount decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"cgst_amount"`
	SGSTRate   decimal.Decimal `gorm:"type:decimal(5,2);default:0" json:"sgst_rate"`
	SGSTAmount decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"sgst_amount"`
	IGSTRate   decimal.Decimal `gorm:"type:decimal(5,2);default:0" json:"igst_rate"`
	IGSTAmount decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"igst_amount"`
	GSTRate    decimal.Decimal `gorm:"type:decimal(5,2);default:0" json:"gst_rate"` // Australia
	GSTAmount  decimal.Decimal `gorm:"type:decimal(18,2);default:0" json:"gst_amount"`

	LineTotal decimal.Decimal `gorm:"type:decimal(18,2);not null" json:"line_total"`

	// Account
	AccountID *uuid.UUID `gorm:"type:uuid" json:"account_id"`

	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the table name for CreditNoteItem
func (CreditNoteItem) TableName() string {
	return "credit_note_items"
}

// BeforeCreate hook
func (cni *CreditNoteItem) BeforeCreate(tx *gorm.DB) error {
	if cni.ID == uuid.Nil {
		cni.ID = uuid.New()
	}
	return nil
}

// CreditNoteApplication represents an application of credit to an invoice
type CreditNoteApplication struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreditNoteID uuid.UUID `gorm:"type:uuid;index;not null" json:"credit_note_id"`
	InvoiceID    uuid.UUID `gorm:"type:uuid;index;not null" json:"invoice_id"`

	Amount      decimal.Decimal `gorm:"type:decimal(18,2);not null" json:"amount"`
	AppliedAt   time.Time       `gorm:"not null" json:"applied_at"`
	AppliedBy   uuid.UUID       `gorm:"type:uuid" json:"applied_by"`

	Notes       string `gorm:"type:text" json:"notes"`

	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the table name for CreditNoteApplication
func (CreditNoteApplication) TableName() string {
	return "credit_note_applications"
}

// BeforeCreate hook
func (cna *CreditNoteApplication) BeforeCreate(tx *gorm.DB) error {
	if cna.ID == uuid.Nil {
		cna.ID = uuid.New()
	}
	return nil
}
