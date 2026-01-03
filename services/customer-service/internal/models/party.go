package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// PartyType represents the type of party
type PartyType string

const (
	PartyTypeCustomer PartyType = "customer"
	PartyTypeVendor   PartyType = "vendor"
	PartyTypeBoth     PartyType = "both"
)

// Party represents a customer or vendor in the system
type Party struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID  uuid.UUID      `gorm:"type:uuid;index;not null" json:"tenant_id"`
	PartyType PartyType      `gorm:"type:varchar(20);not null" json:"party_type"`

	// Basic Info
	Name        string `gorm:"size:255;not null" json:"name"`
	DisplayName string `gorm:"size:255" json:"display_name"`

	// Contact
	Email          string `gorm:"size:255" json:"email"`
	Phone          string `gorm:"size:20" json:"phone"`
	AlternatePhone string `gorm:"size:20" json:"alternate_phone"`

	// Tax Info
	GSTIN string `gorm:"size:15" json:"gstin"`
	PAN   string `gorm:"size:10" json:"pan"`
	TAN   string `gorm:"size:10" json:"tan"`

	// Billing Address
	BillingAddressLine1 string `gorm:"size:255" json:"billing_address_line1"`
	BillingAddressLine2 string `gorm:"size:255" json:"billing_address_line2"`
	BillingCity         string `gorm:"size:100" json:"billing_city"`
	BillingState        string `gorm:"size:100" json:"billing_state"`
	BillingStateCode    string `gorm:"size:2" json:"billing_state_code"`
	BillingPincode      string `gorm:"size:10" json:"billing_pincode"`
	BillingCountry      string `gorm:"size:50;default:'India'" json:"billing_country"`

	// Shipping Address
	ShippingSameAsBilling bool   `gorm:"default:true" json:"shipping_same_as_billing"`
	ShippingAddressLine1  string `gorm:"size:255" json:"shipping_address_line1"`
	ShippingAddressLine2  string `gorm:"size:255" json:"shipping_address_line2"`
	ShippingCity          string `gorm:"size:100" json:"shipping_city"`
	ShippingState         string `gorm:"size:100" json:"shipping_state"`
	ShippingStateCode     string `gorm:"size:2" json:"shipping_state_code"`
	ShippingPincode       string `gorm:"size:10" json:"shipping_pincode"`

	// Credit Settings
	CreditLimit       float64 `gorm:"type:decimal(15,2);default:0" json:"credit_limit"`
	CreditPeriodDays  int     `gorm:"default:30" json:"credit_period_days"`
	DefaultPaymentTerms string `gorm:"type:text" json:"default_payment_terms"`

	// TDS (for vendors)
	TDSApplicable bool    `gorm:"default:false" json:"tds_applicable"`
	TDSSection    string  `gorm:"size:20" json:"tds_section"`
	TDSRate       float64 `gorm:"type:decimal(5,2)" json:"tds_rate"`

	// Balances
	OpeningBalance float64 `gorm:"type:decimal(15,2);default:0" json:"opening_balance"`
	CurrentBalance float64 `gorm:"type:decimal(15,2);default:0" json:"current_balance"`

	// Status
	IsActive bool `gorm:"default:true" json:"is_active"`

	// Metadata
	Tags         pq.StringArray `gorm:"type:text[]" json:"tags"`
	CustomFields map[string]interface{} `gorm:"type:jsonb;default:'{}'" json:"custom_fields"`
	Notes        string                 `gorm:"type:text" json:"notes"`

	// Relations
	Contacts    []PartyContact    `gorm:"foreignKey:PartyID" json:"contacts,omitempty"`
	BankDetails []PartyBankDetail `gorm:"foreignKey:PartyID" json:"bank_details,omitempty"`

	// Audit
	CreatedBy uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for Party
func (Party) TableName() string {
	return "parties"
}

// BeforeCreate hook
func (p *Party) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	if p.DisplayName == "" {
		p.DisplayName = p.Name
	}
	return nil
}

// GetFullAddress returns the full billing address as a string
func (p *Party) GetFullAddress() string {
	address := p.BillingAddressLine1
	if p.BillingAddressLine2 != "" {
		address += ", " + p.BillingAddressLine2
	}
	if p.BillingCity != "" {
		address += ", " + p.BillingCity
	}
	if p.BillingState != "" {
		address += ", " + p.BillingState
	}
	if p.BillingPincode != "" {
		address += " - " + p.BillingPincode
	}
	return address
}

// PartyContact represents a contact person for a party
type PartyContact struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	PartyID     uuid.UUID `gorm:"type:uuid;not null;index" json:"party_id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Designation string    `gorm:"size:100" json:"designation"`
	Email       string    `gorm:"size:255" json:"email"`
	Phone       string    `gorm:"size:20" json:"phone"`
	IsPrimary   bool      `gorm:"default:false" json:"is_primary"`
	CreatedAt   time.Time `json:"created_at"`
}

// TableName returns the table name for PartyContact
func (PartyContact) TableName() string {
	return "party_contacts"
}

// BeforeCreate hook
func (c *PartyContact) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// PartyBankDetail represents bank details for a party
type PartyBankDetail struct {
	ID                     uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	PartyID                uuid.UUID `gorm:"type:uuid;not null;index" json:"party_id"`
	BankName               string    `gorm:"size:255;not null" json:"bank_name"`
	AccountName            string    `gorm:"size:255" json:"account_name"`
	AccountNumberEncrypted string    `gorm:"size:500" json:"-"`
	AccountNumber          string    `gorm:"-" json:"account_number,omitempty"`
	IFSCCode               string    `gorm:"size:11" json:"ifsc_code"`
	Branch                 string    `gorm:"size:255" json:"branch"`
	IsPrimary              bool      `gorm:"default:false" json:"is_primary"`
	CreatedAt              time.Time `json:"created_at"`
}

// TableName returns the table name for PartyBankDetail
func (PartyBankDetail) TableName() string {
	return "party_bank_details"
}

// BeforeCreate hook
func (b *PartyBankDetail) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}
