package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/services"
)

// TaxHandler handles tax calculation HTTP requests
type TaxHandler struct {
	calculator *services.TaxCalculator
	repo       *repository.TaxRepository
}

// NewTaxHandler creates a new tax handler
func NewTaxHandler(calculator *services.TaxCalculator, repo *repository.TaxRepository) *TaxHandler {
	return &TaxHandler{
		calculator: calculator,
		repo:       repo,
	}
}

// ============ GST Calculation ============

// CalculateTax handles POST /api/v1/tax/calculate
func (h *TaxHandler) CalculateTax(c *gin.Context) {
	var req models.CalculateTaxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "message": err.Error()})
		return
	}

	response, err := h.calculator.CalculateTax(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate tax", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ============ TDS Endpoints ============

// CalculateTDS handles POST /api/v1/tds/calculate
func (h *TaxHandler) CalculateTDS(c *gin.Context) {
	var req models.CalculateTDSRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "message": err.Error()})
		return
	}

	if req.TenantID == "" {
		req.TenantID = getTenantID(c)
	}

	response, err := h.calculator.CalculateTDS(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate TDS", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// CreateTDSDeduction handles POST /api/v1/tds/deductions
func (h *TaxHandler) CreateTDSDeduction(c *gin.Context) {
	var req models.CreateTDSDeductionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "message": err.Error()})
		return
	}

	if req.TenantID == "" {
		req.TenantID = getTenantID(c)
	}

	deductionDate, err := time.Parse("2006-01-02", req.DeductionDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid deduction date", "message": err.Error()})
		return
	}

	netAmount := req.GrossAmount.Sub(req.TDSAmount)
	fy := getFinancialYear(deductionDate)
	quarter := getQuarter(deductionDate)

	deduction := &models.TDSDeduction{
		TenantID:      req.TenantID,
		InvoiceID:     req.InvoiceID,
		PaymentID:     req.PaymentID,
		DeducteeID:    req.DeducteeID,
		DeducteeName:  req.DeducteeName,
		DeducteePAN:   req.DeducteePAN,
		Section:       req.Section,
		GrossAmount:   req.GrossAmount,
		TDSRate:       req.TDSRate,
		TDSAmount:     req.TDSAmount,
		NetAmount:     netAmount,
		DeductionDate: deductionDate,
		FinancialYear: fy,
		Quarter:       quarter,
		Status:        "PENDING",
	}

	if err := h.repo.CreateTDSDeduction(c.Request.Context(), deduction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create TDS deduction", "message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, deduction)
}

// ListTDSDeductions handles GET /api/v1/tds/deductions
func (h *TaxHandler) ListTDSDeductions(c *gin.Context) {
	tenantID := getTenantID(c)
	fy := c.Query("financialYear")
	quarterStr := c.Query("quarter")

	var quarter int
	if quarterStr != "" {
		q, err := strconv.Atoi(quarterStr)
		if err == nil {
			quarter = q
		}
	}

	deductions, err := h.repo.ListTDSDeductions(c.Request.Context(), tenantID, fy, quarter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list TDS deductions", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": deductions})
}

// ListTDSRates handles GET /api/v1/tds/rates
func (h *TaxHandler) ListTDSRates(c *gin.Context) {
	tenantID := getTenantID(c)
	rates, err := h.repo.ListTDSRates(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list TDS rates", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rates})
}

// ============ TCS Endpoints ============

// CalculateTCS handles POST /api/v1/tcs/calculate
func (h *TaxHandler) CalculateTCS(c *gin.Context) {
	var req models.CalculateTCSRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "message": err.Error()})
		return
	}

	if req.TenantID == "" {
		req.TenantID = getTenantID(c)
	}

	response, err := h.calculator.CalculateTCS(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate TCS", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ListTCSCollections handles GET /api/v1/tcs/collections
func (h *TaxHandler) ListTCSCollections(c *gin.Context) {
	tenantID := getTenantID(c)
	fy := c.Query("financialYear")
	quarterStr := c.Query("quarter")

	var quarter int
	if quarterStr != "" {
		q, err := strconv.Atoi(quarterStr)
		if err == nil {
			quarter = q
		}
	}

	collections, err := h.repo.ListTCSCollections(c.Request.Context(), tenantID, fy, quarter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list TCS collections", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": collections})
}

// ============ ITC Endpoints ============

// RecordITC handles POST /api/v1/itc
func (h *TaxHandler) RecordITC(c *gin.Context) {
	var req models.RecordITCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "message": err.Error()})
		return
	}

	if req.TenantID == "" {
		req.TenantID = getTenantID(c)
	}

	itc, err := h.calculator.RecordITC(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record ITC", "message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, itc)
}

// ListITC handles GET /api/v1/itc
func (h *TaxHandler) ListITC(c *gin.Context) {
	tenantID := getTenantID(c)
	period := c.Query("period")
	status := models.ITCStatus(c.Query("status"))

	itcs, err := h.repo.ListInputTaxCredits(c.Request.Context(), tenantID, period, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list ITC", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": itcs})
}

// GetITCSummary handles GET /api/v1/itc/summary
func (h *TaxHandler) GetITCSummary(c *gin.Context) {
	tenantID := getTenantID(c)
	period := c.Query("period")
	if period == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Period is required (format: MMYYYY)"})
		return
	}

	summary, err := h.calculator.GetITCSummary(c.Request.Context(), tenantID, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get ITC summary", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// ============ GSTR Endpoints ============

// ListGSTRFilings handles GET /api/v1/gstr/filings
func (h *TaxHandler) ListGSTRFilings(c *gin.Context) {
	tenantID := getTenantID(c)
	fy := c.Query("financialYear")

	filings, err := h.repo.ListGSTRFilings(c.Request.Context(), tenantID, fy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list GSTR filings", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": filings})
}

// GetGSTRFiling handles GET /api/v1/gstr/filings/:type/:period
func (h *TaxHandler) GetGSTRFiling(c *gin.Context) {
	tenantID := getTenantID(c)
	returnType := models.GSTRType(c.Param("type"))
	period := c.Param("period")

	filing, err := h.repo.GetGSTRFiling(c.Request.Context(), tenantID, returnType, period)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "GSTR filing not found", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, filing)
}

// ============ Jurisdiction CRUD ============

func (h *TaxHandler) ListJurisdictions(c *gin.Context) {
	tenantID := getTenantID(c)
	jurisdictions, err := h.repo.ListJurisdictions(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list jurisdictions", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": jurisdictions})
}

func (h *TaxHandler) GetJurisdiction(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid jurisdiction ID"})
		return
	}

	jurisdiction, err := h.repo.GetJurisdiction(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jurisdiction not found"})
		return
	}

	c.JSON(http.StatusOK, jurisdiction)
}

func (h *TaxHandler) CreateJurisdiction(c *gin.Context) {
	tenantID := getTenantID(c)
	var jurisdiction models.TaxJurisdiction
	if err := c.ShouldBindJSON(&jurisdiction); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "message": err.Error()})
		return
	}

	jurisdiction.TenantID = tenantID
	if err := h.repo.CreateJurisdiction(c.Request.Context(), &jurisdiction); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create jurisdiction", "message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, jurisdiction)
}

// ============ Product Category CRUD ============

func (h *TaxHandler) ListProductCategories(c *gin.Context) {
	tenantID := getTenantID(c)
	categories, err := h.repo.ListProductCategories(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list categories", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": categories})
}

func (h *TaxHandler) CreateProductCategory(c *gin.Context) {
	tenantID := getTenantID(c)
	var category models.ProductTaxCategory
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "message": err.Error()})
		return
	}

	category.TenantID = tenantID
	if err := h.repo.CreateProductCategory(c.Request.Context(), &category); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category", "message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, category)
}

// ============ Helper Functions ============

func getTenantID(c *gin.Context) string {
	tenantID := c.GetHeader("X-Tenant-ID")
	if tenantID == "" {
		return "00000000-0000-0000-0000-000000000001"
	}
	return tenantID
}

func getFinancialYear(date time.Time) string {
	year := date.Year()
	month := date.Month()
	if month < 4 {
		year--
	}
	return fmt.Sprintf("%d-%02d", year, (year+1)%100)
}

func getQuarter(date time.Time) int {
	month := date.Month()
	switch {
	case month >= 4 && month <= 6:
		return 1
	case month >= 7 && month <= 9:
		return 2
	case month >= 10 && month <= 12:
		return 3
	default:
		return 4
	}
}
