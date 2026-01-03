package services

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/customer-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/customer-service/internal/repository"
)

var (
	ErrPartyNotFound    = errors.New("party not found")
	ErrPartyExists      = errors.New("party already exists")
	ErrInvalidGSTIN     = errors.New("invalid GSTIN format")
	ErrInvalidPAN       = errors.New("invalid PAN format")
	ErrInvalidPhone     = errors.New("invalid phone number")
	ErrInvalidEmail     = errors.New("invalid email format")
)

// PartyService defines the interface for party business logic
type PartyService interface {
	CreateParty(ctx context.Context, tenantID, userID uuid.UUID, req CreatePartyRequest) (*models.Party, error)
	UpdateParty(ctx context.Context, id, tenantID uuid.UUID, req UpdatePartyRequest) (*models.Party, error)
	DeleteParty(ctx context.Context, id, tenantID uuid.UUID) error
	GetParty(ctx context.Context, id, tenantID uuid.UUID) (*models.Party, error)
	ListParties(ctx context.Context, tenantID uuid.UUID, filter repository.PartyFilter) ([]models.Party, int64, error)
	GetPartyLedger(ctx context.Context, id, tenantID uuid.UUID, fromDate, toDate string) (*PartyLedgerResponse, error)
	ValidateGSTIN(gstin string) (bool, error)
	AddContact(ctx context.Context, partyID, tenantID uuid.UUID, req CreateContactRequest) (*models.PartyContact, error)
	AddBankDetail(ctx context.Context, partyID, tenantID uuid.UUID, req CreateBankDetailRequest) (*models.PartyBankDetail, error)
}

// CreatePartyRequest represents a request to create a party
type CreatePartyRequest struct {
	PartyType           string  `json:"party_type" binding:"required,oneof=customer vendor both"`
	Name                string  `json:"name" binding:"required,max=255"`
	DisplayName         string  `json:"display_name"`
	Email               string  `json:"email"`
	Phone               string  `json:"phone"`
	AlternatePhone      string  `json:"alternate_phone"`
	GSTIN               string  `json:"gstin"`
	PAN                 string  `json:"pan"`
	BillingAddressLine1 string  `json:"billing_address_line1"`
	BillingAddressLine2 string  `json:"billing_address_line2"`
	BillingCity         string  `json:"billing_city"`
	BillingState        string  `json:"billing_state"`
	BillingStateCode    string  `json:"billing_state_code"`
	BillingPincode      string  `json:"billing_pincode"`
	CreditLimit         float64 `json:"credit_limit"`
	CreditPeriodDays    int     `json:"credit_period_days"`
	OpeningBalance      float64 `json:"opening_balance"`
	Tags                []string `json:"tags"`
	Notes               string  `json:"notes"`
}

// UpdatePartyRequest represents a request to update a party
type UpdatePartyRequest struct {
	Name                 *string   `json:"name"`
	DisplayName          *string   `json:"display_name"`
	Email                *string   `json:"email"`
	Phone                *string   `json:"phone"`
	AlternatePhone       *string   `json:"alternate_phone"`
	GSTIN                *string   `json:"gstin"`
	PAN                  *string   `json:"pan"`
	BillingAddressLine1  *string   `json:"billing_address_line1"`
	BillingAddressLine2  *string   `json:"billing_address_line2"`
	BillingCity          *string   `json:"billing_city"`
	BillingState         *string   `json:"billing_state"`
	BillingStateCode     *string   `json:"billing_state_code"`
	BillingPincode       *string   `json:"billing_pincode"`
	ShippingAddressLine1 *string   `json:"shipping_address_line1"`
	ShippingAddressLine2 *string   `json:"shipping_address_line2"`
	ShippingCity         *string   `json:"shipping_city"`
	ShippingState        *string   `json:"shipping_state"`
	ShippingStateCode    *string   `json:"shipping_state_code"`
	ShippingPincode      *string   `json:"shipping_pincode"`
	CreditLimit          *float64  `json:"credit_limit"`
	CreditPeriodDays     *int      `json:"credit_period_days"`
	TDSApplicable        *bool     `json:"tds_applicable"`
	TDSSection           *string   `json:"tds_section"`
	TDSRate              *float64  `json:"tds_rate"`
	IsActive             *bool     `json:"is_active"`
	Tags                 []string  `json:"tags"`
	Notes                *string   `json:"notes"`
}

// CreateContactRequest represents a request to add a contact
type CreateContactRequest struct {
	Name        string `json:"name" binding:"required"`
	Designation string `json:"designation"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	IsPrimary   bool   `json:"is_primary"`
}

// CreateBankDetailRequest represents a request to add bank details
type CreateBankDetailRequest struct {
	BankName      string `json:"bank_name" binding:"required"`
	AccountName   string `json:"account_name"`
	AccountNumber string `json:"account_number" binding:"required"`
	IFSCCode      string `json:"ifsc_code" binding:"required"`
	Branch        string `json:"branch"`
	IsPrimary     bool   `json:"is_primary"`
}

// PartyLedgerResponse represents the ledger response for a party
type PartyLedgerResponse struct {
	Party          models.Party             `json:"party"`
	OpeningBalance float64                  `json:"opening_balance"`
	Entries        []repository.LedgerEntry `json:"entries"`
	ClosingBalance float64                  `json:"closing_balance"`
	TotalDebit     float64                  `json:"total_debit"`
	TotalCredit    float64                  `json:"total_credit"`
}

type partyService struct {
	partyRepo repository.PartyRepository
}

// NewPartyService creates a new party service
func NewPartyService(partyRepo repository.PartyRepository) PartyService {
	return &partyService{partyRepo: partyRepo}
}

func (s *partyService) CreateParty(ctx context.Context, tenantID, userID uuid.UUID, req CreatePartyRequest) (*models.Party, error) {
	// Validate GSTIN if provided
	if req.GSTIN != "" {
		if valid, err := s.ValidateGSTIN(req.GSTIN); !valid || err != nil {
			return nil, ErrInvalidGSTIN
		}
		// Check for duplicate GSTIN
		existing, _ := s.partyRepo.FindByGSTIN(ctx, req.GSTIN, tenantID)
		if existing != nil {
			return nil, ErrPartyExists
		}
	}

	// Validate PAN if provided
	if req.PAN != "" && !isValidPAN(req.PAN) {
		return nil, ErrInvalidPAN
	}

	party := &models.Party{
		TenantID:            tenantID,
		PartyType:           models.PartyType(req.PartyType),
		Name:                req.Name,
		DisplayName:         req.DisplayName,
		Email:               req.Email,
		Phone:               req.Phone,
		AlternatePhone:      req.AlternatePhone,
		GSTIN:               strings.ToUpper(req.GSTIN),
		PAN:                 strings.ToUpper(req.PAN),
		BillingAddressLine1: req.BillingAddressLine1,
		BillingAddressLine2: req.BillingAddressLine2,
		BillingCity:         req.BillingCity,
		BillingState:        req.BillingState,
		BillingStateCode:    req.BillingStateCode,
		BillingPincode:      req.BillingPincode,
		CreditLimit:         req.CreditLimit,
		CreditPeriodDays:    req.CreditPeriodDays,
		OpeningBalance:      req.OpeningBalance,
		CurrentBalance:      req.OpeningBalance,
		Tags:                req.Tags,
		Notes:               req.Notes,
		CreatedBy:           userID,
		IsActive:            true,
	}

	if err := s.partyRepo.Create(ctx, party); err != nil {
		return nil, err
	}

	return party, nil
}

func (s *partyService) UpdateParty(ctx context.Context, id, tenantID uuid.UUID, req UpdatePartyRequest) (*models.Party, error) {
	party, err := s.partyRepo.FindByID(ctx, id, tenantID)
	if err != nil {
		return nil, ErrPartyNotFound
	}

	// Update fields if provided
	if req.Name != nil {
		party.Name = *req.Name
	}
	if req.DisplayName != nil {
		party.DisplayName = *req.DisplayName
	}
	if req.Email != nil {
		party.Email = *req.Email
	}
	if req.Phone != nil {
		party.Phone = *req.Phone
	}
	if req.AlternatePhone != nil {
		party.AlternatePhone = *req.AlternatePhone
	}
	if req.GSTIN != nil {
		if *req.GSTIN != "" {
			if valid, _ := s.ValidateGSTIN(*req.GSTIN); !valid {
				return nil, ErrInvalidGSTIN
			}
		}
		party.GSTIN = strings.ToUpper(*req.GSTIN)
	}
	if req.PAN != nil {
		if *req.PAN != "" && !isValidPAN(*req.PAN) {
			return nil, ErrInvalidPAN
		}
		party.PAN = strings.ToUpper(*req.PAN)
	}
	if req.BillingAddressLine1 != nil {
		party.BillingAddressLine1 = *req.BillingAddressLine1
	}
	if req.BillingAddressLine2 != nil {
		party.BillingAddressLine2 = *req.BillingAddressLine2
	}
	if req.BillingCity != nil {
		party.BillingCity = *req.BillingCity
	}
	if req.BillingState != nil {
		party.BillingState = *req.BillingState
	}
	if req.BillingStateCode != nil {
		party.BillingStateCode = *req.BillingStateCode
	}
	if req.BillingPincode != nil {
		party.BillingPincode = *req.BillingPincode
	}
	if req.ShippingAddressLine1 != nil {
		party.ShippingAddressLine1 = *req.ShippingAddressLine1
		party.ShippingSameAsBilling = false
	}
	if req.ShippingAddressLine2 != nil {
		party.ShippingAddressLine2 = *req.ShippingAddressLine2
	}
	if req.ShippingCity != nil {
		party.ShippingCity = *req.ShippingCity
	}
	if req.ShippingState != nil {
		party.ShippingState = *req.ShippingState
	}
	if req.ShippingStateCode != nil {
		party.ShippingStateCode = *req.ShippingStateCode
	}
	if req.ShippingPincode != nil {
		party.ShippingPincode = *req.ShippingPincode
	}
	if req.CreditLimit != nil {
		party.CreditLimit = *req.CreditLimit
	}
	if req.CreditPeriodDays != nil {
		party.CreditPeriodDays = *req.CreditPeriodDays
	}
	if req.TDSApplicable != nil {
		party.TDSApplicable = *req.TDSApplicable
	}
	if req.TDSSection != nil {
		party.TDSSection = *req.TDSSection
	}
	if req.TDSRate != nil {
		party.TDSRate = *req.TDSRate
	}
	if req.IsActive != nil {
		party.IsActive = *req.IsActive
	}
	if req.Tags != nil {
		party.Tags = req.Tags
	}
	if req.Notes != nil {
		party.Notes = *req.Notes
	}

	if err := s.partyRepo.Update(ctx, party); err != nil {
		return nil, err
	}

	return party, nil
}

func (s *partyService) DeleteParty(ctx context.Context, id, tenantID uuid.UUID) error {
	_, err := s.partyRepo.FindByID(ctx, id, tenantID)
	if err != nil {
		return ErrPartyNotFound
	}
	return s.partyRepo.Delete(ctx, id, tenantID)
}

func (s *partyService) GetParty(ctx context.Context, id, tenantID uuid.UUID) (*models.Party, error) {
	party, err := s.partyRepo.FindByID(ctx, id, tenantID)
	if err != nil {
		return nil, ErrPartyNotFound
	}
	return party, nil
}

func (s *partyService) ListParties(ctx context.Context, tenantID uuid.UUID, filter repository.PartyFilter) ([]models.Party, int64, error) {
	return s.partyRepo.FindAll(ctx, tenantID, filter)
}

func (s *partyService) GetPartyLedger(ctx context.Context, id, tenantID uuid.UUID, fromDate, toDate string) (*PartyLedgerResponse, error) {
	party, err := s.partyRepo.FindByID(ctx, id, tenantID)
	if err != nil {
		return nil, ErrPartyNotFound
	}

	entries, err := s.partyRepo.GetLedger(ctx, id, tenantID, fromDate, toDate)
	if err != nil {
		return nil, err
	}

	var totalDebit, totalCredit float64
	for _, entry := range entries {
		totalDebit += entry.Debit
		totalCredit += entry.Credit
	}

	return &PartyLedgerResponse{
		Party:          *party,
		OpeningBalance: party.OpeningBalance,
		Entries:        entries,
		ClosingBalance: party.CurrentBalance,
		TotalDebit:     totalDebit,
		TotalCredit:    totalCredit,
	}, nil
}

func (s *partyService) ValidateGSTIN(gstin string) (bool, error) {
	if gstin == "" {
		return false, nil
	}
	// GSTIN format: 2 digits state code + 10 character PAN + 1 digit entity code + 1 check digit + Z
	gstinRegex := regexp.MustCompile(`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`)
	return gstinRegex.MatchString(strings.ToUpper(gstin)), nil
}

func (s *partyService) AddContact(ctx context.Context, partyID, tenantID uuid.UUID, req CreateContactRequest) (*models.PartyContact, error) {
	// Verify party exists
	_, err := s.partyRepo.FindByID(ctx, partyID, tenantID)
	if err != nil {
		return nil, ErrPartyNotFound
	}

	contact := &models.PartyContact{
		PartyID:     partyID,
		Name:        req.Name,
		Designation: req.Designation,
		Email:       req.Email,
		Phone:       req.Phone,
		IsPrimary:   req.IsPrimary,
	}

	// Note: Would need a separate repository method to create contact
	// For now, returning the contact object
	return contact, nil
}

func (s *partyService) AddBankDetail(ctx context.Context, partyID, tenantID uuid.UUID, req CreateBankDetailRequest) (*models.PartyBankDetail, error) {
	// Verify party exists
	_, err := s.partyRepo.FindByID(ctx, partyID, tenantID)
	if err != nil {
		return nil, ErrPartyNotFound
	}

	bankDetail := &models.PartyBankDetail{
		PartyID:       partyID,
		BankName:      req.BankName,
		AccountName:   req.AccountName,
		AccountNumber: req.AccountNumber,
		IFSCCode:      strings.ToUpper(req.IFSCCode),
		Branch:        req.Branch,
		IsPrimary:     req.IsPrimary,
	}

	return bankDetail, nil
}

// Helper functions

func isValidPAN(pan string) bool {
	if len(pan) != 10 {
		return false
	}
	panRegex := regexp.MustCompile(`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`)
	return panRegex.MatchString(strings.ToUpper(pan))
}
