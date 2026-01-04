package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/services"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
)

// RecurringJournalHandler handles recurring journal endpoints
type RecurringJournalHandler struct {
	recurringService services.RecurringJournalService
}

// NewRecurringJournalHandler creates a new recurring journal handler
func NewRecurringJournalHandler(recurringService services.RecurringJournalService) *RecurringJournalHandler {
	return &RecurringJournalHandler{recurringService: recurringService}
}

// List lists all recurring journals for a tenant
func (h *RecurringJournalHandler) List(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	filters := repository.RecurringJournalFilters{}

	if status := c.Query("status"); status != "" {
		filters.Status = models.RecurringJournalStatus(status)
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
		response.InternalError(c, "Failed to list recurring journals")
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

// Create creates a new recurring journal
func (h *RecurringJournalHandler) Create(c *gin.Context) {
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

	var req services.CreateRecurringJournalRequest
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
		if err == services.ErrJournalNotBalanced {
			response.BadRequest(c, "Journal entries must be balanced (debits = credits)", nil)
			return
		}
		response.InternalError(c, "Failed to create recurring journal")
		return
	}

	response.Created(c, recurring)
}

// Get gets a recurring journal by ID
func (h *RecurringJournalHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring journal ID", nil)
		return
	}

	recurring, err := h.recurringService.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == services.ErrRecurringJournalNotFound {
			response.NotFound(c, "Recurring journal not found")
			return
		}
		response.InternalError(c, "Failed to get recurring journal")
		return
	}

	response.Success(c, recurring)
}

// Update updates a recurring journal
func (h *RecurringJournalHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring journal ID", nil)
		return
	}

	var req services.UpdateRecurringJournalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	recurring, err := h.recurringService.Update(c.Request.Context(), id, req)
	if err != nil {
		if err == services.ErrRecurringJournalNotFound {
			response.NotFound(c, "Recurring journal not found")
			return
		}
		if err == services.ErrInvalidRecurrence {
			response.BadRequest(c, "Invalid recurrence settings", nil)
			return
		}
		if err == services.ErrJournalNotBalanced {
			response.BadRequest(c, "Journal entries must be balanced", nil)
			return
		}
		response.InternalError(c, "Failed to update recurring journal")
		return
	}

	response.Success(c, recurring)
}

// Delete deletes a recurring journal
func (h *RecurringJournalHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring journal ID", nil)
		return
	}

	if err := h.recurringService.Delete(c.Request.Context(), id); err != nil {
		if err == services.ErrRecurringJournalNotFound {
			response.NotFound(c, "Recurring journal not found")
			return
		}
		response.InternalError(c, "Failed to delete recurring journal")
		return
	}

	response.NoContent(c)
}

// Pause pauses a recurring journal
func (h *RecurringJournalHandler) Pause(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring journal ID", nil)
		return
	}

	if err := h.recurringService.Pause(c.Request.Context(), id); err != nil {
		if err == services.ErrRecurringJournalNotFound {
			response.NotFound(c, "Recurring journal not found")
			return
		}
		response.InternalError(c, "Failed to pause recurring journal")
		return
	}

	response.Success(c, gin.H{"message": "Recurring journal paused"})
}

// Resume resumes a paused recurring journal
func (h *RecurringJournalHandler) Resume(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring journal ID", nil)
		return
	}

	if err := h.recurringService.Resume(c.Request.Context(), id); err != nil {
		if err == services.ErrRecurringJournalNotFound {
			response.NotFound(c, "Recurring journal not found")
			return
		}
		response.InternalError(c, "Failed to resume recurring journal")
		return
	}

	response.Success(c, gin.H{"message": "Recurring journal resumed"})
}

// GenerateNow generates a transaction immediately from a recurring journal
func (h *RecurringJournalHandler) GenerateNow(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring journal ID", nil)
		return
	}

	transaction, err := h.recurringService.GenerateJournalNow(c.Request.Context(), id)
	if err != nil {
		if err == services.ErrRecurringJournalNotFound {
			response.NotFound(c, "Recurring journal not found")
			return
		}
		response.InternalError(c, "Failed to generate journal entry")
		return
	}

	response.Created(c, transaction)
}

// GetHistory gets the generated journal history for a recurring journal
func (h *RecurringJournalHandler) GetHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid recurring journal ID", nil)
		return
	}

	history, err := h.recurringService.GetGeneratedJournals(c.Request.Context(), id)
	if err != nil {
		response.InternalError(c, "Failed to get history")
		return
	}

	response.Success(c, gin.H{"history": history})
}

// Helper methods

func (h *RecurringJournalHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(tenantIDStr.(string))
}

func (h *RecurringJournalHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(userIDStr.(string))
}
