package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SSOProvider represents the identity provider type
type SSOProvider string

const (
	SSOProviderEntra SSOProvider = "entra"   // Microsoft Entra ID (Azure AD)
	SSOProviderOkta  SSOProvider = "okta"    // Okta Workforce Identity
	SSOProviderSAML  SSOProvider = "saml"    // Generic SAML 2.0
	SSOProviderOIDC  SSOProvider = "oidc"    // Generic OpenID Connect
)

// SSOProtocol represents the authentication protocol
type SSOProtocol string

const (
	SSOProtocolOIDC SSOProtocol = "oidc"  // OpenID Connect
	SSOProtocolSAML SSOProtocol = "saml"  // SAML 2.0
)

// SSOConnectionStatus represents the connection status
type SSOConnectionStatus string

const (
	SSOConnectionStatusPending   SSOConnectionStatus = "pending"    // Configuration saved, not tested
	SSOConnectionStatusActive    SSOConnectionStatus = "active"     // Tested and working
	SSOConnectionStatusFailed    SSOConnectionStatus = "failed"     // Connection test failed
	SSOConnectionStatusDisabled  SSOConnectionStatus = "disabled"   // Manually disabled
)

// TenantSSOConfig stores SSO configuration per tenant
// Each tenant can have one active SSO configuration
type TenantSSOConfig struct {
	ID        uuid.UUID           `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID  uuid.UUID           `gorm:"type:uuid;not null;uniqueIndex" json:"tenant_id"`
	Provider  SSOProvider         `gorm:"size:20;not null" json:"provider"`
	Protocol  SSOProtocol         `gorm:"size:10;not null;default:'oidc'" json:"protocol"`
	Status    SSOConnectionStatus `gorm:"size:20;not null;default:'pending'" json:"status"`

	// Display Configuration
	DisplayName string `gorm:"size:100" json:"display_name"`  // e.g., "Sign in with Company SSO"
	ButtonLabel string `gorm:"size:50" json:"button_label"`   // e.g., "Continue with Okta"

	// OIDC Configuration
	OIDCIssuer       *string `gorm:"size:512" json:"oidc_issuer"`
	OIDCClientID     *string `gorm:"size:256" json:"oidc_client_id"`
	// Encrypted using tenant-specific encryption key
	OIDCClientSecret *string `gorm:"size:512" json:"-"` // Never expose in API responses

	// Microsoft Entra ID (Azure AD) specific
	EntraTenantID   *string `gorm:"size:256" json:"entra_tenant_id"`
	EntraAppID      *string `gorm:"size:256" json:"entra_app_id"`

	// Okta specific
	OktaDomain *string `gorm:"size:256" json:"okta_domain"`

	// SAML Configuration
	SAMLEntityID          *string `gorm:"size:512" json:"saml_entity_id"`
	SAMLSSOServiceURL     *string `gorm:"size:512" json:"saml_sso_service_url"`
	SAMLSLOServiceURL     *string `gorm:"size:512" json:"saml_slo_service_url"`
	SAMLCertificate       *string `gorm:"type:text" json:"-"` // PEM encoded X.509 certificate
	SAMLSignatureMethod   *string `gorm:"size:100" json:"saml_signature_method"`
	SAMLDigestMethod      *string `gorm:"size:100" json:"saml_digest_method"`
	SAMLRequestsSigned    bool    `gorm:"default:true" json:"saml_requests_signed"`
	SAMLWantAssertionsSigned bool `gorm:"default:true" json:"saml_want_assertions_signed"`

	// Attribute Mapping (OIDC claims / SAML attributes)
	AttrMapEmail     string `gorm:"size:100;default:'email'" json:"attr_map_email"`
	AttrMapFirstName string `gorm:"size:100;default:'given_name'" json:"attr_map_first_name"`
	AttrMapLastName  string `gorm:"size:100;default:'family_name'" json:"attr_map_last_name"`
	AttrMapGroups    string `gorm:"size:100;default:'groups'" json:"attr_map_groups"`

	// JIT (Just-in-Time) Provisioning Settings
	JITProvisioningEnabled bool    `gorm:"default:true" json:"jit_provisioning_enabled"`
	JITDefaultRoleID       *uuid.UUID `gorm:"type:uuid" json:"jit_default_role_id"` // Role assigned to new users
	JITAutoActivate        bool    `gorm:"default:true" json:"jit_auto_activate"`

	// Domain Verification (for email domain enforcement)
	AllowedDomains  *string `gorm:"size:1024" json:"allowed_domains"` // Comma-separated list
	EnforceDomain   bool    `gorm:"default:true" json:"enforce_domain"` // Require email to match allowed domains

	// Advanced Settings
	AllowPasswordLogin bool `gorm:"default:true" json:"allow_password_login"` // Allow email/password as fallback
	ForceSSO           bool `gorm:"default:false" json:"force_sso"` // Force all users to use SSO
	SessionDuration    int  `gorm:"default:28800" json:"session_duration"` // Session duration in seconds (default 8 hours)

	// Connection Test Results
	LastTestedAt      *time.Time `json:"last_tested_at"`
	LastTestSuccess   bool       `gorm:"default:false" json:"last_test_success"`
	LastTestError     *string    `gorm:"size:1024" json:"last_test_error"`

	// Audit Fields
	ConfiguredByID uuid.UUID  `gorm:"type:uuid;not null" json:"configured_by_id"`
	EnabledAt      *time.Time `json:"enabled_at"`
	DisabledAt     *time.Time `json:"disabled_at"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Tenant        Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	JITDefaultRole *Role `gorm:"foreignKey:JITDefaultRoleID" json:"jit_default_role,omitempty"`
}

func (TenantSSOConfig) TableName() string {
	return "tenant_sso_configs"
}

// BeforeCreate hook for UUID generation
func (s *TenantSSOConfig) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// SSOLoginAttempt logs SSO login attempts for security auditing
type SSOLoginAttempt struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID      uuid.UUID `gorm:"type:uuid;not null;index" json:"tenant_id"`
	SSOConfigID   uuid.UUID `gorm:"type:uuid;not null;index" json:"sso_config_id"`

	// Request Details
	Email         *string   `gorm:"size:255" json:"email"`
	ExternalID    *string   `gorm:"size:256" json:"external_id"` // ID from IdP
	IPAddress     string    `gorm:"size:45" json:"ip_address"`
	UserAgent     *string   `gorm:"size:512" json:"user_agent"`

	// Result
	Success       bool      `gorm:"default:false" json:"success"`
	ErrorCode     *string   `gorm:"size:50" json:"error_code"`
	ErrorMessage  *string   `gorm:"size:512" json:"error_message"`

	// If successful, link to created/updated user
	UserID        *uuid.UUID `gorm:"type:uuid" json:"user_id"`
	WasProvisioned bool       `gorm:"default:false" json:"was_provisioned"` // User was JIT provisioned

	// Timestamps
	AttemptedAt   time.Time `gorm:"index" json:"attempted_at"`
	CompletedAt   *time.Time `json:"completed_at"`
}

func (SSOLoginAttempt) TableName() string {
	return "sso_login_attempts"
}

// BeforeCreate hook
func (s *SSOLoginAttempt) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.AttemptedAt.IsZero() {
		s.AttemptedAt = time.Now()
	}
	return nil
}

// SSOGroupMapping maps IdP groups to tenant roles
type SSOGroupMapping struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID    uuid.UUID `gorm:"type:uuid;not null;index" json:"tenant_id"`
	SSOConfigID uuid.UUID `gorm:"type:uuid;not null;index" json:"sso_config_id"`

	// Mapping Configuration
	IdPGroupName  string    `gorm:"size:256;not null" json:"idp_group_name"` // Group name from IdP
	IdPGroupID    *string   `gorm:"size:256" json:"idp_group_id"` // Group ID from IdP (optional)
	RoleID        uuid.UUID `gorm:"type:uuid;not null" json:"role_id"`
	Priority      int       `gorm:"default:0" json:"priority"` // Higher priority mappings take precedence

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Role Role `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

func (SSOGroupMapping) TableName() string {
	return "sso_group_mappings"
}

// BeforeCreate hook
func (s *SSOGroupMapping) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// KeycloakConfig stores KeyCloak realm configuration for multi-tenant SSO
// This is used when integrating tenant SSO configs with a central KeyCloak instance
type KeycloakConfig struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID  uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"tenant_id"`

	// KeyCloak Connection
	RealmName           string  `gorm:"size:100;not null" json:"realm_name"` // Unique realm per tenant
	ServerURL           string  `gorm:"size:512;not null" json:"server_url"` // KeyCloak server URL

	// Admin Credentials (for realm management) - encrypted
	AdminClientID       string  `gorm:"size:256;not null" json:"admin_client_id"`
	AdminClientSecret   string  `gorm:"size:512" json:"-"` // Encrypted, never exposed

	// Public Client (for frontend authentication)
	PublicClientID      string  `gorm:"size:256;not null" json:"public_client_id"`

	// Realm Configuration
	AccessTokenLifespan int     `gorm:"default:900" json:"access_token_lifespan"` // 15 minutes default
	RefreshTokenLifespan int    `gorm:"default:604800" json:"refresh_token_lifespan"` // 7 days default
	SSOSessionIdleTimeout int   `gorm:"default:1800" json:"sso_session_idle_timeout"` // 30 minutes
	SSOSessionMaxLifespan int   `gorm:"default:36000" json:"sso_session_max_lifespan"` // 10 hours

	// IdP Broker Configuration (when using external IdPs through KeyCloak)
	BrokerEnabled    bool    `gorm:"default:false" json:"broker_enabled"`
	BrokerAlias      *string `gorm:"size:100" json:"broker_alias"`
	BrokerProviderId *string `gorm:"size:50" json:"broker_provider_id"` // e.g., "oidc", "saml"

	// Status
	Status    string     `gorm:"size:20;default:'pending'" json:"status"` // pending, active, failed
	LastSyncAt *time.Time `json:"last_sync_at"`
	SyncError  *string    `gorm:"size:1024" json:"sync_error"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Tenant Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
}

func (KeycloakConfig) TableName() string {
	return "keycloak_configs"
}

// BeforeCreate hook
func (k *KeycloakConfig) BeforeCreate(tx *gorm.DB) error {
	if k.ID == uuid.Nil {
		k.ID = uuid.New()
	}
	return nil
}

// Unique realm name generation based on tenant
func GenerateRealmName(tenantSlug string) string {
	return "bookkeep-" + tenantSlug
}
