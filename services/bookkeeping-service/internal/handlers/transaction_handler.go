package handlers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/services"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
)

// TransactionHandler handles transaction-related endpoints
type TransactionHandler struct {
	transactionService services.TransactionService
}

// NewTransactionHandler creates a new transaction handler
func NewTransactionHandler(transactionService services.TransactionService) *TransactionHandler {
	return &TransactionHandler{transactionService: transactionService}
}

// CreateTransaction handles transaction creation
func (h *TransactionHandler) CreateTransaction(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req services.CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	transaction, err := h.transactionService.CreateTransaction(c.Request.Context(), tenantID, userID, req)
	if err != nil {
		switch err {
		case services.ErrTransactionNotBalanced:
			response.BadRequest(c, "Transaction is not balanced (debits must equal credits)", nil)
		case services.ErrAccountNotFound:
			response.BadRequest(c, "One or more accounts not found", nil)
		default:
			response.InternalError(c, "Failed to create transaction")
		}
		return
	}

	response.Created(c, transaction)
}

// CreateQuickSale handles quick sale creation
func (h *TransactionHandler) CreateQuickSale(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req services.QuickSaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	transaction, err := h.transactionService.CreateQuickSale(c.Request.Context(), tenantID, userID, req)
	if err != nil {
		if err == services.ErrAccountNotFound {
			response.BadRequest(c, "Default accounts not configured", nil)
			return
		}
		response.InternalError(c, "Failed to create sale")
		return
	}

	response.Created(c, transaction)
}

// CreateQuickExpense handles quick expense creation
func (h *TransactionHandler) CreateQuickExpense(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req services.QuickExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	transaction, err := h.transactionService.CreateQuickExpense(c.Request.Context(), tenantID, userID, req)
	if err != nil {
		switch err {
		case services.ErrAccountNotFound:
			response.BadRequest(c, "Account not found", nil)
		case services.ErrInvalidAmount:
			response.BadRequest(c, "Amount must be greater than zero", nil)
		default:
			response.InternalError(c, "Failed to create expense")
		}
		return
	}

	response.Created(c, transaction)
}

// GetTransaction handles getting a single transaction
func (h *TransactionHandler) GetTransaction(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	transactionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid transaction ID", nil)
		return
	}

	transaction, err := h.transactionService.GetTransaction(c.Request.Context(), transactionID, tenantID)
	if err != nil {
		response.NotFound(c, "Transaction not found")
		return
	}

	response.Success(c, transaction)
}

// ListTransactions handles listing transactions
func (h *TransactionHandler) ListTransactions(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	filter := repository.TransactionFilter{
		Type:      c.Query("type"),
		Status:    c.Query("status"),
		FromDate:  c.Query("from_date"),
		ToDate:    c.Query("to_date"),
		Search:    c.Query("search"),
		SortBy:    c.Query("sort_by"),
		SortOrder: c.Query("sort_order"),
	}

	if page, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil {
		filter.Page = page
	}
	if perPage, err := strconv.Atoi(c.DefaultQuery("per_page", "20")); err == nil {
		filter.PerPage = perPage
	}
	if partyID := c.Query("party_id"); partyID != "" {
		if id, err := uuid.Parse(partyID); err == nil {
			filter.PartyID = &id
		}
	}
	if storeID := c.Query("store_id"); storeID != "" {
		if id, err := uuid.Parse(storeID); err == nil {
			filter.StoreID = &id
		}
	}

	transactions, total, err := h.transactionService.ListTransactions(c.Request.Context(), tenantID, filter)
	if err != nil {
		response.InternalError(c, "Failed to list transactions")
		return
	}

	response.Paginated(c, transactions, filter.Page, filter.PerPage, total)
}

// VoidTransaction handles voiding a transaction
func (h *TransactionHandler) VoidTransaction(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	transactionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid transaction ID", nil)
		return
	}

	if err := h.transactionService.VoidTransaction(c.Request.Context(), transactionID, tenantID); err != nil {
		switch err {
		case services.ErrTransactionNotFound:
			response.NotFound(c, "Transaction not found")
		case services.ErrCannotVoidTransaction:
			response.BadRequest(c, "Cannot void this transaction", nil)
		default:
			response.InternalError(c, "Failed to void transaction")
		}
		return
	}

	response.Success(c, gin.H{"message": "Transaction voided successfully"})
}

// GetDailySummary handles getting daily summary
func (h *TransactionHandler) GetDailySummary(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		response.BadRequest(c, "Invalid date format", nil)
		return
	}

	summary, err := h.transactionService.GetDailySummary(c.Request.Context(), tenantID, date)
	if err != nil {
		response.InternalError(c, "Failed to get daily summary")
		return
	}

	response.Success(c, summary)
}

// Helper methods

func (h *TransactionHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, services.ErrTransactionNotFound
	}
	return uuid.Parse(userIDStr.(string))
}

func (h *TransactionHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, services.ErrTransactionNotFound
	}
	return uuid.Parse(tenantIDStr.(string))
}
