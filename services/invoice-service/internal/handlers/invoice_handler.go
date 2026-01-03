package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/services"
)

// InvoiceHandler handles invoice endpoints
type InvoiceHandler struct {
	invoiceService services.InvoiceService
}

// NewInvoiceHandler creates a new invoice handler
func NewInvoiceHandler(invoiceService services.InvoiceService) *InvoiceHandler {
	return &InvoiceHandler{invoiceService: invoiceService}
}

// List returns a list of invoices
func (h *InvoiceHandler) List(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	filters := repository.InvoiceFilters{
		Status:   c.Query("status"),
		FromDate: c.Query("from_date"),
		ToDate:   c.Query("to_date"),
		Page:     1,
		Limit:    20,
	}

	if customerID := c.Query("customer_id"); customerID != "" {
		if cid, err := uuid.Parse(customerID); err == nil {
			filters.CustomerID = cid
		}
	}

	invoices, total, err := h.invoiceService.List(c.Request.Context(), tenantID, filters)
	if err != nil {
		response.InternalError(c, "Failed to list invoices")
		return
	}

	response.Paginated(c, invoices, filters.Page, filters.Limit, total)
}

// Create creates a new invoice
func (h *InvoiceHandler) Create(c *gin.Context) {
	var req services.CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	tenantID, _ := h.getTenantIDFromContext(c)
	userID, _ := h.getUserIDFromContext(c)
	req.TenantID = tenantID
	req.CreatedBy = userID

	invoice, err := h.invoiceService.Create(c.Request.Context(), req)
	if err != nil {
		if err == services.ErrInvalidInvoice {
			response.BadRequest(c, "Invalid invoice data", nil)
			return
		}
		response.InternalError(c, "Failed to create invoice")
		return
	}

	response.Created(c, invoice)
}

// Get returns a specific invoice
func (h *InvoiceHandler) Get(c *gin.Context) {
	invoiceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID", nil)
		return
	}

	invoice, err := h.invoiceService.Get(c.Request.Context(), invoiceID)
	if err != nil {
		response.NotFound(c, "Invoice not found")
		return
	}

	response.Success(c, invoice)
}

// Update updates an invoice
func (h *InvoiceHandler) Update(c *gin.Context) {
	invoiceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID", nil)
		return
	}

	var req services.UpdateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	invoice, err := h.invoiceService.Update(c.Request.Context(), invoiceID, req)
	if err != nil {
		if err == services.ErrInvoiceNotFound {
			response.NotFound(c, "Invoice not found")
			return
		}
		if err == services.ErrCannotModify {
			response.Conflict(c, "Cannot modify invoice in current status")
			return
		}
		response.InternalError(c, "Failed to update invoice")
		return
	}

	response.Success(c, invoice)
}

// Delete deletes an invoice
func (h *InvoiceHandler) Delete(c *gin.Context) {
	invoiceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID", nil)
		return
	}

	if err := h.invoiceService.Delete(c.Request.Context(), invoiceID); err != nil {
		if err == services.ErrInvoiceNotFound {
			response.NotFound(c, "Invoice not found")
			return
		}
		if err == services.ErrCannotModify {
			response.Conflict(c, "Cannot delete invoice in current status")
			return
		}
		response.InternalError(c, "Failed to delete invoice")
		return
	}

	response.NoContent(c)
}

// Send sends an invoice to the customer
func (h *InvoiceHandler) Send(c *gin.Context) {
	invoiceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID", nil)
		return
	}

	if err := h.invoiceService.Send(c.Request.Context(), invoiceID); err != nil {
		if err == services.ErrInvoiceNotFound {
			response.NotFound(c, "Invoice not found")
			return
		}
		response.InternalError(c, "Failed to send invoice")
		return
	}

	response.Success(c, gin.H{"message": "Invoice sent successfully"})
}

// RecordPayment records a payment for an invoice
func (h *InvoiceHandler) RecordPayment(c *gin.Context) {
	invoiceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID", nil)
		return
	}

	var req services.RecordPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	tenantID, _ := h.getTenantIDFromContext(c)
	userID, _ := h.getUserIDFromContext(c)
	req.TenantID = tenantID
	req.CreatedBy = userID

	payment, err := h.invoiceService.RecordPayment(c.Request.Context(), invoiceID, req)
	if err != nil {
		if err == services.ErrInvoiceNotFound {
			response.NotFound(c, "Invoice not found")
			return
		}
		response.InternalError(c, "Failed to record payment")
		return
	}

	response.Created(c, payment)
}

// GeneratePDF generates a PDF for an invoice
func (h *InvoiceHandler) GeneratePDF(c *gin.Context) {
	// TODO: Implement PDF generation
	response.Success(c, gin.H{"message": "PDF generation not implemented"})
}

// GenerateEInvoice generates an E-Invoice for GST
func (h *InvoiceHandler) GenerateEInvoice(c *gin.Context) {
	invoiceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID", nil)
		return
	}

	invoice, err := h.invoiceService.GenerateEInvoice(c.Request.Context(), invoiceID)
	if err != nil {
		if err == services.ErrInvoiceNotFound {
			response.NotFound(c, "Invoice not found")
			return
		}
		response.InternalError(c, "Failed to generate E-Invoice")
		return
	}

	response.Success(c, invoice)
}

// GetEInvoiceStatus returns the E-Invoice status
func (h *InvoiceHandler) GetEInvoiceStatus(c *gin.Context) {
	invoiceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID", nil)
		return
	}

	invoice, err := h.invoiceService.Get(c.Request.Context(), invoiceID)
	if err != nil {
		response.NotFound(c, "Invoice not found")
		return
	}

	response.Success(c, gin.H{
		"irn":    invoice.IRN,
		"status": invoice.EInvoiceStatus,
		"date":   invoice.EInvoiceDate,
	})
}

// CancelEInvoice cancels an E-Invoice
func (h *InvoiceHandler) CancelEInvoice(c *gin.Context) {
	invoiceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID", nil)
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	if err := h.invoiceService.CancelEInvoice(c.Request.Context(), invoiceID, req.Reason); err != nil {
		if err == services.ErrInvoiceNotFound {
			response.NotFound(c, "Invoice not found")
			return
		}
		response.InternalError(c, "Failed to cancel E-Invoice")
		return
	}

	response.Success(c, gin.H{"message": "E-Invoice cancelled successfully"})
}

// Helper methods
func (h *InvoiceHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(userIDStr.(string))
}

func (h *InvoiceHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(tenantIDStr.(string))
}
