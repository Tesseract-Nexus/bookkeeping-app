package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/services"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService services.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req services.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	// Get tenant ID from context if available
	if tenantID, exists := c.Get("tenant_id"); exists {
		if tid, err := uuid.Parse(tenantID.(string)); err == nil {
			req.TenantID = tid
		}
	}

	authResp, err := h.authService.Register(c.Request.Context(), req)
	if err != nil {
		if err == services.ErrUserExists {
			response.Conflict(c, "User with this email already exists")
			return
		}
		response.InternalError(c, "Failed to register user")
		return
	}

	response.Created(c, authResp)
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req services.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	authResp, err := h.authService.Login(c.Request.Context(), req)
	if err != nil {
		if err == services.ErrInvalidCredentials {
			response.Unauthorized(c, "Invalid email or password")
			return
		}
		response.InternalError(c, "Failed to login")
		return
	}

	response.Success(c, authResp)
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	authResp, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		if err == services.ErrSessionNotFound || err == services.ErrTokenExpired {
			response.Unauthorized(c, "Invalid or expired refresh token")
			return
		}
		response.InternalError(c, "Failed to refresh token")
		return
	}

	response.Success(c, authResp)
}

// GetCurrentUser returns the current authenticated user
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	user, err := h.authService.GetUser(c.Request.Context(), userID)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}

	response.Success(c, user)
}

// UpdateProfile updates the current user's profile
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req services.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	user, err := h.authService.UpdateProfile(c.Request.Context(), userID, req)
	if err != nil {
		response.InternalError(c, "Failed to update profile")
		return
	}

	response.Success(c, user)
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	if err := h.authService.Logout(c.Request.Context(), userID); err != nil {
		response.InternalError(c, "Failed to logout")
		return
	}

	response.NoContent(c)
}

// ChangePassword handles password change
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req services.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	if err := h.authService.ChangePassword(c.Request.Context(), userID, req); err != nil {
		if err == services.ErrInvalidCredentials {
			response.BadRequest(c, "Current password is incorrect", nil)
			return
		}
		response.InternalError(c, "Failed to change password")
		return
	}

	response.Success(c, gin.H{"message": "Password changed successfully"})
}

// ForgotPassword initiates password reset
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	if err := h.authService.ForgotPassword(c.Request.Context(), req.Email); err != nil {
		// Don't reveal if email exists or not
	}

	response.Success(c, gin.H{"message": "If your email exists, you will receive a password reset link"})
}

// ResetPassword resets password with token
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	if err := h.authService.ResetPassword(c.Request.Context(), req.Token, req.NewPassword); err != nil {
		response.BadRequest(c, "Invalid or expired reset token", nil)
		return
	}

	response.Success(c, gin.H{"message": "Password reset successfully"})
}

// VerifyEmail verifies user email
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	if err := h.authService.VerifyEmail(c.Request.Context(), req.Token); err != nil {
		response.BadRequest(c, "Invalid or expired verification token", nil)
		return
	}

	response.Success(c, gin.H{"message": "Email verified successfully"})
}

// RequestOTP sends OTP to phone
func (h *AuthHandler) RequestOTP(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	if err := h.authService.RequestOTP(c.Request.Context(), req.Phone); err != nil {
		response.InternalError(c, "Failed to send OTP")
		return
	}

	response.Success(c, gin.H{"message": "OTP sent successfully"})
}

// VerifyOTP verifies OTP and returns auth tokens
func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
		OTP   string `json:"otp" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	authResp, err := h.authService.VerifyOTP(c.Request.Context(), req.Phone, req.OTP)
	if err != nil {
		response.Unauthorized(c, "Invalid OTP")
		return
	}

	response.Success(c, authResp)
}

// ListUsers lists all users (admin only)
func (h *AuthHandler) ListUsers(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	page := 1
	limit := 20

	users, total, err := h.authService.ListUsers(c.Request.Context(), tenantID, page, limit)
	if err != nil {
		response.InternalError(c, "Failed to list users")
		return
	}

	response.Paginated(c, users, page, limit, total)
}

// GetUser gets a specific user (admin only)
func (h *AuthHandler) GetUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid user ID", nil)
		return
	}

	user, err := h.authService.GetUser(c.Request.Context(), userID)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}

	response.Success(c, user)
}

// UpdateUserRoles updates user roles (admin only)
func (h *AuthHandler) UpdateUserRoles(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid user ID", nil)
		return
	}

	var req struct {
		Roles []string `json:"roles" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	if err := h.authService.UpdateUserRoles(c.Request.Context(), userID, req.Roles); err != nil {
		response.InternalError(c, "Failed to update user roles")
		return
	}

	response.Success(c, gin.H{"message": "User roles updated successfully"})
}

// DeleteUser deletes a user (admin only)
func (h *AuthHandler) DeleteUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid user ID", nil)
		return
	}

	if err := h.authService.DeleteUser(c.Request.Context(), userID); err != nil {
		response.InternalError(c, "Failed to delete user")
		return
	}

	response.NoContent(c)
}

// Helper methods

func (h *AuthHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(userIDStr.(string))
}

func (h *AuthHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(tenantIDStr.(string))
}
