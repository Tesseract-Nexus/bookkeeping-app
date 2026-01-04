package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/services"
)

// BillHandler handles bill endpoints
type BillHandler struct {
	billService services.BillService
}

// NewBillHandler creates a new bill handler
func NewBillHandler(billService services.BillService) *BillHandler {
	return &BillHandler{billService: billService}
}

// List returns a list of bills
func (h *BillHandler) List(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	filters := repository.BillFilters{
		Status:   c.Query("status"),
		FromDate: c.Query("from_date"),
		ToDate:   c.Query("to_date"),
		Overdue:  c.Query("overdue") == "true",
		Page:     1,
		Limit:    20,
	}

	if vendorID := c.Query("vendor_id"); vendorID != "" {
		if vid, err := uuid.Parse(vendorID); err == nil {
			filters.VendorID = vid
		}
	}

	bills, total, err := h.billService.List(c.Request.Context(), tenantID, filters)
	if err != nil {
		response.InternalError(c, "Failed to list bills")
		return
	}

	response.Paginated(c, bills, filters.Page, filters.Limit, total)
}

// Create creates a new bill
func (h *BillHandler) Create(c *gin.Context) {
	var req services.CreateBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	tenantID, _ := h.getTenantIDFromContext(c)
	userID, _ := h.getUserIDFromContext(c)
	req.TenantID = tenantID
	req.CreatedBy = userID

	bill, err := h.billService.Create(c.Request.Context(), req)
	if err != nil {
		if err == services.ErrInvalidBill {
			response.BadRequest(c, "Invalid bill data", nil)
			return
		}
		response.InternalError(c, "Failed to create bill")
		return
	}

	response.Created(c, bill)
}

// Get returns a specific bill
func (h *BillHandler) Get(c *gin.Context) {
	billID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bill ID", nil)
		return
	}

	bill, err := h.billService.Get(c.Request.Context(), billID)
	if err != nil {
		response.NotFound(c, "Bill not found")
		return
	}

	response.Success(c, bill)
}

// Update updates a bill
func (h *BillHandler) Update(c *gin.Context) {
	billID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bill ID", nil)
		return
	}

	var req services.UpdateBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	bill, err := h.billService.Update(c.Request.Context(), billID, req)
	if err != nil {
		if err == services.ErrBillNotFound {
			response.NotFound(c, "Bill not found")
			return
		}
		if err == services.ErrCannotModifyBill {
			response.Conflict(c, "Cannot modify bill in current status")
			return
		}
		response.InternalError(c, "Failed to update bill")
		return
	}

	response.Success(c, bill)
}

// Delete deletes a bill
func (h *BillHandler) Delete(c *gin.Context) {
	billID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bill ID", nil)
		return
	}

	if err := h.billService.Delete(c.Request.Context(), billID); err != nil {
		if err == services.ErrBillNotFound {
			response.NotFound(c, "Bill not found")
			return
		}
		if err == services.ErrCannotModifyBill {
			response.Conflict(c, "Cannot delete bill in current status")
			return
		}
		response.InternalError(c, "Failed to delete bill")
		return
	}

	response.NoContent(c)
}

// Approve approves a bill for payment
func (h *BillHandler) Approve(c *gin.Context) {
	billID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bill ID", nil)
		return
	}

	userID, _ := h.getUserIDFromContext(c)

	bill, err := h.billService.Approve(c.Request.Context(), billID, userID)
	if err != nil {
		if err == services.ErrBillNotFound {
			response.NotFound(c, "Bill not found")
			return
		}
		if err == services.ErrCannotModifyBill {
			response.Conflict(c, "Cannot approve bill in current status")
			return
		}
		response.InternalError(c, "Failed to approve bill")
		return
	}

	response.Success(c, bill)
}

// RecordPayment records a payment for a bill
func (h *BillHandler) RecordPayment(c *gin.Context) {
	billID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid bill ID", nil)
		return
	}

	var req services.RecordBillPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	tenantID, _ := h.getTenantIDFromContext(c)
	userID, _ := h.getUserIDFromContext(c)
	req.TenantID = tenantID
	req.CreatedBy = userID

	payment, err := h.billService.RecordPayment(c.Request.Context(), billID, req)
	if err != nil {
		if err == services.ErrBillNotFound {
			response.NotFound(c, "Bill not found")
			return
		}
		response.InternalError(c, "Failed to record payment")
		return
	}

	response.Created(c, payment)
}

// GetOverdue returns overdue bills
func (h *BillHandler) GetOverdue(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	bills, err := h.billService.GetOverdueBills(c.Request.Context(), tenantID)
	if err != nil {
		response.InternalError(c, "Failed to get overdue bills")
		return
	}

	response.Success(c, bills)
}

// GetPayablesSummary returns a summary of payables
func (h *BillHandler) GetPayablesSummary(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	summary, err := h.billService.GetPayablesSummary(c.Request.Context(), tenantID)
	if err != nil {
		response.InternalError(c, "Failed to get payables summary")
		return
	}

	response.Success(c, summary)
}

// Helper methods
func (h *BillHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(userIDStr.(string))
}

func (h *BillHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(tenantIDStr.(string))
}
