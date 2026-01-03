package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/services"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
)

// AccountHandler handles account-related endpoints
type AccountHandler struct {
	accountService services.AccountService
}

// NewAccountHandler creates a new account handler
func NewAccountHandler(accountService services.AccountService) *AccountHandler {
	return &AccountHandler{accountService: accountService}
}

// CreateAccount handles account creation
func (h *AccountHandler) CreateAccount(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	var req services.CreateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	account, err := h.accountService.CreateAccount(c.Request.Context(), tenantID, req)
	if err != nil {
		switch err {
		case services.ErrAccountExists:
			response.Conflict(c, "Account with this code already exists")
		default:
			response.InternalError(c, "Failed to create account")
		}
		return
	}

	response.Created(c, account)
}

// GetAccount handles getting a single account
func (h *AccountHandler) GetAccount(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid account ID", nil)
		return
	}

	account, err := h.accountService.GetAccount(c.Request.Context(), accountID, tenantID)
	if err != nil {
		response.NotFound(c, "Account not found")
		return
	}

	response.Success(c, account)
}

// UpdateAccount handles account updates
func (h *AccountHandler) UpdateAccount(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid account ID", nil)
		return
	}

	var req services.UpdateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	account, err := h.accountService.UpdateAccount(c.Request.Context(), accountID, tenantID, req)
	if err != nil {
		switch err {
		case services.ErrAccountNotFound:
			response.NotFound(c, "Account not found")
		case services.ErrSystemAccount:
			response.Forbidden(c, "Cannot modify system account")
		case services.ErrAccountExists:
			response.Conflict(c, "Account with this code already exists")
		default:
			response.InternalError(c, "Failed to update account")
		}
		return
	}

	response.Success(c, account)
}

// DeleteAccount handles account deletion
func (h *AccountHandler) DeleteAccount(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	accountID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid account ID", nil)
		return
	}

	if err := h.accountService.DeleteAccount(c.Request.Context(), accountID, tenantID); err != nil {
		switch err {
		case services.ErrAccountNotFound:
			response.NotFound(c, "Account not found")
		case services.ErrSystemAccount:
			response.Forbidden(c, "Cannot delete system account")
		case services.ErrAccountHasBalance:
			response.BadRequest(c, "Account has balance, cannot delete", nil)
		default:
			response.InternalError(c, "Failed to delete account")
		}
		return
	}

	response.NoContent(c)
}

// ListAccounts handles listing accounts
func (h *AccountHandler) ListAccounts(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	filter := repository.AccountFilter{
		Type:      c.Query("type"),
		SubType:   c.Query("sub_type"),
		Search:    c.Query("search"),
		SortBy:    c.Query("sort_by"),
		SortOrder: c.Query("sort_order"),
	}

	if page, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil {
		filter.Page = page
	}
	if perPage, err := strconv.Atoi(c.DefaultQuery("per_page", "100")); err == nil {
		filter.PerPage = perPage
	}
	if isActive := c.Query("is_active"); isActive != "" {
		active := isActive == "true"
		filter.IsActive = &active
	}
	if parentID := c.Query("parent_id"); parentID != "" {
		if id, err := uuid.Parse(parentID); err == nil {
			filter.ParentID = &id
		}
	}

	accounts, total, err := h.accountService.ListAccounts(c.Request.Context(), tenantID, filter)
	if err != nil {
		response.InternalError(c, "Failed to list accounts")
		return
	}

	response.Paginated(c, accounts, filter.Page, filter.PerPage, total)
}

// GetChartOfAccounts handles getting the chart of accounts
func (h *AccountHandler) GetChartOfAccounts(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	accounts, err := h.accountService.GetChartOfAccounts(c.Request.Context(), tenantID)
	if err != nil {
		response.InternalError(c, "Failed to get chart of accounts")
		return
	}

	response.Success(c, accounts)
}

// GetAccountsByType handles getting accounts by type
func (h *AccountHandler) GetAccountsByType(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	accountType := c.Param("type")
	if accountType == "" {
		response.BadRequest(c, "Account type required", nil)
		return
	}

	accounts, err := h.accountService.GetAccountsByType(c.Request.Context(), tenantID, models.AccountType(accountType))
	if err != nil {
		response.InternalError(c, "Failed to get accounts")
		return
	}

	response.Success(c, accounts)
}

// InitializeAccounts handles initializing default accounts
func (h *AccountHandler) InitializeAccounts(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	if err := h.accountService.InitializeDefaultAccounts(c.Request.Context(), tenantID); err != nil {
		response.InternalError(c, "Failed to initialize accounts")
		return
	}

	response.Success(c, gin.H{"message": "Default accounts initialized successfully"})
}

// Helper methods

func (h *AccountHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, services.ErrAccountNotFound
	}
	return uuid.Parse(tenantIDStr.(string))
}
