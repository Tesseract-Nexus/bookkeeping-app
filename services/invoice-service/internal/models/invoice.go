package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// InvoiceStatus represents the status of an invoice
type InvoiceStatus string

const (
	InvoiceStatusDraft     InvoiceStatus = "draft"
	InvoiceStatusSent      InvoiceStatus = "sent"
	InvoiceStatusViewed    InvoiceStatus = "viewed"
	InvoiceStatusPartial   InvoiceStatus = "partial"
	InvoiceStatusPaid      InvoiceStatus = "paid"
	InvoiceStatusOverdue   InvoiceStatus = "overdue"
	InvoiceStatusCancelled InvoiceStatus = "cancelled"
)

// Invoice represents a sales invoice
type Invoice struct {
	ID              uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID        uuid.UUID       `gorm:"type:uuid;index;not null" json:"tenant_id"`
	InvoiceNumber   string          `gorm:"size:50;uniqueIndex:idx_tenant_invoice_num" json:"invoice_number"`
	CustomerID      uuid.UUID       `gorm:"type:uuid;index" json:"customer_id"`
	CustomerName    string          `gorm:"size:200" json:"customer_name"`
	CustomerGSTIN   string          `gorm:"size:15" json:"customer_gstin,omitempty"`
	CustomerAddress string          `gorm:"type:text" json:"customer_address"`
	CustomerState   string          `gorm:"size:50" json:"customer_state"`
	CustomerEmail   string          `gorm:"size:255" json:"customer_email"`
	CustomerPhone   string          `gorm:"size:20" json:"customer_phone"`
	InvoiceDate     time.Time       `gorm:"not null" json:"invoice_date"`
	DueDate         time.Time       `json:"due_date"`
	Status          InvoiceStatus   `gorm:"size:20;default:'draft'" json:"status"`
	Items           []InvoiceItem   `gorm:"foreignKey:InvoiceID" json:"items"`
	Payments        []Payment       `gorm:"foreignKey:InvoiceID" json:"payments,omitempty"`

	// Amounts
	Subtotal       decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"subtotal"`
	DiscountType   string          `gorm:"size:20" json:"discount_type"` // percentage or fixed
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
	AmountPaid     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"amount_paid"`
	BalanceDue     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"balance_due"`

	// E-Invoice fields
	IRN            string     `gorm:"size:100" json:"irn,omitempty"`
	EInvoiceStatus string     `gorm:"size:20" json:"einvoice_status,omitempty"`
	EInvoiceDate   *time.Time `json:"einvoice_date,omitempty"`
	QRCode         string     `gorm:"type:text" json:"qr_code,omitempty"`

	Notes          string         `gorm:"type:text" json:"notes"`
	Terms          string         `gorm:"type:text" json:"terms"`
	CreatedBy      uuid.UUID      `gorm:"type:uuid" json:"created_by"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for Invoice
func (Invoice) TableName() string {
	return "invoices"
}

// BeforeCreate hook
func (i *Invoice) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

// CalculateTotals recalculates all invoice totals
func (i *Invoice) CalculateTotals() {
	i.Subtotal = decimal.Zero
	i.CGSTAmount = decimal.Zero
	i.SGSTAmount = decimal.Zero
	i.IGSTAmount = decimal.Zero
	i.CessAmount = decimal.Zero

	for _, item := range i.Items {
		i.Subtotal = i.Subtotal.Add(item.Amount)
		i.CGSTAmount = i.CGSTAmount.Add(item.CGSTAmount)
		i.SGSTAmount = i.SGSTAmount.Add(item.SGSTAmount)
		i.IGSTAmount = i.IGSTAmount.Add(item.IGSTAmount)
		i.CessAmount = i.CessAmount.Add(item.CessAmount)
	}

	// Apply discount
	if i.DiscountType == "percentage" {
		i.DiscountAmount = i.Subtotal.Mul(i.DiscountValue.Div(decimal.NewFromInt(100)))
	} else {
		i.DiscountAmount = i.DiscountValue
	}

	i.TaxableAmount = i.Subtotal.Sub(i.DiscountAmount)
	i.TotalTax = i.CGSTAmount.Add(i.SGSTAmount).Add(i.IGSTAmount).Add(i.CessAmount)
	i.TotalAmount = i.TaxableAmount.Add(i.TotalTax)
	i.BalanceDue = i.TotalAmount.Sub(i.AmountPaid)
}

// InvoiceItem represents a line item in an invoice
type InvoiceItem struct {
	ID          uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	InvoiceID   uuid.UUID       `gorm:"type:uuid;index;not null" json:"invoice_id"`
	ProductID   *uuid.UUID      `gorm:"type:uuid" json:"product_id,omitempty"`
	Description string          `gorm:"size:500;not null" json:"description"`
	HSNCode     string          `gorm:"size:10" json:"hsn_code"`
	Quantity    decimal.Decimal `gorm:"type:decimal(10,3);not null" json:"quantity"`
	Unit        string          `gorm:"size:20;default:'pcs'" json:"unit"`
	Rate        decimal.Decimal `gorm:"type:decimal(15,2);not null" json:"rate"`
	Amount      decimal.Decimal `gorm:"type:decimal(15,2);not null" json:"amount"`

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

// TableName returns the table name for InvoiceItem
func (InvoiceItem) TableName() string {
	return "invoice_items"
}

// BeforeCreate hook
func (i *InvoiceItem) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

// CalculateAmounts calculates line item amounts including taxes
func (i *InvoiceItem) CalculateAmounts() {
	i.Amount = i.Quantity.Mul(i.Rate)

	hundred := decimal.NewFromInt(100)
	i.CGSTAmount = i.Amount.Mul(i.CGSTRate.Div(hundred))
	i.SGSTAmount = i.Amount.Mul(i.SGSTRate.Div(hundred))
	i.IGSTAmount = i.Amount.Mul(i.IGSTRate.Div(hundred))
	i.CessAmount = i.Amount.Mul(i.CessRate.Div(hundred))

	i.TotalAmount = i.Amount.Add(i.CGSTAmount).Add(i.SGSTAmount).Add(i.IGSTAmount).Add(i.CessAmount)
}

// Payment represents a payment received for an invoice
type Payment struct {
	ID            uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID      uuid.UUID       `gorm:"type:uuid;index;not null" json:"tenant_id"`
	InvoiceID     uuid.UUID       `gorm:"type:uuid;index;not null" json:"invoice_id"`
	PaymentNumber string          `gorm:"size:50" json:"payment_number"`
	PaymentDate   time.Time       `gorm:"not null" json:"payment_date"`
	Amount        decimal.Decimal `gorm:"type:decimal(15,2);not null" json:"amount"`
	PaymentMethod string          `gorm:"size:50" json:"payment_method"` // cash, bank, upi, card
	Reference     string          `gorm:"size:100" json:"reference"`
	Notes         string          `gorm:"type:text" json:"notes"`
	CreatedBy     uuid.UUID       `gorm:"type:uuid" json:"created_by"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	DeletedAt     gorm.DeletedAt  `gorm:"index" json:"-"`
}

// TableName returns the table name for Payment
func (Payment) TableName() string {
	return "payments"
}

// BeforeCreate hook
func (p *Payment) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
