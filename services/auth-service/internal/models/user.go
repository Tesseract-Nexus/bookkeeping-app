package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID                uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID          uuid.UUID      `gorm:"type:uuid;index" json:"tenant_id"`
	Email             string         `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash      string         `gorm:"not null" json:"-"`
	FirstName         string         `gorm:"size:100" json:"first_name"`
	LastName          string         `gorm:"size:100" json:"last_name"`
	Phone             string         `gorm:"size:20" json:"phone"`
	IsActive          bool           `gorm:"default:true" json:"is_active"`
	IsEmailVerified   bool           `gorm:"default:false" json:"is_email_verified"`
	EmailVerifiedAt   *time.Time     `json:"email_verified_at,omitempty"`
	LastLoginAt       *time.Time     `json:"last_login_at,omitempty"`
	PasswordChangedAt *time.Time     `json:"password_changed_at,omitempty"`
	Roles             []Role         `gorm:"many2many:user_roles;" json:"roles"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for User
func (User) TableName() string {
	return "users"
}

// BeforeCreate hook
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// FullName returns the user's full name
func (u *User) FullName() string {
	if u.FirstName == "" && u.LastName == "" {
		return u.Email
	}
	return u.FirstName + " " + u.LastName
}

// HasRole checks if user has a specific role
func (u *User) HasRole(roleName string) bool {
	for _, role := range u.Roles {
		if role.Name == roleName {
			return true
		}
	}
	return false
}

// GetRoleNames returns a slice of role names
func (u *User) GetRoleNames() []string {
	names := make([]string, len(u.Roles))
	for i, role := range u.Roles {
		names[i] = role.Name
	}
	return names
}

// Session represents a user session
type Session struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID       uuid.UUID      `gorm:"type:uuid;index;not null" json:"user_id"`
	RefreshToken string         `gorm:"not null" json:"-"`
	UserAgent    string         `gorm:"size:500" json:"user_agent"`
	IPAddress    string         `gorm:"size:45" json:"ip_address"`
	ExpiresAt    time.Time      `gorm:"not null" json:"expires_at"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for Session
func (Session) TableName() string {
	return "sessions"
}

// BeforeCreate hook
func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// IsExpired checks if the session has expired
func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}
