package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/services"
)

// RecurringInvoiceHandler handles recurring invoice endpoints
type RecurringInvoiceHandler struct {
	recurringService services.RecurringInvoiceService
}

// NewRecurringInvoiceHandler creates a new recurring invoice handler
func NewRecurringInvoiceHandler(recurringService services.RecurringInvoiceService) *RecurringInvoiceHandler {
	return &RecurringInvoiceHandler{recurringService: recurringService}
}

// List lists all recurring invoices for a tenant
func (h *RecurringInvoiceHandler) List(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	filters := repository.RecurringInvoiceFilters{}

	if status := c.Query("status"); status != "" {
		filters.Status = models.RecurringInvoiceStatus(status)
	}
	if customerID := c.Query("customer_id"); customerID != "" {
		if id, err := uuid.Parse(customerID); err == nil {
			filters.CustomerID = id
		}
	}
	if search := c.Query("search"); search != "" {
		filters.Search = search
	}
	if pageStr := c.Query("page"); pageStr != "" {
		page, _ := strconv.Atoi(pageStr)
		filters.Page = page
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		limit, _ := strconv.Atoi(limitStr)
		filters.Limit = limit
	}

	recurring, total, err := h.recurringService.List(c.Request.Context(), tenantID, filters)
	if err != nil {
		response.InternalError(c, "Failed to list recurring invoices")
		return
	}

	if filters.Page <= 0 {
		filters.Page = 1
	}
	if filters.Limit <= 0 {
		filters.Limit = 20
	}

	response.Paginated(c, recurring, filters.Page, filters.Limit, total)
}

// Create creates a new recurring invoice
func (h *RecurringInvoiceHandler) Create(c *gin.Context) {
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

	var req services.CreateRecurringInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	req.TenantID = tenantID
	req.CreatedBy = userID

	recurring, err := h.recurringService.Create(c.Request.Context(), req)
	if err != nil {
		if err == services.ErrInvalidRecurrence {
			response.BadRequest(c, "Invalid recurrence settings", nil)
			return
		}
		response.InternalError(c, "Failed to create recurring invoice")
		return
	}

	response.Created(c, recurring)
}

// Get gets a recurring invoice by ID
func (h *RecurringInvoiceHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring invoice ID", nil)
		return
	}

	recurring, err := h.recurringService.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == services.ErrRecurringInvoiceNotFound {
			response.NotFound(c, "Recurring invoice not found")
			return
		}
		response.InternalError(c, "Failed to get recurring invoice")
		return
	}

	response.Success(c, recurring)
}

// Update updates a recurring invoice
func (h *RecurringInvoiceHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring invoice ID", nil)
		return
	}

	var req services.UpdateRecurringInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	recurring, err := h.recurringService.Update(c.Request.Context(), id, req)
	if err != nil {
		if err == services.ErrRecurringInvoiceNotFound {
			response.NotFound(c, "Recurring invoice not found")
			return
		}
		if err == services.ErrInvalidRecurrence {
			response.BadRequest(c, "Invalid recurrence settings", nil)
			return
		}
		response.InternalError(c, "Failed to update recurring invoice")
		return
	}

	response.Success(c, recurring)
}

// Delete deletes a recurring invoice
func (h *RecurringInvoiceHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring invoice ID", nil)
		return
	}

	if err := h.recurringService.Delete(c.Request.Context(), id); err != nil {
		if err == services.ErrRecurringInvoiceNotFound {
			response.NotFound(c, "Recurring invoice not found")
			return
		}
		response.InternalError(c, "Failed to delete recurring invoice")
		return
	}

	response.NoContent(c)
}

// Pause pauses a recurring invoice
func (h *RecurringInvoiceHandler) Pause(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring invoice ID", nil)
		return
	}

	if err := h.recurringService.Pause(c.Request.Context(), id); err != nil {
		if err == services.ErrRecurringInvoiceNotFound {
			response.NotFound(c, "Recurring invoice not found")
			return
		}
		response.InternalError(c, "Failed to pause recurring invoice")
		return
	}

	response.Success(c, gin.H{"message": "Recurring invoice paused"})
}

// Resume resumes a paused recurring invoice
func (h *RecurringInvoiceHandler) Resume(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring invoice ID", nil)
		return
	}

	if err := h.recurringService.Resume(c.Request.Context(), id); err != nil {
		if err == services.ErrRecurringInvoiceNotFound {
			response.NotFound(c, "Recurring invoice not found")
			return
		}
		response.InternalError(c, "Failed to resume recurring invoice")
		return
	}

	response.Success(c, gin.H{"message": "Recurring invoice resumed"})
}

// GenerateNow generates an invoice immediately from a recurring invoice
func (h *RecurringInvoiceHandler) GenerateNow(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring invoice ID", nil)
		return
	}

	invoice, err := h.recurringService.GenerateInvoiceNow(c.Request.Context(), id)
	if err != nil {
		if err == services.ErrRecurringInvoiceNotFound {
			response.NotFound(c, "Recurring invoice not found")
			return
		}
		response.InternalError(c, "Failed to generate invoice")
		return
	}

	response.Created(c, invoice)
}

// GetHistory gets the generated invoice history for a recurring invoice
func (h *RecurringInvoiceHandler) GetHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring invoice ID", nil)
		return
	}

	history, err := h.recurringService.GetGeneratedInvoices(c.Request.Context(), id)
	if err != nil {
		response.InternalError(c, "Failed to get history")
		return
	}

	response.Success(c, gin.H{"history": history})
}

// Helper methods

func (h *RecurringInvoiceHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(tenantIDStr.(string))
}

func (h *RecurringInvoiceHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(userIDStr.(string))
}
