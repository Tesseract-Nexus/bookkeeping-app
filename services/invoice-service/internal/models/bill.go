package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// BillStatus represents the status of a bill
type BillStatus string

const (
	BillStatusDraft     BillStatus = "draft"
	BillStatusPending   BillStatus = "pending"
	BillStatusApproved  BillStatus = "approved"
	BillStatusPartial   BillStatus = "partial"
	BillStatusPaid      BillStatus = "paid"
	BillStatusOverdue   BillStatus = "overdue"
	BillStatusCancelled BillStatus = "cancelled"
)

// Bill represents a purchase bill from a vendor
type Bill struct {
	ID            uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID      uuid.UUID       `gorm:"type:uuid;index;not null" json:"tenant_id"`
	BillNumber    string          `gorm:"size:50;uniqueIndex:idx_tenant_bill_num" json:"bill_number"`
	VendorBillNo  string          `gorm:"size:50" json:"vendor_bill_no"`
	VendorID      uuid.UUID       `gorm:"type:uuid;index" json:"vendor_id"`
	VendorName    string          `gorm:"size:200" json:"vendor_name"`
	VendorGSTIN   string          `gorm:"size:15" json:"vendor_gstin,omitempty"`
	VendorAddress string          `gorm:"type:text" json:"vendor_address"`
	VendorState   string          `gorm:"size:50" json:"vendor_state"`
	VendorEmail   string          `gorm:"size:255" json:"vendor_email"`
	VendorPhone   string          `gorm:"size:20" json:"vendor_phone"`
	BillDate      time.Time       `gorm:"not null" json:"bill_date"`
	DueDate       time.Time       `json:"due_date"`
	Status        BillStatus      `gorm:"size:20;default:'draft'" json:"status"`
	Items         []BillItem      `gorm:"foreignKey:BillID" json:"items"`
	Payments      []BillPayment   `gorm:"foreignKey:BillID" json:"payments,omitempty"`

	// Amounts
	Subtotal       decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"subtotal"`
	DiscountType   string          `gorm:"size:20" json:"discount_type"` // percentage or fixed
	DiscountValue  decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"discount_value"`
	DiscountAmount decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"discount_amount"`
	TaxableAmount  decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"taxable_amount"`

	// GST components (Input Tax Credit)
	CGSTAmount     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"cgst_amount"`
	SGSTAmount     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"sgst_amount"`
	IGSTAmount     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"igst_amount"`
	CessAmount     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"cess_amount"`
	TotalTax       decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"total_tax"`

	// TDS fields
	TDSApplicable  bool            `gorm:"default:false" json:"tds_applicable"`
	TDSSection     string          `gorm:"size:20" json:"tds_section,omitempty"`
	TDSRate        decimal.Decimal `gorm:"type:decimal(5,2);default:0" json:"tds_rate"`
	TDSAmount      decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"tds_amount"`

	TotalAmount    decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"total_amount"`
	AmountPaid     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"amount_paid"`
	BalanceDue     decimal.Decimal `gorm:"type:decimal(15,2);default:0" json:"balance_due"`

	// ITC eligibility
	ITCEligible    bool   `gorm:"default:true" json:"itc_eligible"`
	ITCCategory    string `gorm:"size:20" json:"itc_category"` // goods, services, capital
	ITCClaimedDate *time.Time `json:"itc_claimed_date,omitempty"`

	Notes          string         `gorm:"type:text" json:"notes"`
	Attachments    string         `gorm:"type:jsonb" json:"attachments"` // JSON array of attachment URLs
	ApprovedBy     *uuid.UUID     `gorm:"type:uuid" json:"approved_by,omitempty"`
	ApprovedAt     *time.Time     `json:"approved_at,omitempty"`
	CreatedBy      uuid.UUID      `gorm:"type:uuid" json:"created_by"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for Bill
func (Bill) TableName() string {
	return "bills"
}

// BeforeCreate hook
func (b *Bill) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// CalculateTotals recalculates all bill totals
func (b *Bill) CalculateTotals() {
	b.Subtotal = decimal.Zero
	b.CGSTAmount = decimal.Zero
	b.SGSTAmount = decimal.Zero
	b.IGSTAmount = decimal.Zero
	b.CessAmount = decimal.Zero

	for _, item := range b.Items {
		b.Subtotal = b.Subtotal.Add(item.Amount)
		b.CGSTAmount = b.CGSTAmount.Add(item.CGSTAmount)
		b.SGSTAmount = b.SGSTAmount.Add(item.SGSTAmount)
		b.IGSTAmount = b.IGSTAmount.Add(item.IGSTAmount)
		b.CessAmount = b.CessAmount.Add(item.CessAmount)
	}

	// Apply discount
	if b.DiscountType == "percentage" {
		b.DiscountAmount = b.Subtotal.Mul(b.DiscountValue.Div(decimal.NewFromInt(100)))
	} else {
		b.DiscountAmount = b.DiscountValue
	}

	b.TaxableAmount = b.Subtotal.Sub(b.DiscountAmount)
	b.TotalTax = b.CGSTAmount.Add(b.SGSTAmount).Add(b.IGSTAmount).Add(b.CessAmount)

	// Calculate TDS if applicable
	if b.TDSApplicable && b.TDSRate.GreaterThan(decimal.Zero) {
		b.TDSAmount = b.TaxableAmount.Mul(b.TDSRate.Div(decimal.NewFromInt(100)))
	}

	b.TotalAmount = b.TaxableAmount.Add(b.TotalTax).Sub(b.TDSAmount)
	b.BalanceDue = b.TotalAmount.Sub(b.AmountPaid)
}

// BillItem represents a line item in a bill
type BillItem struct {
	ID          uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	BillID      uuid.UUID       `gorm:"type:uuid;index;not null" json:"bill_id"`
	ProductID   *uuid.UUID      `gorm:"type:uuid" json:"product_id,omitempty"`
	Description string          `gorm:"size:500;not null" json:"description"`
	HSNCode     string          `gorm:"size:10" json:"hsn_code"`
	SACCode     string          `gorm:"size:10" json:"sac_code"`
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

	// ITC
	ITCEligible bool            `gorm:"default:true" json:"itc_eligible"`
	TotalAmount decimal.Decimal `gorm:"type:decimal(15,2);not null" json:"total_amount"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// TableName returns the table name for BillItem
func (BillItem) TableName() string {
	return "bill_items"
}

// BeforeCreate hook
func (i *BillItem) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

// CalculateAmounts calculates line item amounts including taxes
func (i *BillItem) CalculateAmounts() {
	i.Amount = i.Quantity.Mul(i.Rate)

	hundred := decimal.NewFromInt(100)
	i.CGSTAmount = i.Amount.Mul(i.CGSTRate.Div(hundred))
	i.SGSTAmount = i.Amount.Mul(i.SGSTRate.Div(hundred))
	i.IGSTAmount = i.Amount.Mul(i.IGSTRate.Div(hundred))
	i.CessAmount = i.Amount.Mul(i.CessRate.Div(hundred))

	i.TotalAmount = i.Amount.Add(i.CGSTAmount).Add(i.SGSTAmount).Add(i.IGSTAmount).Add(i.CessAmount)
}

// BillPayment represents a payment made for a bill
type BillPayment struct {
	ID            uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID      uuid.UUID       `gorm:"type:uuid;index;not null" json:"tenant_id"`
	BillID        uuid.UUID       `gorm:"type:uuid;index;not null" json:"bill_id"`
	PaymentNumber string          `gorm:"size:50" json:"payment_number"`
	PaymentDate   time.Time       `gorm:"not null" json:"payment_date"`
	Amount        decimal.Decimal `gorm:"type:decimal(15,2);not null" json:"amount"`
	PaymentMethod string          `gorm:"size:50" json:"payment_method"` // cash, bank, upi, card
	BankAccountID *uuid.UUID      `gorm:"type:uuid" json:"bank_account_id,omitempty"`
	Reference     string          `gorm:"size:100" json:"reference"`
	Notes         string          `gorm:"type:text" json:"notes"`
	CreatedBy     uuid.UUID       `gorm:"type:uuid" json:"created_by"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	DeletedAt     gorm.DeletedAt  `gorm:"index" json:"-"`
}

// TableName returns the table name for BillPayment
func (BillPayment) TableName() string {
	return "bill_payments"
}

// BeforeCreate hook
func (p *BillPayment) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
