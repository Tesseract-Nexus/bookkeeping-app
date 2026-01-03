package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/repository"
)

var (
	ErrAccountExists     = errors.New("account with this code already exists")
	ErrSystemAccount     = errors.New("cannot modify system account")
	ErrAccountHasBalance = errors.New("account has balance, cannot delete")
)

// AccountService defines the interface for account business logic
type AccountService interface {
	CreateAccount(ctx context.Context, tenantID uuid.UUID, req CreateAccountRequest) (*models.Account, error)
	UpdateAccount(ctx context.Context, id, tenantID uuid.UUID, req UpdateAccountRequest) (*models.Account, error)
	DeleteAccount(ctx context.Context, id, tenantID uuid.UUID) error
	GetAccount(ctx context.Context, id, tenantID uuid.UUID) (*models.Account, error)
	ListAccounts(ctx context.Context, tenantID uuid.UUID, filter repository.AccountFilter) ([]models.Account, int64, error)
	GetChartOfAccounts(ctx context.Context, tenantID uuid.UUID) ([]models.Account, error)
	GetAccountsByType(ctx context.Context, tenantID uuid.UUID, accountType models.AccountType) ([]models.Account, error)
	InitializeDefaultAccounts(ctx context.Context, tenantID uuid.UUID) error
}

// CreateAccountRequest represents a request to create an account
type CreateAccountRequest struct {
	Code        string  `json:"code"`
	Name        string  `json:"name" binding:"required,max=255"`
	Type        string  `json:"type" binding:"required"`
	SubType     string  `json:"sub_type"`
	Description string  `json:"description"`
	ParentID    *uuid.UUID `json:"parent_id"`
	OpeningBalance float64 `json:"opening_balance"`
}

// UpdateAccountRequest represents a request to update an account
type UpdateAccountRequest struct {
	Code        *string `json:"code"`
	Name        *string `json:"name"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"is_active"`
}

type accountService struct {
	accountRepo repository.AccountRepository
}

// NewAccountService creates a new account service
func NewAccountService(accountRepo repository.AccountRepository) AccountService {
	return &accountService{accountRepo: accountRepo}
}

func (s *accountService) CreateAccount(ctx context.Context, tenantID uuid.UUID, req CreateAccountRequest) (*models.Account, error) {
	// Check for duplicate code
	if req.Code != "" {
		existing, _ := s.accountRepo.FindByCode(ctx, req.Code, tenantID)
		if existing != nil {
			return nil, ErrAccountExists
		}
	}

	account := &models.Account{
		TenantID:       tenantID,
		Code:           req.Code,
		Name:           req.Name,
		Type:           models.AccountType(req.Type),
		SubType:        models.AccountSubType(req.SubType),
		Description:    req.Description,
		ParentID:       req.ParentID,
		OpeningBalance: req.OpeningBalance,
		CurrentBalance: req.OpeningBalance,
		IsSystem:       false,
		IsActive:       true,
	}

	if err := s.accountRepo.Create(ctx, account); err != nil {
		return nil, err
	}

	return account, nil
}

func (s *accountService) UpdateAccount(ctx context.Context, id, tenantID uuid.UUID, req UpdateAccountRequest) (*models.Account, error) {
	account, err := s.accountRepo.FindByID(ctx, id, tenantID)
	if err != nil {
		return nil, ErrAccountNotFound
	}

	if account.IsSystem {
		return nil, ErrSystemAccount
	}

	if req.Code != nil && *req.Code != account.Code {
		existing, _ := s.accountRepo.FindByCode(ctx, *req.Code, tenantID)
		if existing != nil && existing.ID != id {
			return nil, ErrAccountExists
		}
		account.Code = *req.Code
	}
	if req.Name != nil {
		account.Name = *req.Name
	}
	if req.Description != nil {
		account.Description = *req.Description
	}
	if req.IsActive != nil {
		account.IsActive = *req.IsActive
	}

	if err := s.accountRepo.Update(ctx, account); err != nil {
		return nil, err
	}

	return account, nil
}

func (s *accountService) DeleteAccount(ctx context.Context, id, tenantID uuid.UUID) error {
	account, err := s.accountRepo.FindByID(ctx, id, tenantID)
	if err != nil {
		return ErrAccountNotFound
	}

	if account.IsSystem {
		return ErrSystemAccount
	}

	if account.CurrentBalance != 0 {
		return ErrAccountHasBalance
	}

	return s.accountRepo.Delete(ctx, id, tenantID)
}

func (s *accountService) GetAccount(ctx context.Context, id, tenantID uuid.UUID) (*models.Account, error) {
	account, err := s.accountRepo.FindByID(ctx, id, tenantID)
	if err != nil {
		return nil, ErrAccountNotFound
	}
	return account, nil
}

func (s *accountService) ListAccounts(ctx context.Context, tenantID uuid.UUID, filter repository.AccountFilter) ([]models.Account, int64, error) {
	return s.accountRepo.FindAll(ctx, tenantID, filter)
}

func (s *accountService) GetChartOfAccounts(ctx context.Context, tenantID uuid.UUID) ([]models.Account, error) {
	return s.accountRepo.GetChartOfAccounts(ctx, tenantID)
}

func (s *accountService) GetAccountsByType(ctx context.Context, tenantID uuid.UUID, accountType models.AccountType) ([]models.Account, error) {
	return s.accountRepo.FindByType(ctx, tenantID, accountType)
}

func (s *accountService) InitializeDefaultAccounts(ctx context.Context, tenantID uuid.UUID) error {
	return s.accountRepo.CreateDefaultAccounts(ctx, tenantID)
}
