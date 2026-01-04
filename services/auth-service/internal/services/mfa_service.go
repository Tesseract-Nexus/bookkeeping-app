package services

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/repository"
)

var (
	ErrMFAAlreadyEnabled  = errors.New("MFA is already enabled")
	ErrMFANotEnabled      = errors.New("MFA is not enabled")
	ErrInvalidMFACode     = errors.New("invalid MFA code")
	ErrInvalidBackupCode  = errors.New("invalid backup code")
	ErrMFASetupIncomplete = errors.New("MFA setup is incomplete")
)

const (
	MFAIssuer         = "BookKeep"
	BackupCodeCount   = 10
	BackupCodeLength  = 8
	MaxLoginAttempts  = 5
	LockoutDuration   = 15 * time.Minute
)

// MFAService handles MFA operations
type MFAService interface {
	SetupMFA(ctx context.Context, userID uuid.UUID) (*MFASetupResponse, error)
	VerifyMFASetup(ctx context.Context, userID uuid.UUID, code string) (*MFAVerifyResponse, error)
	DisableMFA(ctx context.Context, userID uuid.UUID, code string) error
	VerifyMFA(ctx context.Context, userID uuid.UUID, code string) (bool, error)
	VerifyBackupCode(ctx context.Context, userID uuid.UUID, code string) (bool, error)
	GetBackupCodes(ctx context.Context, userID uuid.UUID, code string) ([]string, error)
	RegenerateBackupCodes(ctx context.Context, userID uuid.UUID, code string) ([]string, error)
	RecordFailedAttempt(ctx context.Context, userID uuid.UUID) error
	ResetFailedAttempts(ctx context.Context, userID uuid.UUID) error
}

type mfaService struct {
	userRepo repository.UserRepository
}

// NewMFAService creates a new MFA service
func NewMFAService(userRepo repository.UserRepository) MFAService {
	return &mfaService{
		userRepo: userRepo,
	}
}

// MFASetupResponse contains the MFA setup information
type MFASetupResponse struct {
	Secret   string `json:"secret"`
	QRCode   string `json:"qr_code"` // Base64 encoded QR code image or otpauth URL
	OTPAuthURL string `json:"otpauth_url"`
}

// MFAVerifyResponse contains the MFA verification result
type MFAVerifyResponse struct {
	Enabled     bool     `json:"enabled"`
	BackupCodes []string `json:"backup_codes"`
}

// SetupMFA initiates MFA setup for a user
func (s *mfaService) SetupMFA(ctx context.Context, userID uuid.UUID) (*MFASetupResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	if user.MFAEnabled {
		return nil, ErrMFAAlreadyEnabled
	}

	// Generate a new TOTP key
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      MFAIssuer,
		AccountName: user.Email,
		SecretSize:  32,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate TOTP key: %w", err)
	}

	// Store the secret (but don't enable MFA yet)
	user.MFASecret = key.Secret()
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return &MFASetupResponse{
		Secret:     key.Secret(),
		OTPAuthURL: key.URL(),
		QRCode:     key.URL(), // Frontend will generate QR from URL
	}, nil
}

// VerifyMFASetup verifies the MFA code during setup and enables MFA
func (s *mfaService) VerifyMFASetup(ctx context.Context, userID uuid.UUID, code string) (*MFAVerifyResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	if user.MFAEnabled {
		return nil, ErrMFAAlreadyEnabled
	}

	if user.MFASecret == "" {
		return nil, ErrMFASetupIncomplete
	}

	// Verify the TOTP code
	valid := totp.Validate(code, user.MFASecret)
	if !valid {
		return nil, ErrInvalidMFACode
	}

	// Generate backup codes
	backupCodes, err := generateBackupCodes(BackupCodeCount)
	if err != nil {
		return nil, err
	}

	// Store backup codes as JSON
	backupCodesJSON, err := json.Marshal(backupCodes)
	if err != nil {
		return nil, err
	}

	// Enable MFA
	now := time.Now()
	user.MFAEnabled = true
	user.MFABackupCodes = string(backupCodesJSON)
	user.MFAVerifiedAt = &now

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return &MFAVerifyResponse{
		Enabled:     true,
		BackupCodes: backupCodes,
	}, nil
}

// DisableMFA disables MFA for a user
func (s *mfaService) DisableMFA(ctx context.Context, userID uuid.UUID, code string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}

	if !user.MFAEnabled {
		return ErrMFANotEnabled
	}

	// Verify the TOTP code before disabling
	valid := totp.Validate(code, user.MFASecret)
	if !valid {
		return ErrInvalidMFACode
	}

	// Clear MFA fields
	user.MFAEnabled = false
	user.MFASecret = ""
	user.MFABackupCodes = ""
	user.MFAVerifiedAt = nil

	return s.userRepo.Update(ctx, user)
}

// VerifyMFA verifies a TOTP code for login
func (s *mfaService) VerifyMFA(ctx context.Context, userID uuid.UUID, code string) (bool, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return false, ErrUserNotFound
	}

	if !user.MFAEnabled {
		return false, ErrMFANotEnabled
	}

	valid := totp.Validate(code, user.MFASecret)
	if valid {
		// Reset failed attempts on successful verification
		_ = s.ResetFailedAttempts(ctx, userID)
	}

	return valid, nil
}

// VerifyBackupCode verifies and consumes a backup code
func (s *mfaService) VerifyBackupCode(ctx context.Context, userID uuid.UUID, code string) (bool, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return false, ErrUserNotFound
	}

	if !user.MFAEnabled {
		return false, ErrMFANotEnabled
	}

	// Parse backup codes
	var backupCodes []string
	if err := json.Unmarshal([]byte(user.MFABackupCodes), &backupCodes); err != nil {
		return false, err
	}

	// Find and remove the used code
	found := false
	newCodes := make([]string, 0, len(backupCodes))
	for _, bc := range backupCodes {
		if bc == code && !found {
			found = true
			continue // Skip this code (consume it)
		}
		newCodes = append(newCodes, bc)
	}

	if !found {
		return false, ErrInvalidBackupCode
	}

	// Update backup codes
	newCodesJSON, err := json.Marshal(newCodes)
	if err != nil {
		return false, err
	}

	user.MFABackupCodes = string(newCodesJSON)
	if err := s.userRepo.Update(ctx, user); err != nil {
		return false, err
	}

	// Reset failed attempts on successful verification
	_ = s.ResetFailedAttempts(ctx, userID)

	return true, nil
}

// GetBackupCodes returns the remaining backup codes (requires MFA verification)
func (s *mfaService) GetBackupCodes(ctx context.Context, userID uuid.UUID, code string) ([]string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	if !user.MFAEnabled {
		return nil, ErrMFANotEnabled
	}

	// Verify TOTP code
	valid := totp.Validate(code, user.MFASecret)
	if !valid {
		return nil, ErrInvalidMFACode
	}

	var backupCodes []string
	if err := json.Unmarshal([]byte(user.MFABackupCodes), &backupCodes); err != nil {
		return nil, err
	}

	return backupCodes, nil
}

// RegenerateBackupCodes generates new backup codes (requires MFA verification)
func (s *mfaService) RegenerateBackupCodes(ctx context.Context, userID uuid.UUID, code string) ([]string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	if !user.MFAEnabled {
		return nil, ErrMFANotEnabled
	}

	// Verify TOTP code
	valid := totp.Validate(code, user.MFASecret)
	if !valid {
		return nil, ErrInvalidMFACode
	}

	// Generate new backup codes
	backupCodes, err := generateBackupCodes(BackupCodeCount)
	if err != nil {
		return nil, err
	}

	backupCodesJSON, err := json.Marshal(backupCodes)
	if err != nil {
		return nil, err
	}

	user.MFABackupCodes = string(backupCodesJSON)
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return backupCodes, nil
}

// RecordFailedAttempt increments failed login attempts and locks account if needed
func (s *mfaService) RecordFailedAttempt(ctx context.Context, userID uuid.UUID) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}

	user.FailedLoginAttempts++

	if user.FailedLoginAttempts >= MaxLoginAttempts {
		lockUntil := time.Now().Add(LockoutDuration)
		user.LockedUntil = &lockUntil
	}

	return s.userRepo.Update(ctx, user)
}

// ResetFailedAttempts resets the failed login counter
func (s *mfaService) ResetFailedAttempts(ctx context.Context, userID uuid.UUID) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}

	user.FailedLoginAttempts = 0
	user.LockedUntil = nil

	return s.userRepo.Update(ctx, user)
}

// generateBackupCodes generates random backup codes
func generateBackupCodes(count int) ([]string, error) {
	codes := make([]string, count)
	for i := 0; i < count; i++ {
		bytes := make([]byte, BackupCodeLength)
		if _, err := rand.Read(bytes); err != nil {
			return nil, err
		}
		// Use base32 for human-readable codes
		code := base32.StdEncoding.EncodeToString(bytes)[:BackupCodeLength]
		codes[i] = code
	}
	return codes, nil
}
