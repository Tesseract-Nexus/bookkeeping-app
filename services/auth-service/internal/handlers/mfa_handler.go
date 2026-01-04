package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/services"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
)

// MFAHandler handles MFA-related endpoints
type MFAHandler struct {
	mfaService  services.MFAService
	authService services.AuthService
}

// NewMFAHandler creates a new MFA handler
func NewMFAHandler(mfaService services.MFAService, authService services.AuthService) *MFAHandler {
	return &MFAHandler{
		mfaService:  mfaService,
		authService: authService,
	}
}

// SetupMFA initiates MFA setup for the current user
func (h *MFAHandler) SetupMFA(c *gin.Context) {
	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	result, err := h.mfaService.SetupMFA(c.Request.Context(), userID)
	if err != nil {
		if err == services.ErrMFAAlreadyEnabled {
			response.BadRequest(c, "MFA is already enabled", nil)
			return
		}
		response.InternalError(c, "Failed to setup MFA")
		return
	}

	response.Success(c, result)
}

// VerifyMFASetup verifies the MFA code during setup and enables MFA
func (h *MFAHandler) VerifyMFASetup(c *gin.Context) {
	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req struct {
		Code string `json:"code" binding:"required,len=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	result, err := h.mfaService.VerifyMFASetup(c.Request.Context(), userID, req.Code)
	if err != nil {
		if err == services.ErrInvalidMFACode {
			response.BadRequest(c, "Invalid MFA code", nil)
			return
		}
		if err == services.ErrMFAAlreadyEnabled {
			response.BadRequest(c, "MFA is already enabled", nil)
			return
		}
		if err == services.ErrMFASetupIncomplete {
			response.BadRequest(c, "Please call /mfa/setup first", nil)
			return
		}
		response.InternalError(c, "Failed to verify MFA")
		return
	}

	response.Success(c, result)
}

// DisableMFA disables MFA for the current user
func (h *MFAHandler) DisableMFA(c *gin.Context) {
	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req struct {
		Code string `json:"code" binding:"required,len=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	err = h.mfaService.DisableMFA(c.Request.Context(), userID, req.Code)
	if err != nil {
		if err == services.ErrInvalidMFACode {
			response.BadRequest(c, "Invalid MFA code", nil)
			return
		}
		if err == services.ErrMFANotEnabled {
			response.BadRequest(c, "MFA is not enabled", nil)
			return
		}
		response.InternalError(c, "Failed to disable MFA")
		return
	}

	response.Success(c, gin.H{"message": "MFA disabled successfully"})
}

// VerifyMFA verifies MFA code during login
func (h *MFAHandler) VerifyMFA(c *gin.Context) {
	var req struct {
		UserID string `json:"user_id" binding:"required"`
		Code   string `json:"code" binding:"required,len=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		response.BadRequest(c, "Invalid user ID", nil)
		return
	}

	valid, err := h.mfaService.VerifyMFA(c.Request.Context(), userID, req.Code)
	if err != nil {
		if err == services.ErrMFANotEnabled {
			response.BadRequest(c, "MFA is not enabled", nil)
			return
		}
		response.InternalError(c, "Failed to verify MFA")
		return
	}

	if !valid {
		// Record failed attempt
		_ = h.mfaService.RecordFailedAttempt(c.Request.Context(), userID)
		response.Unauthorized(c, "Invalid MFA code")
		return
	}

	// Get user and generate tokens
	user, err := h.authService.GetUser(c.Request.Context(), userID)
	if err != nil {
		response.InternalError(c, "Failed to get user")
		return
	}

	// Generate full auth response
	// For now, return success - in production, you'd generate tokens here
	response.Success(c, gin.H{
		"message": "MFA verified successfully",
		"user":    user,
	})
}

// VerifyBackupCode verifies a backup code during login
func (h *MFAHandler) VerifyBackupCode(c *gin.Context) {
	var req struct {
		UserID string `json:"user_id" binding:"required"`
		Code   string `json:"code" binding:"required,len=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		response.BadRequest(c, "Invalid user ID", nil)
		return
	}

	valid, err := h.mfaService.VerifyBackupCode(c.Request.Context(), userID, req.Code)
	if err != nil {
		if err == services.ErrInvalidBackupCode {
			response.Unauthorized(c, "Invalid backup code")
			return
		}
		response.InternalError(c, "Failed to verify backup code")
		return
	}

	if !valid {
		response.Unauthorized(c, "Invalid backup code")
		return
	}

	// Get user
	user, err := h.authService.GetUser(c.Request.Context(), userID)
	if err != nil {
		response.InternalError(c, "Failed to get user")
		return
	}

	response.Success(c, gin.H{
		"message": "Backup code verified successfully",
		"user":    user,
	})
}

// GetBackupCodes returns remaining backup codes (requires MFA verification)
func (h *MFAHandler) GetBackupCodes(c *gin.Context) {
	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req struct {
		Code string `json:"code" binding:"required,len=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	codes, err := h.mfaService.GetBackupCodes(c.Request.Context(), userID, req.Code)
	if err != nil {
		if err == services.ErrInvalidMFACode {
			response.Unauthorized(c, "Invalid MFA code")
			return
		}
		response.InternalError(c, "Failed to get backup codes")
		return
	}

	response.Success(c, gin.H{
		"backup_codes":   codes,
		"remaining_count": len(codes),
	})
}

// RegenerateBackupCodes generates new backup codes (requires MFA verification)
func (h *MFAHandler) RegenerateBackupCodes(c *gin.Context) {
	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req struct {
		Code string `json:"code" binding:"required,len=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	codes, err := h.mfaService.RegenerateBackupCodes(c.Request.Context(), userID, req.Code)
	if err != nil {
		if err == services.ErrInvalidMFACode {
			response.Unauthorized(c, "Invalid MFA code")
			return
		}
		response.InternalError(c, "Failed to regenerate backup codes")
		return
	}

	response.Success(c, gin.H{
		"backup_codes": codes,
		"message":      "New backup codes generated. Please save them securely.",
	})
}

// Helper method
func (h *MFAHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(userIDStr.(string))
}
