package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Permission constants for the RBAC system
const (
	// Dashboard & Reports
	PermDashboardView        = "dashboard:view"
	PermReportsView          = "reports:view"
	PermReportsExport        = "reports:export"

	// Transactions
	PermTransactionView      = "transaction:view"
	PermTransactionCreate    = "transaction:create"
	PermTransactionEdit      = "transaction:edit"
	PermTransactionDelete    = "transaction:delete"
	PermTransactionApprove   = "transaction:approve"

	// Invoices
	PermInvoiceView          = "invoice:view"
	PermInvoiceCreate        = "invoice:create"
	PermInvoiceEdit          = "invoice:edit"
	PermInvoiceDelete        = "invoice:delete"
	PermInvoiceSend          = "invoice:send"
	PermInvoiceVoid          = "invoice:void"

	// Customers & Vendors
	PermPartyView            = "party:view"
	PermPartyCreate          = "party:create"
	PermPartyEdit            = "party:edit"
	PermPartyDelete          = "party:delete"

	// Products & Services
	PermProductView          = "product:view"
	PermProductCreate        = "product:create"
	PermProductEdit          = "product:edit"
	PermProductDelete        = "product:delete"

	// Bank & Cash
	PermBankView             = "bank:view"
	PermBankCreate           = "bank:create"
	PermBankEdit             = "bank:edit"
	PermBankReconcile        = "bank:reconcile"

	// GST & Tax
	PermGSTView              = "gst:view"
	PermGSTFile              = "gst:file"
	PermGSTExport            = "gst:export"

	// Settings
	PermSettingsView         = "settings:view"
	PermSettingsEdit         = "settings:edit"

	// Team Management
	PermTeamView             = "team:view"
	PermTeamInvite           = "team:invite"
	PermTeamEdit             = "team:edit"
	PermTeamRemove           = "team:remove"
	PermRoleManage           = "role:manage"

	// Tenant/Business
	PermTenantView           = "tenant:view"
	PermTenantEdit           = "tenant:edit"
	PermTenantDelete         = "tenant:delete"
	PermTenantBilling        = "tenant:billing"
)

// AllPermissions returns all available permissions in the system
func AllPermissions() []string {
	return []string{
		PermDashboardView, PermReportsView, PermReportsExport,
		PermTransactionView, PermTransactionCreate, PermTransactionEdit, PermTransactionDelete, PermTransactionApprove,
		PermInvoiceView, PermInvoiceCreate, PermInvoiceEdit, PermInvoiceDelete, PermInvoiceSend, PermInvoiceVoid,
		PermPartyView, PermPartyCreate, PermPartyEdit, PermPartyDelete,
		PermProductView, PermProductCreate, PermProductEdit, PermProductDelete,
		PermBankView, PermBankCreate, PermBankEdit, PermBankReconcile,
		PermGSTView, PermGSTFile, PermGSTExport,
		PermSettingsView, PermSettingsEdit,
		PermTeamView, PermTeamInvite, PermTeamEdit, PermTeamRemove, PermRoleManage,
		PermTenantView, PermTenantEdit, PermTenantDelete, PermTenantBilling,
	}
}

// Role represents a role within a tenant with associated permissions
type Role struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID    *uuid.UUID     `gorm:"type:uuid;index" json:"tenant_id"` // nil for system roles
	Name        string         `gorm:"size:100;not null" json:"name"`
	Description *string        `gorm:"size:500" json:"description"`

	// Role Type
	IsSystem    bool           `gorm:"default:false" json:"is_system"` // System roles cannot be modified
	IsDefault   bool           `gorm:"default:false" json:"is_default"` // Default role for new members

	// Timestamps
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Permissions []RolePermission `gorm:"foreignKey:RoleID" json:"permissions,omitempty"`
}

func (Role) TableName() string {
	return "roles"
}

// HasPermission checks if a role has a specific permission
func (r *Role) HasPermission(permission string) bool {
	for _, p := range r.Permissions {
		if p.Permission == permission {
			return true
		}
	}
	return false
}

// GetPermissions returns a slice of permission strings
func (r *Role) GetPermissions() []string {
	perms := make([]string, len(r.Permissions))
	for i, p := range r.Permissions {
		perms[i] = p.Permission
	}
	return perms
}

// RolePermission represents a permission assigned to a role
type RolePermission struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	RoleID     uuid.UUID `gorm:"type:uuid;not null;index" json:"role_id"`
	Permission string    `gorm:"size:100;not null" json:"permission"`

	// Constraints (optional - for resource-level permissions)
	Constraints *string   `gorm:"type:jsonb" json:"constraints"` // e.g., {"max_amount": 10000}

	CreatedAt  time.Time `json:"created_at"`
}

func (RolePermission) TableName() string {
	return "role_permissions"
}

// DefaultRoles returns the default system roles with their permissions
func DefaultRoles() []Role {
	return []Role{
		{
			Name:        "Owner",
			Description: strPtr("Full access to all features and settings. Can manage team and billing."),
			IsSystem:    true,
			IsDefault:   false,
		},
		{
			Name:        "Admin",
			Description: strPtr("Can manage most features except billing and tenant deletion."),
			IsSystem:    true,
			IsDefault:   false,
		},
		{
			Name:        "Accountant",
			Description: strPtr("Can manage transactions, invoices, reports, and GST. Cannot manage team."),
			IsSystem:    true,
			IsDefault:   false,
		},
		{
			Name:        "Staff",
			Description: strPtr("Can create transactions and invoices. Limited editing rights."),
			IsSystem:    true,
			IsDefault:   true,
		},
		{
			Name:        "Viewer",
			Description: strPtr("Read-only access to view transactions, invoices, and reports."),
			IsSystem:    true,
			IsDefault:   false,
		},
	}
}

// DefaultRolePermissions returns permissions for default roles
func DefaultRolePermissions() map[string][]string {
	return map[string][]string{
		"Owner": AllPermissions(),
		"Admin": {
			PermDashboardView, PermReportsView, PermReportsExport,
			PermTransactionView, PermTransactionCreate, PermTransactionEdit, PermTransactionDelete, PermTransactionApprove,
			PermInvoiceView, PermInvoiceCreate, PermInvoiceEdit, PermInvoiceDelete, PermInvoiceSend, PermInvoiceVoid,
			PermPartyView, PermPartyCreate, PermPartyEdit, PermPartyDelete,
			PermProductView, PermProductCreate, PermProductEdit, PermProductDelete,
			PermBankView, PermBankCreate, PermBankEdit, PermBankReconcile,
			PermGSTView, PermGSTFile, PermGSTExport,
			PermSettingsView, PermSettingsEdit,
			PermTeamView, PermTeamInvite, PermTeamEdit, PermTeamRemove,
			PermTenantView, PermTenantEdit,
		},
		"Accountant": {
			PermDashboardView, PermReportsView, PermReportsExport,
			PermTransactionView, PermTransactionCreate, PermTransactionEdit, PermTransactionApprove,
			PermInvoiceView, PermInvoiceCreate, PermInvoiceEdit, PermInvoiceSend,
			PermPartyView, PermPartyCreate, PermPartyEdit,
			PermProductView, PermProductCreate, PermProductEdit,
			PermBankView, PermBankReconcile,
			PermGSTView, PermGSTFile, PermGSTExport,
			PermSettingsView,
			PermTenantView,
		},
		"Staff": {
			PermDashboardView,
			PermTransactionView, PermTransactionCreate,
			PermInvoiceView, PermInvoiceCreate,
			PermPartyView, PermPartyCreate,
			PermProductView,
			PermBankView,
			PermTenantView,
		},
		"Viewer": {
			PermDashboardView, PermReportsView,
			PermTransactionView,
			PermInvoiceView,
			PermPartyView,
			PermProductView,
			PermBankView,
			PermGSTView,
			PermTenantView,
		},
	}
}

func strPtr(s string) *string {
	return &s
}

// AuditLog represents an audit trail entry for security and compliance
type AuditLog struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"tenant_id"`
	UserID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`

	// Action Details
	Action      string     `gorm:"size:100;not null" json:"action"` // e.g., "invoice:create", "member:invite"
	Resource    string     `gorm:"size:100;not null" json:"resource"` // e.g., "invoice", "transaction"
	ResourceID  *uuid.UUID `gorm:"type:uuid" json:"resource_id"`

	// Change Details
	OldValue    *string    `gorm:"type:jsonb" json:"old_value"`
	NewValue    *string    `gorm:"type:jsonb" json:"new_value"`

	// Request Context
	IPAddress   string     `gorm:"size:45" json:"ip_address"`
	UserAgent   *string    `gorm:"size:500" json:"user_agent"`
	RequestID   *string    `gorm:"size:100" json:"request_id"`

	// Status
	Status      string     `gorm:"size:20;default:'success'" json:"status"` // success, failed, denied
	ErrorMessage *string   `gorm:"type:text" json:"error_message"`

	CreatedAt   time.Time  `gorm:"index" json:"created_at"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}
