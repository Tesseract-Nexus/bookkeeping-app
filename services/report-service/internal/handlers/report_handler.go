package handlers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/report-service/internal/services"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
)

// ReportHandler handles report-related endpoints
type ReportHandler struct {
	reportService services.ReportService
}

// NewReportHandler creates a new report handler
func NewReportHandler(reportService services.ReportService) *ReportHandler {
	return &ReportHandler{reportService: reportService}
}

// GetDashboard handles dashboard summary request
func (h *ReportHandler) GetDashboard(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	summary, err := h.reportService.GetDashboardSummary(c.Request.Context(), tenantID)
	if err != nil {
		response.InternalError(c, "Failed to get dashboard summary")
		return
	}

	response.Success(c, summary)
}

// GetProfitLoss handles P&L report request
func (h *ReportHandler) GetProfitLoss(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	// Parse dates
	fromDateStr := c.Query("from_date")
	toDateStr := c.Query("to_date")

	var fromDate, toDate time.Time

	if fromDateStr == "" {
		// Default to current financial year (April 1)
		now := time.Now()
		year := now.Year()
		if now.Month() < 4 {
			year--
		}
		fromDate = time.Date(year, 4, 1, 0, 0, 0, 0, time.UTC)
	} else {
		fromDate, err = time.Parse("2006-01-02", fromDateStr)
		if err != nil {
			response.BadRequest(c, "Invalid from_date format", nil)
			return
		}
	}

	if toDateStr == "" {
		toDate = time.Now()
	} else {
		toDate, err = time.Parse("2006-01-02", toDateStr)
		if err != nil {
			response.BadRequest(c, "Invalid to_date format", nil)
			return
		}
	}

	report, err := h.reportService.GetProfitLoss(c.Request.Context(), tenantID, fromDate, toDate)
	if err != nil {
		response.InternalError(c, "Failed to generate P&L report")
		return
	}

	response.Success(c, report)
}

// GetBalanceSheet handles balance sheet report request
func (h *ReportHandler) GetBalanceSheet(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	asOfDateStr := c.Query("as_of")
	var asOfDate time.Time

	if asOfDateStr == "" {
		asOfDate = time.Now()
	} else {
		asOfDate, err = time.Parse("2006-01-02", asOfDateStr)
		if err != nil {
			response.BadRequest(c, "Invalid as_of date format", nil)
			return
		}
	}

	report, err := h.reportService.GetBalanceSheet(c.Request.Context(), tenantID, asOfDate)
	if err != nil {
		response.InternalError(c, "Failed to generate balance sheet")
		return
	}

	response.Success(c, report)
}

// GetGSTSummary handles GST summary report request
func (h *ReportHandler) GetGSTSummary(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	now := time.Now()
	month := int(now.Month())
	year := now.Year()

	if monthStr := c.Query("month"); monthStr != "" {
		if m, err := strconv.Atoi(monthStr); err == nil && m >= 1 && m <= 12 {
			month = m
		}
	}

	if yearStr := c.Query("year"); yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil && y >= 2000 {
			year = y
		}
	}

	report, err := h.reportService.GetGSTSummary(c.Request.Context(), tenantID, month, year)
	if err != nil {
		response.InternalError(c, "Failed to generate GST summary")
		return
	}

	response.Success(c, report)
}

// GetReceivablesAging handles receivables aging report request
func (h *ReportHandler) GetReceivablesAging(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	report, err := h.reportService.GetReceivablesAging(c.Request.Context(), tenantID)
	if err != nil {
		response.InternalError(c, "Failed to generate receivables aging report")
		return
	}

	response.Success(c, report)
}

// GetCashFlow handles cash flow report request
func (h *ReportHandler) GetCashFlow(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	fromDateStr := c.Query("from_date")
	toDateStr := c.Query("to_date")

	var fromDate, toDate time.Time

	if fromDateStr == "" {
		fromDate = time.Now().AddDate(0, -1, 0) // Last month
	} else {
		fromDate, err = time.Parse("2006-01-02", fromDateStr)
		if err != nil {
			response.BadRequest(c, "Invalid from_date format", nil)
			return
		}
	}

	if toDateStr == "" {
		toDate = time.Now()
	} else {
		toDate, err = time.Parse("2006-01-02", toDateStr)
		if err != nil {
			response.BadRequest(c, "Invalid to_date format", nil)
			return
		}
	}

	report, err := h.reportService.GetCashFlow(c.Request.Context(), tenantID, fromDate, toDate)
	if err != nil {
		response.InternalError(c, "Failed to generate cash flow report")
		return
	}

	response.Success(c, report)
}

// Helper methods

func (h *ReportHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, nil
	}
	return uuid.Parse(tenantIDStr.(string))
}
