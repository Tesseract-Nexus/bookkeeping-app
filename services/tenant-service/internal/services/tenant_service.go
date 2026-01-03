package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/bookkeep/tenant-service/internal/models"
	"github.com/bookkeep/tenant-service/internal/repository"
	"github.com/google/uuid"
)

var (
	ErrInvalidGSTIN      = errors.New("invalid GSTIN format")
	ErrInvalidPAN        = errors.New("invalid PAN format")
	ErrMaxUsersReached   = errors.New("maximum users limit reached for this plan")
	ErrCannotRemoveOwner = errors.New("cannot remove the owner from the tenant")
	ErrInvalidRole       = errors.New("invalid role specified")
)

// CreateTenantRequest represents the request to create a new tenant
type CreateTenantRequest struct {
	Name         string  `json:"name" binding:"required,min=2,max=255"`
	LegalName    string  `json:"legal_name"`
	GSTIN        *string `json:"gstin"`
	PAN          *string `json:"pan"`
	Email        string  `json:"email" binding:"required,email"`
	Phone        string  `json:"phone" binding:"required"`
	AddressLine1 string  `json:"address_line1"`
	City         string  `json:"city"`
	State        string  `json:"state"`
	StateCode    string  `json:"state_code"`
	PinCode      string  `json:"pin_code"`
}

// UpdateTenantRequest represents the request to update a tenant
type UpdateTenantRequest struct {
	Name               string  `json:"name"`
	LegalName          string  `json:"legal_name"`
	GSTIN              *string `json:"gstin"`
	PAN                *string `json:"pan"`
	TAN                *string `json:"tan"`
	CIN                *string `json:"cin"`
	Email              string  `json:"email"`
	Phone              string  `json:"phone"`
	Website            *string `json:"website"`
	AddressLine1       string  `json:"address_line1"`
	AddressLine2       *string `json:"address_line2"`
	City               string  `json:"city"`
	State              string  `json:"state"`
	StateCode          string  `json:"state_code"`
	PinCode            string  `json:"pin_code"`
	FinancialYearStart int     `json:"financial_year_start"`
	Currency           string  `json:"currency"`
	DateFormat         string  `json:"date_format"`
	InvoicePrefix      string  `json:"invoice_prefix"`
	InvoiceTerms       *string `json:"invoice_terms"`
	InvoiceNotes       *string `json:"invoice_notes"`
	BankName           *string `json:"bank_name"`
	BankAccountNumber  *string `json:"bank_account_number"`
	BankIFSC           *string `json:"bank_ifsc"`
	BankBranch         *string `json:"bank_branch"`
	LogoURL            *string `json:"logo_url"`
}

// InviteMemberRequest represents the request to invite a new member
type InviteMemberRequest struct {
	Email   string `json:"email" binding:"required,email"`
	Phone   string `json:"phone"`
	RoleID  string `json:"role_id" binding:"required,uuid"`
	Message string `json:"message"`
}

// UpdateMemberRequest represents the request to update a member
type UpdateMemberRequest struct {
	RoleID string `json:"role_id" binding:"required,uuid"`
	Status string `json:"status"` // active, inactive, suspended
}

type TenantService interface {
	// Tenant Management
	CreateTenant(ctx context.Context, req CreateTenantRequest, ownerUserID uuid.UUID, ownerInfo OwnerInfo) (*models.Tenant, error)
	GetTenant(ctx context.Context, id uuid.UUID) (*models.Tenant, error)
	UpdateTenant(ctx context.Context, id uuid.UUID, req UpdateTenantRequest) (*models.Tenant, error)
	DeleteTenant(ctx context.Context, id uuid.UUID) error

	// Member Management
	InviteMember(ctx context.Context, tenantID, inviterID uuid.UUID, req InviteMemberRequest) (*models.TenantInvitation, error)
	AcceptInvitation(ctx context.Context, token string, userID uuid.UUID, userInfo MemberInfo) (*models.TenantMember, error)
	CancelInvitation(ctx context.Context, tenantID uuid.UUID, invitationID uuid.UUID) error
	ListInvitations(ctx context.Context, tenantID uuid.UUID) ([]models.TenantInvitation, error)

	ListMembers(ctx context.Context, tenantID uuid.UUID) ([]models.TenantMember, error)
	GetMember(ctx context.Context, tenantID, userID uuid.UUID) (*models.TenantMember, error)
	UpdateMember(ctx context.Context, tenantID, memberID uuid.UUID, req UpdateMemberRequest) (*models.TenantMember, error)
	RemoveMember(ctx context.Context, tenantID, memberID, requesterID uuid.UUID) error

	// User's Tenants
	GetUserTenants(ctx context.Context, userID uuid.UUID) ([]models.TenantMember, error)

	// Permission Check
	CheckPermission(ctx context.Context, tenantID, userID uuid.UUID, permission string) (bool, error)
	GetUserPermissions(ctx context.Context, tenantID, userID uuid.UUID) ([]string, error)
}

type OwnerInfo struct {
	Email     string
	Phone     string
	FirstName string
	LastName  string
}

type MemberInfo struct {
	Email     string
	Phone     string
	FirstName string
	LastName  string
}

type tenantService struct {
	tenantRepo repository.TenantRepository
	roleRepo   repository.RoleRepository
}

func NewTenantService(tenantRepo repository.TenantRepository, roleRepo repository.RoleRepository) TenantService {
	return &tenantService{
		tenantRepo: tenantRepo,
		roleRepo:   roleRepo,
	}
}

// Tenant Management

func (s *tenantService) CreateTenant(ctx context.Context, req CreateTenantRequest, ownerUserID uuid.UUID, ownerInfo OwnerInfo) (*models.Tenant, error) {
	// Validate GSTIN if provided
	if req.GSTIN != nil && *req.GSTIN != "" {
		if !isValidGSTIN(*req.GSTIN) {
			return nil, ErrInvalidGSTIN
		}
	}

	// Validate PAN if provided
	if req.PAN != nil && *req.PAN != "" {
		if !isValidPAN(*req.PAN) {
			return nil, ErrInvalidPAN
		}
	}

	// Generate slug from name
	slug := generateSlug(req.Name)

	tenant := &models.Tenant{
		Name:         req.Name,
		Slug:         slug,
		LegalName:    req.LegalName,
		GSTIN:        req.GSTIN,
		PAN:          req.PAN,
		Email:        req.Email,
		Phone:        req.Phone,
		AddressLine1: req.AddressLine1,
		City:         req.City,
		State:        req.State,
		StateCode:    req.StateCode,
		PinCode:      req.PinCode,
		Status:       "active",
	}

	if err := s.tenantRepo.Create(ctx, tenant); err != nil {
		return nil, err
	}

	// Get the Owner system role
	ownerRole, err := s.roleRepo.GetSystemRoleByName(ctx, "Owner")
	if err != nil {
		return nil, err
	}

	// Add owner as first member
	now := time.Now()
	member := &models.TenantMember{
		TenantID:  tenant.ID,
		UserID:    ownerUserID,
		RoleID:    ownerRole.ID,
		Email:     ownerInfo.Email,
		Phone:     ownerInfo.Phone,
		FirstName: ownerInfo.FirstName,
		LastName:  ownerInfo.LastName,
		Status:    "active",
		JoinedAt:  &now,
	}

	if err := s.tenantRepo.AddMember(ctx, member); err != nil {
		return nil, err
	}

	return tenant, nil
}

func (s *tenantService) GetTenant(ctx context.Context, id uuid.UUID) (*models.Tenant, error) {
	return s.tenantRepo.GetByID(ctx, id)
}

func (s *tenantService) UpdateTenant(ctx context.Context, id uuid.UUID, req UpdateTenantRequest) (*models.Tenant, error) {
	tenant, err := s.tenantRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Validate GSTIN if provided
	if req.GSTIN != nil && *req.GSTIN != "" {
		if !isValidGSTIN(*req.GSTIN) {
			return nil, ErrInvalidGSTIN
		}
	}

	// Validate PAN if provided
	if req.PAN != nil && *req.PAN != "" {
		if !isValidPAN(*req.PAN) {
			return nil, ErrInvalidPAN
		}
	}

	// Update fields
	if req.Name != "" {
		tenant.Name = req.Name
	}
	if req.LegalName != "" {
		tenant.LegalName = req.LegalName
	}
	tenant.GSTIN = req.GSTIN
	tenant.PAN = req.PAN
	tenant.TAN = req.TAN
	tenant.CIN = req.CIN

	if req.Email != "" {
		tenant.Email = req.Email
	}
	if req.Phone != "" {
		tenant.Phone = req.Phone
	}
	tenant.Website = req.Website

	if req.AddressLine1 != "" {
		tenant.AddressLine1 = req.AddressLine1
	}
	tenant.AddressLine2 = req.AddressLine2
	if req.City != "" {
		tenant.City = req.City
	}
	if req.State != "" {
		tenant.State = req.State
	}
	if req.StateCode != "" {
		tenant.StateCode = req.StateCode
	}
	if req.PinCode != "" {
		tenant.PinCode = req.PinCode
	}

	if req.FinancialYearStart > 0 && req.FinancialYearStart <= 12 {
		tenant.FinancialYearStart = req.FinancialYearStart
	}
	if req.Currency != "" {
		tenant.Currency = req.Currency
	}
	if req.DateFormat != "" {
		tenant.DateFormat = req.DateFormat
	}
	if req.InvoicePrefix != "" {
		tenant.InvoicePrefix = req.InvoicePrefix
	}
	tenant.InvoiceTerms = req.InvoiceTerms
	tenant.InvoiceNotes = req.InvoiceNotes

	tenant.BankName = req.BankName
	tenant.BankAccountNumber = req.BankAccountNumber
	tenant.BankIFSC = req.BankIFSC
	tenant.BankBranch = req.BankBranch
	tenant.LogoURL = req.LogoURL

	if err := s.tenantRepo.Update(ctx, tenant); err != nil {
		return nil, err
	}

	return tenant, nil
}

func (s *tenantService) DeleteTenant(ctx context.Context, id uuid.UUID) error {
	return s.tenantRepo.Delete(ctx, id)
}

// Member Management

func (s *tenantService) InviteMember(ctx context.Context, tenantID, inviterID uuid.UUID, req InviteMemberRequest) (*models.TenantInvitation, error) {
	// Check tenant exists and get member count
	tenant, err := s.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	// Check member limit
	members, err := s.tenantRepo.ListMembers(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if len(members) >= tenant.MaxUsers {
		return nil, ErrMaxUsersReached
	}

	// Validate role
	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		return nil, ErrInvalidRole
	}

	role, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return nil, ErrInvalidRole
	}

	// Cannot invite as Owner
	if role.Name == "Owner" {
		return nil, ErrInvalidRole
	}

	// Generate invitation token
	token, err := generateToken(32)
	if err != nil {
		return nil, err
	}

	var message *string
	if req.Message != "" {
		message = &req.Message
	}

	var phone *string
	if req.Phone != "" {
		phone = &req.Phone
	}

	invitation := &models.TenantInvitation{
		TenantID:    tenantID,
		Email:       req.Email,
		Phone:       phone,
		RoleID:      roleID,
		Token:       token,
		InvitedByID: inviterID,
		Message:     message,
		Status:      "pending",
		ExpiresAt:   time.Now().Add(7 * 24 * time.Hour), // 7 days
	}

	if err := s.tenantRepo.CreateInvitation(ctx, invitation); err != nil {
		return nil, err
	}

	// TODO: Send invitation email/SMS

	return invitation, nil
}

func (s *tenantService) AcceptInvitation(ctx context.Context, token string, userID uuid.UUID, userInfo MemberInfo) (*models.TenantMember, error) {
	invitation, err := s.tenantRepo.GetInvitationByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	if invitation.Status != "pending" {
		return nil, errors.New("invitation is no longer valid")
	}

	// Create member
	now := time.Now()
	member := &models.TenantMember{
		TenantID:  invitation.TenantID,
		UserID:    userID,
		RoleID:    invitation.RoleID,
		Email:     userInfo.Email,
		Phone:     userInfo.Phone,
		FirstName: userInfo.FirstName,
		LastName:  userInfo.LastName,
		Status:    "active",
		InvitedBy: &invitation.InvitedByID,
		InvitedAt: &invitation.CreatedAt,
		JoinedAt:  &now,
	}

	if err := s.tenantRepo.AddMember(ctx, member); err != nil {
		return nil, err
	}

	// Update invitation status
	invitation.Status = "accepted"
	invitation.AcceptedAt = &now
	if err := s.tenantRepo.UpdateInvitation(ctx, invitation); err != nil {
		return nil, err
	}

	return member, nil
}

func (s *tenantService) CancelInvitation(ctx context.Context, tenantID uuid.UUID, invitationID uuid.UUID) error {
	return s.tenantRepo.DeleteInvitation(ctx, invitationID)
}

func (s *tenantService) ListInvitations(ctx context.Context, tenantID uuid.UUID) ([]models.TenantInvitation, error) {
	return s.tenantRepo.ListInvitations(ctx, tenantID)
}

func (s *tenantService) ListMembers(ctx context.Context, tenantID uuid.UUID) ([]models.TenantMember, error) {
	return s.tenantRepo.ListMembers(ctx, tenantID)
}

func (s *tenantService) GetMember(ctx context.Context, tenantID, userID uuid.UUID) (*models.TenantMember, error) {
	return s.tenantRepo.GetMember(ctx, tenantID, userID)
}

func (s *tenantService) UpdateMember(ctx context.Context, tenantID, memberID uuid.UUID, req UpdateMemberRequest) (*models.TenantMember, error) {
	member, err := s.tenantRepo.GetMemberByID(ctx, memberID)
	if err != nil {
		return nil, err
	}

	// Cannot change owner's role
	ownerRole, _ := s.roleRepo.GetSystemRoleByName(ctx, "Owner")
	if member.RoleID == ownerRole.ID {
		return nil, ErrCannotRemoveOwner
	}

	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		return nil, ErrInvalidRole
	}

	// Cannot assign Owner role
	if roleID == ownerRole.ID {
		return nil, ErrInvalidRole
	}

	member.RoleID = roleID

	if req.Status != "" {
		member.Status = req.Status
	}

	if err := s.tenantRepo.UpdateMember(ctx, member); err != nil {
		return nil, err
	}

	return member, nil
}

func (s *tenantService) RemoveMember(ctx context.Context, tenantID, memberID, requesterID uuid.UUID) error {
	member, err := s.tenantRepo.GetMemberByID(ctx, memberID)
	if err != nil {
		return err
	}

	// Cannot remove owner
	ownerRole, _ := s.roleRepo.GetSystemRoleByName(ctx, "Owner")
	if member.RoleID == ownerRole.ID {
		return ErrCannotRemoveOwner
	}

	return s.tenantRepo.RemoveMember(ctx, tenantID, member.UserID)
}

func (s *tenantService) GetUserTenants(ctx context.Context, userID uuid.UUID) ([]models.TenantMember, error) {
	return s.tenantRepo.GetUserTenants(ctx, userID)
}

// Permission Check

func (s *tenantService) CheckPermission(ctx context.Context, tenantID, userID uuid.UUID, permission string) (bool, error) {
	member, err := s.tenantRepo.GetMember(ctx, tenantID, userID)
	if err != nil {
		return false, err
	}

	return member.Role.HasPermission(permission), nil
}

func (s *tenantService) GetUserPermissions(ctx context.Context, tenantID, userID uuid.UUID) ([]string, error) {
	member, err := s.tenantRepo.GetMember(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	return member.Role.GetPermissions(), nil
}

// Helper functions

func generateSlug(name string) string {
	// Convert to lowercase
	slug := strings.ToLower(name)
	// Replace spaces with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")
	// Remove special characters
	reg := regexp.MustCompile("[^a-z0-9-]+")
	slug = reg.ReplaceAllString(slug, "")
	// Add random suffix for uniqueness
	suffix, _ := generateToken(4)
	return slug + "-" + suffix
}

func generateToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func isValidGSTIN(gstin string) bool {
	// GSTIN format: 2 digit state code + 10 char PAN + 1 entity code + Z + checksum
	pattern := `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
	matched, _ := regexp.MatchString(pattern, gstin)
	return matched
}

func isValidPAN(pan string) bool {
	pattern := `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
	matched, _ := regexp.MatchString(pattern, pan)
	return matched
}
