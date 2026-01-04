package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/config"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials      = errors.New("invalid credentials")
	ErrUserNotFound            = errors.New("user not found")
	ErrUserExists              = errors.New("user already exists")
	ErrInvalidToken            = errors.New("invalid token")
	ErrTokenExpired            = errors.New("token expired")
	ErrSessionNotFound         = errors.New("session not found")
	ErrAccountLocked           = errors.New("account is locked due to too many failed attempts")
	ErrEmailNotVerified        = errors.New("email not verified")
	ErrMFARequired             = errors.New("MFA verification required")
	ErrInvalidResetToken       = errors.New("invalid or expired reset token")
	ErrInvalidVerificationCode = errors.New("invalid or expired verification code")
	ErrPasswordReused          = errors.New("cannot reuse a recent password")
)

const (
	ResetTokenExpiry        = 1 * time.Hour
	VerificationCodeExpiry  = 10 * time.Minute
	MaxFailedLoginAttempts  = 5
	AccountLockoutDuration  = 15 * time.Minute
	VerificationCodeLength  = 6
)

// AuthService handles authentication business logic
type AuthService interface {
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*AuthResponse, error)
	Logout(ctx context.Context, userID uuid.UUID) error
	GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req UpdateProfileRequest) (*models.User, error)
	ChangePassword(ctx context.Context, userID uuid.UUID, req ChangePasswordRequest) error
	ForgotPassword(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, token, newPassword string) error
	VerifyEmail(ctx context.Context, token string) error
	RequestOTP(ctx context.Context, phone string) error
	VerifyOTP(ctx context.Context, phone, otp string) (*AuthResponse, error)
	ListUsers(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error)
	UpdateUserRoles(ctx context.Context, userID uuid.UUID, roles []string) error
	DeleteUser(ctx context.Context, userID uuid.UUID) error
}

type authService struct {
	cfg         *config.Config
	userRepo    repository.UserRepository
	sessionRepo repository.SessionRepository
	roleRepo    repository.RoleRepository
}

// NewAuthService creates a new auth service
func NewAuthService(
	cfg *config.Config,
	userRepo repository.UserRepository,
	sessionRepo repository.SessionRepository,
	roleRepo repository.RoleRepository,
) AuthService {
	return &authService{
		cfg:         cfg,
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		roleRepo:    roleRepo,
	}
}

// RegisterRequest represents a registration request
type RegisterRequest struct {
	Email     string    `json:"email" binding:"required,email"`
	Password  string    `json:"password" binding:"required,min=8"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Phone     string    `json:"phone"`
	TenantID  uuid.UUID `json:"tenant_id"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// UpdateProfileRequest represents a profile update request
type UpdateProfileRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
}

// ChangePasswordRequest represents a password change request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// AuthResponse represents an authentication response
type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
	User         *models.User `json:"user"`
}

func (s *authService) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	// Check if user exists
	existing, _ := s.userRepo.GetByEmail(ctx, req.Email)
	if existing != nil {
		return nil, ErrUserExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Phone:        req.Phone,
		TenantID:     req.TenantID,
		IsActive:     true,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Assign default role (staff)
	if err := s.assignDefaultRole(ctx, user.ID); err != nil {
		return nil, err
	}

	// Get user with roles
	user, err = s.userRepo.GetByID(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	// Generate tokens
	return s.generateAuthResponse(ctx, user)
}

func (s *authService) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if !user.IsActive {
		return nil, ErrInvalidCredentials
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Update last login
	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	return s.generateAuthResponse(ctx, user)
}

func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (*AuthResponse, error) {
	session, err := s.sessionRepo.GetByRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, ErrSessionNotFound
	}

	if session.IsExpired() {
		return nil, ErrTokenExpired
	}

	user, err := s.userRepo.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	// Delete old session
	_ = s.sessionRepo.Delete(ctx, session.ID)

	return s.generateAuthResponse(ctx, user)
}

func (s *authService) Logout(ctx context.Context, userID uuid.UUID) error {
	return s.sessionRepo.DeleteByUserID(ctx, userID)
}

func (s *authService) GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	return s.userRepo.GetByID(ctx, userID)
}

func (s *authService) UpdateProfile(ctx context.Context, userID uuid.UUID, req UpdateProfileRequest) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *authService) ChangePassword(ctx context.Context, userID uuid.UUID, req ChangePasswordRequest) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return s.userRepo.UpdatePassword(ctx, userID, string(hashedPassword))
}

func (s *authService) ForgotPassword(ctx context.Context, email string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// Don't reveal if user exists - always return success
		return nil
	}

	// Generate a secure reset token
	token, err := generateSecureToken(32)
	if err != nil {
		return err
	}

	// Hash the token for storage (we'll send the plain token via email)
	hashedToken := hashToken(token)

	// Set expiry
	expiresAt := time.Now().Add(ResetTokenExpiry)
	user.ResetToken = hashedToken
	user.ResetTokenExpiresAt = &expiresAt

	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	// TODO: Send email with reset link containing the token
	// The reset link should be: {frontend_url}/reset-password?token={token}
	// For now, we log it (in production, use an email service)
	fmt.Printf("[Password Reset] Token for %s: %s\n", email, token)

	return nil
}

func (s *authService) ResetPassword(ctx context.Context, token, newPassword string) error {
	// Hash the token to compare with stored hash
	hashedToken := hashToken(token)

	// Find user by reset token
	user, err := s.userRepo.GetByResetToken(ctx, hashedToken)
	if err != nil {
		return ErrInvalidResetToken
	}

	// Check if token is expired
	if user.ResetTokenExpiresAt == nil || time.Now().After(*user.ResetTokenExpiresAt) {
		return ErrInvalidResetToken
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update password and clear reset token
	user.PasswordHash = string(hashedPassword)
	user.ResetToken = ""
	user.ResetTokenExpiresAt = nil
	now := time.Now()
	user.PasswordChangedAt = &now

	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	// Invalidate all sessions on password reset
	_ = s.sessionRepo.DeleteByUserID(ctx, user.ID)

	return nil
}

func (s *authService) VerifyEmail(ctx context.Context, code string) error {
	// Find user by verification token/code
	user, err := s.userRepo.GetByVerificationToken(ctx, code)
	if err != nil {
		return ErrInvalidVerificationCode
	}

	// Check if token is expired
	if user.VerificationTokenExpiresAt == nil || time.Now().After(*user.VerificationTokenExpiresAt) {
		return ErrInvalidVerificationCode
	}

	// Mark email as verified
	now := time.Now()
	user.IsEmailVerified = true
	user.EmailVerifiedAt = &now
	user.VerificationToken = ""
	user.VerificationTokenExpiresAt = nil

	return s.userRepo.Update(ctx, user)
}

// SendVerificationEmail generates and stores a verification code, then sends it
func (s *authService) SendVerificationEmail(ctx context.Context, userID uuid.UUID) (string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", ErrUserNotFound
	}

	if user.IsEmailVerified {
		return "", nil // Already verified
	}

	// Generate a 6-digit verification code
	code := generateVerificationCode(VerificationCodeLength)

	// Set expiry
	expiresAt := time.Now().Add(VerificationCodeExpiry)
	user.VerificationToken = code
	user.VerificationTokenExpiresAt = &expiresAt

	if err := s.userRepo.Update(ctx, user); err != nil {
		return "", err
	}

	// TODO: Send email with verification code
	// For now, we log it (in production, use an email service)
	fmt.Printf("[Email Verification] Code for %s: %s\n", user.Email, code)

	return code, nil
}

func (s *authService) RequestOTP(ctx context.Context, phone string) error {
	user, err := s.userRepo.GetByPhone(ctx, phone)
	if err != nil {
		// Don't reveal if user exists
		return nil
	}

	// Generate a 6-digit OTP
	otp := generateVerificationCode(6)

	// Store OTP in verification token field temporarily
	expiresAt := time.Now().Add(VerificationCodeExpiry)
	user.VerificationToken = otp
	user.VerificationTokenExpiresAt = &expiresAt

	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	// TODO: Send OTP via SMS service
	fmt.Printf("[OTP] Code for %s: %s\n", phone, otp)

	return nil
}

func (s *authService) VerifyOTP(ctx context.Context, phone, otp string) (*AuthResponse, error) {
	user, err := s.userRepo.GetByPhone(ctx, phone)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	// Verify OTP
	if user.VerificationToken != otp {
		return nil, ErrInvalidVerificationCode
	}

	// Check expiry
	if user.VerificationTokenExpiresAt == nil || time.Now().After(*user.VerificationTokenExpiresAt) {
		return nil, ErrInvalidVerificationCode
	}

	// Clear the OTP
	user.VerificationToken = ""
	user.VerificationTokenExpiresAt = nil
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	// Generate auth tokens
	return s.generateAuthResponse(ctx, user)
}

// Helper functions

func generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func generateVerificationCode(length int) string {
	const digits = "0123456789"
	code := make([]byte, length)
	for i := range code {
		b := make([]byte, 1)
		rand.Read(b)
		code[i] = digits[int(b[0])%len(digits)]
	}
	return string(code)
}

func (s *authService) ListUsers(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	return s.userRepo.GetByTenantID(ctx, tenantID, page, limit)
}

func (s *authService) UpdateUserRoles(ctx context.Context, userID uuid.UUID, roleNames []string) error {
	roles, err := s.roleRepo.GetByNames(ctx, roleNames)
	if err != nil {
		return err
	}

	roleIDs := make([]uuid.UUID, len(roles))
	for i, role := range roles {
		roleIDs[i] = role.ID
	}

	return s.userRepo.AssignRoles(ctx, userID, roleIDs)
}

func (s *authService) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	return s.userRepo.Delete(ctx, userID)
}

// Helper methods

func (s *authService) generateAuthResponse(ctx context.Context, user *models.User) (*AuthResponse, error) {
	// Generate access token
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshToken, err := s.generateRefreshToken()
	if err != nil {
		return nil, err
	}

	// Store session
	session := &models.Session{
		UserID:       user.ID,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(s.cfg.JWT.RefreshTokenTTL),
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.cfg.JWT.AccessTokenTTL.Seconds()),
		User:         user,
	}, nil
}

func (s *authService) generateAccessToken(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":   user.ID.String(),
		"email":     user.Email,
		"tenant_id": user.TenantID.String(),
		"roles":     user.GetRoleNames(),
		"iss":       s.cfg.JWT.Issuer,
		"iat":       time.Now().Unix(),
		"exp":       time.Now().Add(s.cfg.JWT.AccessTokenTTL).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWT.Secret))
}

func (s *authService) generateRefreshToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

func (s *authService) assignDefaultRole(ctx context.Context, userID uuid.UUID) error {
	// Get the default "staff" role
	role, err := s.roleRepo.GetByName(ctx, "staff")
	if err != nil {
		return err
	}

	return s.userRepo.AssignRoles(ctx, userID, []uuid.UUID{role.ID})
}
