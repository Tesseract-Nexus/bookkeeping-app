package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Tenant represents a business entity in the multi-tenant system
type Tenant struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Slug        string         `gorm:"size:100;uniqueIndex;not null" json:"slug"`
	LegalName   string         `gorm:"size:255" json:"legal_name"`
	GSTIN       *string        `gorm:"size:15" json:"gstin"`
	PAN         *string        `gorm:"size:10" json:"pan"`
	TAN         *string        `gorm:"size:10" json:"tan"`
	CIN         *string        `gorm:"size:21" json:"cin"`

	// Contact Information
	Email       string         `gorm:"size:255" json:"email"`
	Phone       string         `gorm:"size:20" json:"phone"`
	Website     *string        `gorm:"size:255" json:"website"`

	// Address
	AddressLine1 string        `gorm:"size:255" json:"address_line1"`
	AddressLine2 *string       `gorm:"size:255" json:"address_line2"`
	City        string         `gorm:"size:100" json:"city"`
	State       string         `gorm:"size:100" json:"state"`
	StateCode   string         `gorm:"size:2" json:"state_code"`
	PinCode     string         `gorm:"size:10" json:"pin_code"`
	Country     string         `gorm:"size:100;default:'India'" json:"country"`

	// Business Settings
	FinancialYearStart int     `gorm:"default:4" json:"financial_year_start"` // Month (1-12), default April
	Currency           string  `gorm:"size:3;default:'INR'" json:"currency"`
	DateFormat         string  `gorm:"size:20;default:'DD/MM/YYYY'" json:"date_format"`

	// Invoice Settings
	InvoicePrefix      string  `gorm:"size:20;default:'INV'" json:"invoice_prefix"`
	InvoiceNextNumber  int     `gorm:"default:1" json:"invoice_next_number"`
	InvoiceTerms       *string `gorm:"type:text" json:"invoice_terms"`
	InvoiceNotes       *string `gorm:"type:text" json:"invoice_notes"`

	// Bank Details
	BankName           *string `gorm:"size:255" json:"bank_name"`
	BankAccountNumber  *string `gorm:"size:50" json:"bank_account_number"`
	BankIFSC           *string `gorm:"size:11" json:"bank_ifsc"`
	BankBranch         *string `gorm:"size:255" json:"bank_branch"`

	// Subscription & Limits
	Plan               string  `gorm:"size:50;default:'free'" json:"plan"`
	MaxUsers           int     `gorm:"default:1" json:"max_users"`
	MaxInvoicesPerMonth int    `gorm:"default:50" json:"max_invoices_per_month"`

	// Status
	Status      string         `gorm:"size:20;default:'active'" json:"status"` // active, suspended, deleted
	VerifiedAt  *time.Time     `json:"verified_at"`

	// Logo
	LogoURL     *string        `gorm:"size:512" json:"logo_url"`

	// Timestamps
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Members     []TenantMember `gorm:"foreignKey:TenantID" json:"members,omitempty"`
	Roles       []Role         `gorm:"foreignKey:TenantID" json:"roles,omitempty"`
}

func (Tenant) TableName() string {
	return "tenants"
}

// TenantMember represents a user's membership in a tenant with their role
type TenantMember struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"tenant_id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	RoleID      uuid.UUID      `gorm:"type:uuid;not null" json:"role_id"`

	// Member Info (denormalized for quick access)
	Email       string         `gorm:"size:255" json:"email"`
	Phone       string         `gorm:"size:20" json:"phone"`
	FirstName   string         `gorm:"size:100" json:"first_name"`
	LastName    string         `gorm:"size:100" json:"last_name"`

	// Status
	Status      string         `gorm:"size:20;default:'active'" json:"status"` // active, inactive, suspended
	InvitedBy   *uuid.UUID     `gorm:"type:uuid" json:"invited_by"`
	InvitedAt   *time.Time     `json:"invited_at"`
	JoinedAt    *time.Time     `json:"joined_at"`
	LastActiveAt *time.Time    `json:"last_active_at"`

	// Timestamps
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Tenant      Tenant         `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Role        Role           `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

func (TenantMember) TableName() string {
	return "tenant_members"
}

// TenantInvitation represents a pending invitation to join a tenant
type TenantInvitation struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"tenant_id"`
	Email       string         `gorm:"size:255;not null" json:"email"`
	Phone       *string        `gorm:"size:20" json:"phone"`
	RoleID      uuid.UUID      `gorm:"type:uuid;not null" json:"role_id"`
	Token       string         `gorm:"size:100;uniqueIndex;not null" json:"-"`

	// Invitation Details
	InvitedByID uuid.UUID      `gorm:"type:uuid;not null" json:"invited_by_id"`
	Message     *string        `gorm:"type:text" json:"message"`

	// Status
	Status      string         `gorm:"size:20;default:'pending'" json:"status"` // pending, accepted, expired, cancelled
	ExpiresAt   time.Time      `json:"expires_at"`
	AcceptedAt  *time.Time     `json:"accepted_at"`

	// Timestamps
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`

	// Associations
	Tenant      Tenant         `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Role        Role           `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

func (TenantInvitation) TableName() string {
	return "tenant_invitations"
}
