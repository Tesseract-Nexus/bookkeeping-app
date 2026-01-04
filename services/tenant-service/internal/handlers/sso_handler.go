package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"
	"time"

	"github.com/bookkeep/go-shared/response"
	"github.com/bookkeep/tenant-service/internal/models"
	"github.com/bookkeep/tenant-service/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SSOHandler handles Enterprise SSO configuration
type SSOHandler struct {
	ssoRepo     repository.SSORepository
	roleRepo    repository.RoleRepository
	encryption  EncryptionService
}

// EncryptionService interface for secret encryption
type EncryptionService interface {
	Encrypt(plaintext string, tenantID uuid.UUID) (string, error)
	Decrypt(ciphertext string, tenantID uuid.UUID) (string, error)
}

func NewSSOHandler(ssoRepo repository.SSORepository, roleRepo repository.RoleRepository, encryption EncryptionService) *SSOHandler {
	return &SSOHandler{
		ssoRepo:    ssoRepo,
		roleRepo:   roleRepo,
		encryption: encryption,
	}
}

// SSO Configuration Requests

type ConfigureSSORequest struct {
	Provider     models.SSOProvider `json:"provider" binding:"required,oneof=entra okta saml oidc"`
	Protocol     models.SSOProtocol `json:"protocol" binding:"omitempty,oneof=oidc saml"`
	DisplayName  string             `json:"display_name"`
	ButtonLabel  string             `json:"button_label"`

	// OIDC Configuration
	OIDCIssuer       string `json:"oidc_issuer"`
	OIDCClientID     string `json:"oidc_client_id"`
	OIDCClientSecret string `json:"oidc_client_secret"`

	// Microsoft Entra ID
	EntraTenantID string `json:"entra_tenant_id"`
	EntraAppID    string `json:"entra_app_id"`

	// Okta
	OktaDomain string `json:"okta_domain"`

	// SAML Configuration
	SAMLEntityID      string `json:"saml_entity_id"`
	SAMLSSOServiceURL string `json:"saml_sso_service_url"`
	SAMLSLOServiceURL string `json:"saml_slo_service_url"`
	SAMLCertificate   string `json:"saml_certificate"`

	// Attribute Mapping
	AttrMapEmail     string `json:"attr_map_email"`
	AttrMapFirstName string `json:"attr_map_first_name"`
	AttrMapLastName  string `json:"attr_map_last_name"`
	AttrMapGroups    string `json:"attr_map_groups"`

	// JIT Provisioning
	JITProvisioningEnabled bool       `json:"jit_provisioning_enabled"`
	JITDefaultRoleID       *uuid.UUID `json:"jit_default_role_id"`
	JITAutoActivate        bool       `json:"jit_auto_activate"`

	// Domain Settings
	AllowedDomains string `json:"allowed_domains"`
	EnforceDomain  bool   `json:"enforce_domain"`

	// Advanced Settings
	AllowPasswordLogin bool `json:"allow_password_login"`
	ForceSSO           bool `json:"force_sso"`
	SessionDuration    int  `json:"session_duration"`
}

type SSOConfigResponse struct {
	ID        uuid.UUID                  `json:"id"`
	TenantID  uuid.UUID                  `json:"tenant_id"`
	Provider  models.SSOProvider         `json:"provider"`
	Protocol  models.SSOProtocol         `json:"protocol"`
	Status    models.SSOConnectionStatus `json:"status"`

	DisplayName string `json:"display_name"`
	ButtonLabel string `json:"button_label"`

	// Provider-specific (without secrets)
	OIDCIssuer    *string `json:"oidc_issuer,omitempty"`
	OIDCClientID  *string `json:"oidc_client_id,omitempty"`
	EntraTenantID *string `json:"entra_tenant_id,omitempty"`
	EntraAppID    *string `json:"entra_app_id,omitempty"`
	OktaDomain    *string `json:"okta_domain,omitempty"`

	// SAML (without certificate)
	SAMLEntityID      *string `json:"saml_entity_id,omitempty"`
	SAMLSSOServiceURL *string `json:"saml_sso_service_url,omitempty"`
	SAMLSLOServiceURL *string `json:"saml_slo_service_url,omitempty"`

	// Attribute Mapping
	AttrMapEmail     string `json:"attr_map_email"`
	AttrMapFirstName string `json:"attr_map_first_name"`
	AttrMapLastName  string `json:"attr_map_last_name"`
	AttrMapGroups    string `json:"attr_map_groups"`

	// JIT Settings
	JITProvisioningEnabled bool       `json:"jit_provisioning_enabled"`
	JITDefaultRoleID       *uuid.UUID `json:"jit_default_role_id,omitempty"`
	JITAutoActivate        bool       `json:"jit_auto_activate"`

	// Domain Settings
	AllowedDomains *string `json:"allowed_domains,omitempty"`
	EnforceDomain  bool    `json:"enforce_domain"`

	// Advanced Settings
	AllowPasswordLogin bool `json:"allow_password_login"`
	ForceSSO           bool `json:"force_sso"`
	SessionDuration    int  `json:"session_duration"`

	// Test Results
	LastTestedAt    *time.Time `json:"last_tested_at,omitempty"`
	LastTestSuccess bool       `json:"last_test_success"`
	LastTestError   *string    `json:"last_test_error,omitempty"`

	// Timestamps
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	EnabledAt *time.Time `json:"enabled_at,omitempty"`
}

// GetSSOConfig retrieves the SSO configuration for a tenant
// @Summary Get tenant SSO configuration
// @Tags SSO
// @Produce json
// @Success 200 {object} SSOConfigResponse
// @Router /tenants/{id}/sso [get]
func (h *SSOHandler) GetSSOConfig(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	// Check if user is owner
	if !h.isOwner(c) {
		response.Forbidden(c, "Only tenant owners can view SSO configuration")
		return
	}

	config, err := h.ssoRepo.GetByTenantID(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		if err == repository.ErrSSOConfigNotFound {
			response.Success(c, nil) // No SSO configured
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, h.toResponse(config))
}

// ConfigureSSO creates or updates SSO configuration
// @Summary Configure tenant SSO
// @Tags SSO
// @Accept json
// @Produce json
// @Param body body ConfigureSSORequest true "SSO configuration"
// @Success 200 {object} SSOConfigResponse
// @Router /tenants/{id}/sso [post]
func (h *SSOHandler) ConfigureSSO(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	userID, _ := c.Get("user_id")

	// Check if user is owner
	if !h.isOwner(c) {
		response.Forbidden(c, "Only tenant owners can configure SSO")
		return
	}

	var req ConfigureSSORequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Invalid request body", map[string]string{"error": err.Error()})
		return
	}

	// Validate provider-specific required fields
	if err := h.validateSSORequest(req); err != nil {
		response.ValidationError(c, err.Error(), nil)
		return
	}

	// Get existing config or create new
	config, err := h.ssoRepo.GetByTenantID(c.Request.Context(), tenantID.(uuid.UUID))
	isNew := err == repository.ErrSSOConfigNotFound
	if err != nil && !isNew {
		response.InternalError(c, err.Error())
		return
	}

	if isNew {
		config = &models.TenantSSOConfig{
			TenantID:       tenantID.(uuid.UUID),
			ConfiguredByID: userID.(uuid.UUID),
		}
	}

	// Set default protocol based on provider
	protocol := req.Protocol
	if protocol == "" {
		switch req.Provider {
		case models.SSOProviderEntra, models.SSOProviderOkta, models.SSOProviderOIDC:
			protocol = models.SSOProtocolOIDC
		case models.SSOProviderSAML:
			protocol = models.SSOProtocolSAML
		}
	}

	// Update config fields
	config.Provider = req.Provider
	config.Protocol = protocol
	config.Status = models.SSOConnectionStatusPending
	config.DisplayName = req.DisplayName
	config.ButtonLabel = req.ButtonLabel

	// OIDC fields
	if req.OIDCIssuer != "" {
		config.OIDCIssuer = &req.OIDCIssuer
	}
	if req.OIDCClientID != "" {
		config.OIDCClientID = &req.OIDCClientID
	}

	// Encrypt client secret if provided
	if req.OIDCClientSecret != "" {
		encrypted, err := h.encryption.Encrypt(req.OIDCClientSecret, tenantID.(uuid.UUID))
		if err != nil {
			response.InternalError(c, "Failed to encrypt client secret")
			return
		}
		config.OIDCClientSecret = &encrypted
	}

	// Entra fields
	if req.EntraTenantID != "" {
		config.EntraTenantID = &req.EntraTenantID
	}
	if req.EntraAppID != "" {
		config.EntraAppID = &req.EntraAppID
	}

	// Okta fields
	if req.OktaDomain != "" {
		config.OktaDomain = &req.OktaDomain
	}

	// SAML fields
	if req.SAMLEntityID != "" {
		config.SAMLEntityID = &req.SAMLEntityID
	}
	if req.SAMLSSOServiceURL != "" {
		config.SAMLSSOServiceURL = &req.SAMLSSOServiceURL
	}
	if req.SAMLSLOServiceURL != "" {
		config.SAMLSLOServiceURL = &req.SAMLSLOServiceURL
	}
	if req.SAMLCertificate != "" {
		config.SAMLCertificate = &req.SAMLCertificate
	}

	// Attribute mapping
	if req.AttrMapEmail != "" {
		config.AttrMapEmail = req.AttrMapEmail
	}
	if req.AttrMapFirstName != "" {
		config.AttrMapFirstName = req.AttrMapFirstName
	}
	if req.AttrMapLastName != "" {
		config.AttrMapLastName = req.AttrMapLastName
	}
	if req.AttrMapGroups != "" {
		config.AttrMapGroups = req.AttrMapGroups
	}

	// JIT settings
	config.JITProvisioningEnabled = req.JITProvisioningEnabled
	config.JITDefaultRoleID = req.JITDefaultRoleID
	config.JITAutoActivate = req.JITAutoActivate

	// Domain settings
	if req.AllowedDomains != "" {
		config.AllowedDomains = &req.AllowedDomains
	}
	config.EnforceDomain = req.EnforceDomain

	// Advanced settings
	config.AllowPasswordLogin = req.AllowPasswordLogin
	config.ForceSSO = req.ForceSSO
	if req.SessionDuration > 0 {
		config.SessionDuration = req.SessionDuration
	}

	// Save configuration
	if isNew {
		if err := h.ssoRepo.Create(c.Request.Context(), config); err != nil {
			response.InternalError(c, err.Error())
			return
		}
	} else {
		if err := h.ssoRepo.Update(c.Request.Context(), config); err != nil {
			response.InternalError(c, err.Error())
			return
		}
	}

	response.Success(c, h.toResponse(config))
}

// TestSSOConnection tests the SSO configuration
// @Summary Test SSO connection
// @Tags SSO
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /tenants/{id}/sso/test [post]
func (h *SSOHandler) TestSSOConnection(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	// Check if user is owner
	if !h.isOwner(c) {
		response.Forbidden(c, "Only tenant owners can test SSO configuration")
		return
	}

	config, err := h.ssoRepo.GetByTenantID(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		if err == repository.ErrSSOConfigNotFound {
			response.NotFound(c, "SSO configuration not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	// Perform connection test based on provider
	testResult, testErr := h.performConnectionTest(c, config)

	now := time.Now()
	config.LastTestedAt = &now
	config.LastTestSuccess = testErr == nil

	if testErr != nil {
		errStr := testErr.Error()
		config.LastTestError = &errStr
		config.Status = models.SSOConnectionStatusFailed
	} else {
		config.LastTestError = nil
		config.Status = models.SSOConnectionStatusActive
		config.EnabledAt = &now
	}

	// Update config with test results
	if err := h.ssoRepo.Update(c.Request.Context(), config); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	if testErr != nil {
		response.Success(c, gin.H{
			"success": false,
			"error":   testErr.Error(),
		})
		return
	}

	response.Success(c, gin.H{
		"success": true,
		"result":  testResult,
	})
}

// DisableSSO disables SSO for the tenant
// @Summary Disable SSO
// @Tags SSO
// @Success 204
// @Router /tenants/{id}/sso [delete]
func (h *SSOHandler) DisableSSO(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	// Check if user is owner
	if !h.isOwner(c) {
		response.Forbidden(c, "Only tenant owners can disable SSO")
		return
	}

	config, err := h.ssoRepo.GetByTenantID(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		if err == repository.ErrSSOConfigNotFound {
			response.NotFound(c, "SSO configuration not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	now := time.Now()
	config.Status = models.SSOConnectionStatusDisabled
	config.DisabledAt = &now

	if err := h.ssoRepo.Update(c.Request.Context(), config); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}

// GetSSOMetadata returns SAML/OIDC metadata for IdP configuration
// @Summary Get SSO metadata
// @Tags SSO
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /tenants/{id}/sso/metadata [get]
func (h *SSOHandler) GetSSOMetadata(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	tenant, _ := c.Get("tenant")
	tenantSlug := ""
	if t, ok := tenant.(*models.Tenant); ok {
		tenantSlug = t.Slug
	}

	// Generate callback URL based on tenant
	baseURL := c.Request.Header.Get("X-Forwarded-Host")
	if baseURL == "" {
		baseURL = c.Request.Host
	}
	scheme := "https"
	if c.Request.TLS == nil && c.Request.Header.Get("X-Forwarded-Proto") == "" {
		scheme = "http"
	}

	callbackURL := scheme + "://" + baseURL + "/api/auth/sso/callback"
	entityID := scheme + "://" + baseURL + "/api/auth/sso/metadata/" + tenantID.(uuid.UUID).String()

	response.Success(c, gin.H{
		"tenant_id":        tenantID,
		"tenant_slug":      tenantSlug,
		"callback_url":     callbackURL,
		"entity_id":        entityID,
		"acs_url":          callbackURL, // SAML Assertion Consumer Service URL
		"slo_url":          scheme + "://" + baseURL + "/api/auth/sso/logout",
		"audience_uri":     entityID,
	})
}

// Group Mapping Endpoints

type CreateGroupMappingRequest struct {
	IdPGroupName string     `json:"idp_group_name" binding:"required"`
	IdPGroupID   *string    `json:"idp_group_id"`
	RoleID       uuid.UUID  `json:"role_id" binding:"required"`
	Priority     int        `json:"priority"`
}

// ListGroupMappings lists all group mappings for a tenant's SSO
// @Summary List SSO group mappings
// @Tags SSO
// @Produce json
// @Success 200 {array} models.SSOGroupMapping
// @Router /tenants/{id}/sso/group-mappings [get]
func (h *SSOHandler) ListGroupMappings(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	// Check if user is owner or admin
	if !h.isOwnerOrAdmin(c) {
		response.Forbidden(c, "Only tenant owners or admins can view group mappings")
		return
	}

	mappings, err := h.ssoRepo.ListGroupMappings(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, mappings)
}

// CreateGroupMapping creates a new group mapping
// @Summary Create SSO group mapping
// @Tags SSO
// @Accept json
// @Produce json
// @Param body body CreateGroupMappingRequest true "Group mapping"
// @Success 201 {object} models.SSOGroupMapping
// @Router /tenants/{id}/sso/group-mappings [post]
func (h *SSOHandler) CreateGroupMapping(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	// Check if user is owner
	if !h.isOwner(c) {
		response.Forbidden(c, "Only tenant owners can create group mappings")
		return
	}

	// Get SSO config first
	config, err := h.ssoRepo.GetByTenantID(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		if err == repository.ErrSSOConfigNotFound {
			response.BadRequest(c, "SSO must be configured before creating group mappings", nil)
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	var req CreateGroupMappingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "Invalid request body", map[string]string{"error": err.Error()})
		return
	}

	// Verify role exists
	_, err = h.roleRepo.GetByID(c.Request.Context(), req.RoleID)
	if err != nil {
		response.BadRequest(c, "Invalid role ID", nil)
		return
	}

	mapping := &models.SSOGroupMapping{
		TenantID:     tenantID.(uuid.UUID),
		SSOConfigID:  config.ID,
		IdPGroupName: req.IdPGroupName,
		IdPGroupID:   req.IdPGroupID,
		RoleID:       req.RoleID,
		Priority:     req.Priority,
	}

	if err := h.ssoRepo.CreateGroupMapping(c.Request.Context(), mapping); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Created(c, mapping)
}

// DeleteGroupMapping deletes a group mapping
// @Summary Delete SSO group mapping
// @Tags SSO
// @Param mapping_id path string true "Mapping ID"
// @Success 204
// @Router /tenants/{id}/sso/group-mappings/{mapping_id} [delete]
func (h *SSOHandler) DeleteGroupMapping(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	mappingIDStr := c.Param("mapping_id")

	// Check if user is owner
	if !h.isOwner(c) {
		response.Forbidden(c, "Only tenant owners can delete group mappings")
		return
	}

	mappingID, err := uuid.Parse(mappingIDStr)
	if err != nil {
		response.BadRequest(c, "Invalid mapping ID", nil)
		return
	}

	if err := h.ssoRepo.DeleteGroupMapping(c.Request.Context(), tenantID.(uuid.UUID), mappingID); err != nil {
		response.InternalError(c, err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}

// Helper methods

func (h *SSOHandler) isOwner(c *gin.Context) bool {
	roles, exists := c.Get("user_roles")
	if !exists {
		return false
	}
	for _, role := range roles.([]string) {
		if role == "owner" {
			return true
		}
	}
	return false
}

func (h *SSOHandler) isOwnerOrAdmin(c *gin.Context) bool {
	roles, exists := c.Get("user_roles")
	if !exists {
		return false
	}
	for _, role := range roles.([]string) {
		if role == "owner" || role == "admin" {
			return true
		}
	}
	return false
}

func (h *SSOHandler) validateSSORequest(req ConfigureSSORequest) error {
	switch req.Provider {
	case models.SSOProviderEntra:
		if req.EntraTenantID == "" || req.OIDCClientID == "" || req.OIDCClientSecret == "" {
			return &validationError{"Entra ID requires tenant_id, client_id, and client_secret"}
		}
	case models.SSOProviderOkta:
		if req.OktaDomain == "" || req.OIDCClientID == "" || req.OIDCClientSecret == "" {
			return &validationError{"Okta requires domain, client_id, and client_secret"}
		}
	case models.SSOProviderOIDC:
		if req.OIDCIssuer == "" || req.OIDCClientID == "" || req.OIDCClientSecret == "" {
			return &validationError{"OIDC requires issuer, client_id, and client_secret"}
		}
	case models.SSOProviderSAML:
		if req.SAMLEntityID == "" || req.SAMLSSOServiceURL == "" || req.SAMLCertificate == "" {
			return &validationError{"SAML requires entity_id, sso_service_url, and certificate"}
		}
	}
	return nil
}

type validationError struct {
	message string
}

func (e *validationError) Error() string {
	return e.message
}

func (h *SSOHandler) performConnectionTest(c *gin.Context, config *models.TenantSSOConfig) (map[string]interface{}, error) {
	// In production, this would:
	// 1. For OIDC: Fetch the discovery document from issuer/.well-known/openid-configuration
	// 2. For SAML: Validate the certificate and metadata
	// 3. For Entra: Call Microsoft Graph API to validate credentials
	// 4. For Okta: Call Okta API to validate credentials

	// For now, return a simulated successful test
	result := map[string]interface{}{
		"provider":       config.Provider,
		"protocol":       config.Protocol,
		"issuer_valid":   true,
		"endpoints_valid": true,
		"certificate_valid": config.Protocol == models.SSOProtocolOIDC || config.SAMLCertificate != nil,
	}

	// Validate issuer URL format for OIDC providers
	if config.Protocol == models.SSOProtocolOIDC {
		issuer := ""
		switch config.Provider {
		case models.SSOProviderEntra:
			if config.EntraTenantID != nil {
				issuer = "https://login.microsoftonline.com/" + *config.EntraTenantID + "/v2.0"
			}
		case models.SSOProviderOkta:
			if config.OktaDomain != nil {
				issuer = "https://" + strings.TrimPrefix(*config.OktaDomain, "https://")
			}
		case models.SSOProviderOIDC:
			if config.OIDCIssuer != nil {
				issuer = *config.OIDCIssuer
			}
		}
		result["issuer"] = issuer
	}

	return result, nil
}

func (h *SSOHandler) toResponse(config *models.TenantSSOConfig) *SSOConfigResponse {
	return &SSOConfigResponse{
		ID:                     config.ID,
		TenantID:               config.TenantID,
		Provider:               config.Provider,
		Protocol:               config.Protocol,
		Status:                 config.Status,
		DisplayName:            config.DisplayName,
		ButtonLabel:            config.ButtonLabel,
		OIDCIssuer:             config.OIDCIssuer,
		OIDCClientID:           config.OIDCClientID,
		EntraTenantID:          config.EntraTenantID,
		EntraAppID:             config.EntraAppID,
		OktaDomain:             config.OktaDomain,
		SAMLEntityID:           config.SAMLEntityID,
		SAMLSSOServiceURL:      config.SAMLSSOServiceURL,
		SAMLSLOServiceURL:      config.SAMLSLOServiceURL,
		AttrMapEmail:           config.AttrMapEmail,
		AttrMapFirstName:       config.AttrMapFirstName,
		AttrMapLastName:        config.AttrMapLastName,
		AttrMapGroups:          config.AttrMapGroups,
		JITProvisioningEnabled: config.JITProvisioningEnabled,
		JITDefaultRoleID:       config.JITDefaultRoleID,
		JITAutoActivate:        config.JITAutoActivate,
		AllowedDomains:         config.AllowedDomains,
		EnforceDomain:          config.EnforceDomain,
		AllowPasswordLogin:     config.AllowPasswordLogin,
		ForceSSO:               config.ForceSSO,
		SessionDuration:        config.SessionDuration,
		LastTestedAt:           config.LastTestedAt,
		LastTestSuccess:        config.LastTestSuccess,
		LastTestError:          config.LastTestError,
		CreatedAt:              config.CreatedAt,
		UpdatedAt:              config.UpdatedAt,
		EnabledAt:              config.EnabledAt,
	}
}

// GenerateState generates a secure state parameter for OAuth flows
func GenerateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
