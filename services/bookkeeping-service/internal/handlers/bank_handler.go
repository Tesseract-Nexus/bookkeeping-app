package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/services"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
)

// BankHandler handles bank account and reconciliation endpoints
type BankHandler struct {
	bankService services.BankService
}

// NewBankHandler creates a new bank handler
func NewBankHandler(bankService services.BankService) *BankHandler {
	return &BankHandler{bankService: bankService}
}

// ListBankAccounts returns all bank accounts for a tenant
func (h *BankHandler) ListBankAccounts(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	accounts, err := h.bankService.ListBankAccounts(c.Request.Context(), tenantID)
	if err != nil {
		response.InternalError(c, "Failed to list bank accounts")
		return
	}

	response.Success(c, accounts)
}

// CreateBankAccount creates a new bank account
func (h *BankHandler) CreateBankAccount(c *gin.Context) {
	var req services.CreateBankAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	tenantID, _ := h.getTenantIDFromContext(c)
	req.TenantID = tenantID

	account, err := h.bankService.CreateBankAccount(c.Request.Context(), req)
	if err != nil {
		response.InternalError(c, "Failed to create bank account")
		return
	}

	response.Created(c, account)
}

// GetBankAccount returns a specific bank account
func (h *BankHandler) GetBankAccount(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank account ID", nil)
		return
	}

	account, err := h.bankService.GetBankAccount(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Bank account not found")
		return
	}

	response.Success(c, account)
}

// UpdateBankAccount updates a bank account
func (h *BankHandler) UpdateBankAccount(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank account ID", nil)
		return
	}

	var req services.UpdateBankAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	account, err := h.bankService.UpdateBankAccount(c.Request.Context(), id, req)
	if err != nil {
		if err == services.ErrBankAccountNotFound {
			response.NotFound(c, "Bank account not found")
			return
		}
		response.InternalError(c, "Failed to update bank account")
		return
	}

	response.Success(c, account)
}

// DeleteBankAccount deletes a bank account
func (h *BankHandler) DeleteBankAccount(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank account ID", nil)
		return
	}

	if err := h.bankService.DeleteBankAccount(c.Request.Context(), id); err != nil {
		if err == services.ErrBankAccountNotFound {
			response.NotFound(c, "Bank account not found")
			return
		}
		response.InternalError(c, "Failed to delete bank account")
		return
	}

	response.NoContent(c)
}

// ImportStatement imports a bank statement
func (h *BankHandler) ImportStatement(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank account ID", nil)
		return
	}

	tenantID, _ := h.getTenantIDFromContext(c)

	// Get the uploaded file
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "No file uploaded", nil)
		return
	}
	defer file.Close()

	format := c.DefaultQuery("format", "csv")

	result, err := h.bankService.ImportBankStatement(c.Request.Context(), id, tenantID, file, format)
	if err != nil {
		if err == services.ErrBankAccountNotFound {
			response.NotFound(c, "Bank account not found")
			return
		}
		response.BadRequest(c, err.Error(), nil)
		return
	}

	response.Success(c, result)
}

// GetBankTransactions returns bank transactions
func (h *BankHandler) GetBankTransactions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank account ID", nil)
		return
	}

	filters := repository.BankTransactionFilters{
		FromDate:   c.Query("from_date"),
		ToDate:     c.Query("to_date"),
		SearchTerm: c.Query("search"),
		Page:       1,
		Limit:      50,
	}

	if c.Query("reconciled") == "true" {
		t := true
		filters.IsReconciled = &t
	} else if c.Query("reconciled") == "false" {
		f := false
		filters.IsReconciled = &f
	}

	transactions, total, err := h.bankService.GetBankTransactions(c.Request.Context(), id, filters)
	if err != nil {
		response.InternalError(c, "Failed to get bank transactions")
		return
	}

	response.Paginated(c, transactions, filters.Page, filters.Limit, total)
}

// GetUnreconciledTransactions returns unreconciled transactions
func (h *BankHandler) GetUnreconciledTransactions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank account ID", nil)
		return
	}

	transactions, err := h.bankService.GetUnreconciledTransactions(c.Request.Context(), id)
	if err != nil {
		response.InternalError(c, "Failed to get unreconciled transactions")
		return
	}

	response.Success(c, transactions)
}

// ReconcileTransaction reconciles a bank transaction with a ledger transaction
func (h *BankHandler) ReconcileTransaction(c *gin.Context) {
	bankTxID, err := uuid.Parse(c.Param("tx_id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank transaction ID", nil)
		return
	}

	var req struct {
		LedgerTransactionID string `json:"ledger_transaction_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	ledgerTxID, err := uuid.Parse(req.LedgerTransactionID)
	if err != nil {
		response.BadRequest(c, "Invalid ledger transaction ID", nil)
		return
	}

	userID, _ := h.getUserIDFromContext(c)

	if err := h.bankService.ReconcileTransaction(c.Request.Context(), bankTxID, ledgerTxID, userID); err != nil {
		if err == services.ErrBankTxNotFound {
			response.NotFound(c, "Bank transaction not found")
			return
		}
		if err == services.ErrAlreadyReconciled {
			response.Conflict(c, "Transaction already reconciled")
			return
		}
		response.InternalError(c, "Failed to reconcile transaction")
		return
	}

	response.Success(c, gin.H{"message": "Transaction reconciled successfully"})
}

// AutoReconcile automatically reconciles transactions
func (h *BankHandler) AutoReconcile(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank account ID", nil)
		return
	}

	userID, _ := h.getUserIDFromContext(c)

	result, err := h.bankService.AutoReconcile(c.Request.Context(), id, userID)
	if err != nil {
		response.InternalError(c, "Failed to auto-reconcile")
		return
	}

	response.Success(c, result)
}

// UnreconcileTransaction unreconciles a bank transaction
func (h *BankHandler) UnreconcileTransaction(c *gin.Context) {
	bankTxID, err := uuid.Parse(c.Param("tx_id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank transaction ID", nil)
		return
	}

	if err := h.bankService.UnreconcileTransaction(c.Request.Context(), bankTxID); err != nil {
		if err == services.ErrBankTxNotFound {
			response.NotFound(c, "Bank transaction not found")
			return
		}
		response.InternalError(c, "Failed to unreconcile transaction")
		return
	}

	response.Success(c, gin.H{"message": "Transaction unreconciled successfully"})
}

// GetReconciliationSummary returns the reconciliation summary
func (h *BankHandler) GetReconciliationSummary(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank account ID", nil)
		return
	}

	asOfDate := time.Now()
	if dateStr := c.Query("as_of_date"); dateStr != "" {
		if parsed, err := time.Parse("2006-01-02", dateStr); err == nil {
			asOfDate = parsed
		}
	}

	summary, err := h.bankService.GetReconciliationSummary(c.Request.Context(), id, asOfDate)
	if err != nil {
		if err == services.ErrBankAccountNotFound {
			response.NotFound(c, "Bank account not found")
			return
		}
		response.InternalError(c, "Failed to get reconciliation summary")
		return
	}

	response.Success(c, summary)
}

// SuggestMatches suggests possible matches for a bank transaction
func (h *BankHandler) SuggestMatches(c *gin.Context) {
	bankTxID, err := uuid.Parse(c.Param("tx_id"))
	if err != nil {
		response.BadRequest(c, "Invalid bank transaction ID", nil)
		return
	}

	suggestions, err := h.bankService.SuggestMatches(c.Request.Context(), bankTxID)
	if err != nil {
		if err == services.ErrBankTxNotFound {
			response.NotFound(c, "Bank transaction not found")
			return
		}
		response.InternalError(c, "Failed to suggest matches")
		return
	}

	response.Success(c, suggestions)
}

// Helper methods
func (h *BankHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(userIDStr.(string))
}

func (h *BankHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(tenantIDStr.(string))
}
