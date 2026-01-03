package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Role represents a user role in the RBAC system
type Role struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"uniqueIndex;not null;size:50" json:"name"`
	DisplayName string         `gorm:"size:100" json:"display_name"`
	Description string         `gorm:"size:500" json:"description"`
	IsSystem    bool           `gorm:"default:false" json:"is_system"`
	Level       int            `gorm:"default:0" json:"level"` // Higher level = more permissions
	Permissions []Permission   `gorm:"many2many:role_permissions;" json:"permissions"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for Role
func (Role) TableName() string {
	return "roles"
}

// BeforeCreate hook
func (r *Role) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

// Permission represents a specific permission
type Permission struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"uniqueIndex;not null;size:100" json:"name"`
	DisplayName string         `gorm:"size:100" json:"display_name"`
	Description string         `gorm:"size:500" json:"description"`
	Resource    string         `gorm:"size:50;index" json:"resource"` // e.g., "invoices", "customers"
	Action      string         `gorm:"size:50" json:"action"`         // e.g., "create", "read", "update", "delete"
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for Permission
func (Permission) TableName() string {
	return "permissions"
}

// BeforeCreate hook
func (p *Permission) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

// UserRole represents the many-to-many relationship between users and roles
type UserRole struct {
	UserID    uuid.UUID `gorm:"type:uuid;primaryKey"`
	RoleID    uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time
}

// TableName returns the table name for UserRole
func (UserRole) TableName() string {
	return "user_roles"
}

// RolePermission represents the many-to-many relationship between roles and permissions
type RolePermission struct {
	RoleID       uuid.UUID `gorm:"type:uuid;primaryKey"`
	PermissionID uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt    time.Time
}

// TableName returns the table name for RolePermission
func (RolePermission) TableName() string {
	return "role_permissions"
}

// Default roles for the bookkeeping application
var DefaultRoles = []Role{
	{
		Name:        "owner",
		DisplayName: "Store Owner",
		Description: "Full access to all features. Primary account holder.",
		IsSystem:    true,
		Level:       100,
	},
	{
		Name:        "admin",
		DisplayName: "Administrator",
		Description: "Administrative access. Can manage users and settings.",
		IsSystem:    true,
		Level:       80,
	},
	{
		Name:        "accountant",
		DisplayName: "Accountant",
		Description: "Can manage all financial data including invoices, expenses, and reports.",
		IsSystem:    true,
		Level:       60,
	},
	{
		Name:        "staff",
		DisplayName: "Staff",
		Description: "Can create invoices and manage customers.",
		IsSystem:    true,
		Level:       40,
	},
	{
		Name:        "viewer",
		DisplayName: "Viewer",
		Description: "Read-only access to data.",
		IsSystem:    true,
		Level:       20,
	},
}

// Default permissions for the bookkeeping application
var DefaultPermissions = []Permission{
	// Invoice permissions
	{Name: "invoices.create", DisplayName: "Create Invoices", Resource: "invoices", Action: "create"},
	{Name: "invoices.read", DisplayName: "View Invoices", Resource: "invoices", Action: "read"},
	{Name: "invoices.update", DisplayName: "Edit Invoices", Resource: "invoices", Action: "update"},
	{Name: "invoices.delete", DisplayName: "Delete Invoices", Resource: "invoices", Action: "delete"},

	// Customer permissions
	{Name: "customers.create", DisplayName: "Create Customers", Resource: "customers", Action: "create"},
	{Name: "customers.read", DisplayName: "View Customers", Resource: "customers", Action: "read"},
	{Name: "customers.update", DisplayName: "Edit Customers", Resource: "customers", Action: "update"},
	{Name: "customers.delete", DisplayName: "Delete Customers", Resource: "customers", Action: "delete"},

	// Expense permissions
	{Name: "expenses.create", DisplayName: "Create Expenses", Resource: "expenses", Action: "create"},
	{Name: "expenses.read", DisplayName: "View Expenses", Resource: "expenses", Action: "read"},
	{Name: "expenses.update", DisplayName: "Edit Expenses", Resource: "expenses", Action: "update"},
	{Name: "expenses.delete", DisplayName: "Delete Expenses", Resource: "expenses", Action: "delete"},

	// Report permissions
	{Name: "reports.read", DisplayName: "View Reports", Resource: "reports", Action: "read"},
	{Name: "reports.export", DisplayName: "Export Reports", Resource: "reports", Action: "export"},

	// Tax permissions
	{Name: "tax.read", DisplayName: "View Tax Data", Resource: "tax", Action: "read"},
	{Name: "tax.file", DisplayName: "File GST Returns", Resource: "tax", Action: "file"},

	// Settings permissions
	{Name: "settings.read", DisplayName: "View Settings", Resource: "settings", Action: "read"},
	{Name: "settings.update", DisplayName: "Manage Settings", Resource: "settings", Action: "update"},

	// User management permissions
	{Name: "users.create", DisplayName: "Create Users", Resource: "users", Action: "create"},
	{Name: "users.read", DisplayName: "View Users", Resource: "users", Action: "read"},
	{Name: "users.update", DisplayName: "Edit Users", Resource: "users", Action: "update"},
	{Name: "users.delete", DisplayName: "Delete Users", Resource: "users", Action: "delete"},
}
