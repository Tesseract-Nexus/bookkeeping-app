package services

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/repository"
)

// TaxCalculator handles all tax calculation logic
type TaxCalculator struct {
	repo     *repository.TaxRepository
	cacheTTL time.Duration
}

// NewTaxCalculator creates a new tax calculator
func NewTaxCalculator(repo *repository.TaxRepository, cacheTTL time.Duration) *TaxCalculator {
	return &TaxCalculator{
		repo:     repo,
		cacheTTL: cacheTTL,
	}
}

// CalculateTax calculates GST/VAT for a transaction
func (c *TaxCalculator) CalculateTax(ctx context.Context, req models.CalculateTaxRequest) (*models.TaxCalculationResponse, error) {
	// Check cache first
	cacheKey := c.generateCacheKey(req)
	cached, err := c.repo.GetCachedTaxCalculation(ctx, cacheKey)
	if err == nil && cached != nil {
		var response models.TaxCalculationResponse
		if err := json.Unmarshal([]byte(cached.CalculationResult), &response); err == nil {
			return &response, nil
		}
	}

	// Determine country code
	countryCode := req.ShippingAddress.CountryCode
	if countryCode == "" {
		countryCode = req.ShippingAddress.Country
	}

	// Route to country-specific calculation
	switch countryCode {
	case "IN":
		return c.calculateIndiaGST(ctx, req)
	default:
		return c.calculateStandardTax(ctx, req)
	}
}

// calculateIndiaGST calculates India GST
func (c *TaxCalculator) calculateIndiaGST(ctx context.Context, req models.CalculateTaxRequest) (*models.TaxCalculationResponse, error) {
	subtotal := c.calculateSubtotal(req.LineItems)

	// Determine interstate or intrastate
	originStateCode := ""
	destStateCode := req.ShippingAddress.StateCode

	if req.OriginAddress != nil {
		originStateCode = req.OriginAddress.StateCode
	}

	// If origin not provided, try to get from nexus
	if originStateCode == "" {
		nexus, err := c.repo.GetNexusByCountry(ctx, req.TenantID, "IN")
		if err == nil && nexus != nil {
			originStateCode = nexus.Jurisdiction.StateCode
		}
	}

	isInterstate := originStateCode != "" && destStateCode != "" && originStateCode != destStateCode

	var totalTax float64
	var taxBreakdown []models.TaxBreakdown
	gstSummary := &models.GSTSummary{IsInterstate: isInterstate}

	// Calculate tax for each line item
	for _, item := range req.LineItems {
		gstSlab := c.getGSTSlab(ctx, req.TenantID, item)
		if gstSlab == 0 {
			continue
		}

		if isInterstate {
			igstAmount := item.Subtotal * (gstSlab / 100.0)
			totalTax += igstAmount
			gstSummary.IGST += igstAmount

			taxBreakdown = append(taxBreakdown, models.TaxBreakdown{
				JurisdictionName: "India",
				TaxType:          "IGST",
				Rate:             gstSlab,
				TaxableAmount:    item.Subtotal,
				TaxAmount:        igstAmount,
				HSNCode:          item.HSNCode,
				SACCode:          item.SACCode,
			})
		} else {
			halfRate := gstSlab / 2.0
			cgstAmount := item.Subtotal * (halfRate / 100.0)
			sgstAmount := item.Subtotal * (halfRate / 100.0)
			totalTax += cgstAmount + sgstAmount
			gstSummary.CGST += cgstAmount
			gstSummary.SGST += sgstAmount

			taxBreakdown = append(taxBreakdown, models.TaxBreakdown{
				JurisdictionName: "India - Central",
				TaxType:          "CGST",
				Rate:             halfRate,
				TaxableAmount:    item.Subtotal,
				TaxAmount:        cgstAmount,
				HSNCode:          item.HSNCode,
				SACCode:          item.SACCode,
			})
			taxBreakdown = append(taxBreakdown, models.TaxBreakdown{
				JurisdictionName: req.ShippingAddress.State,
				TaxType:          "SGST",
				Rate:             halfRate,
				TaxableAmount:    item.Subtotal,
				TaxAmount:        sgstAmount,
				HSNCode:          item.HSNCode,
				SACCode:          item.SACCode,
			})
		}
	}

	// Shipping tax
	if req.ShippingAmount > 0 {
		shippingGSTSlab := 18.0
		if isInterstate {
			igstAmount := req.ShippingAmount * (shippingGSTSlab / 100.0)
			totalTax += igstAmount
			gstSummary.IGST += igstAmount
		} else {
			halfRate := shippingGSTSlab / 2.0
			cgstAmount := req.ShippingAmount * (halfRate / 100.0)
			sgstAmount := req.ShippingAmount * (halfRate / 100.0)
			totalTax += cgstAmount + sgstAmount
			gstSummary.CGST += cgstAmount
			gstSummary.SGST += sgstAmount
		}
	}

	gstSummary.TotalGST = totalTax

	response := &models.TaxCalculationResponse{
		Subtotal:       subtotal,
		ShippingAmount: req.ShippingAmount,
		TaxAmount:      totalTax,
		Total:          subtotal + req.ShippingAmount + totalTax,
		TaxBreakdown:   taxBreakdown,
		IsExempt:       false,
		GSTSummary:     gstSummary,
	}

	// Cache result
	cacheKey := c.generateCacheKey(req)
	c.cacheResult(ctx, cacheKey, response)

	return response, nil
}

func (c *TaxCalculator) calculateStandardTax(ctx context.Context, req models.CalculateTaxRequest) (*models.TaxCalculationResponse, error) {
	subtotal := c.calculateSubtotal(req.LineItems)
	return &models.TaxCalculationResponse{
		Subtotal:       subtotal,
		ShippingAmount: req.ShippingAmount,
		TaxAmount:      0,
		Total:          subtotal + req.ShippingAmount,
		TaxBreakdown:   []models.TaxBreakdown{},
		IsExempt:       false,
	}, nil
}

func (c *TaxCalculator) getGSTSlab(ctx context.Context, tenantID string, item models.LineItemInput) float64 {
	if item.HSNCode != "" {
		category, err := c.repo.GetProductCategoryByHSN(ctx, tenantID, item.HSNCode)
		if err == nil && category != nil {
			if category.IsTaxExempt || category.IsNilRated {
				return 0
			}
			return category.GSTSlab
		}
	}

	if item.SACCode != "" {
		category, err := c.repo.GetProductCategoryBySAC(ctx, tenantID, item.SACCode)
		if err == nil && category != nil {
			if category.IsTaxExempt || category.IsNilRated {
				return 0
			}
			return category.GSTSlab
		}
	}

	if item.CategoryID != nil && *item.CategoryID != uuid.Nil {
		category, err := c.repo.GetProductCategory(ctx, *item.CategoryID)
		if err == nil && category != nil {
			if category.IsTaxExempt || category.IsNilRated {
				return 0
			}
			return category.GSTSlab
		}
	}

	return 18.0 // Default GST slab
}

// CalculateTDS calculates TDS for a payment
func (c *TaxCalculator) CalculateTDS(ctx context.Context, req models.CalculateTDSRequest) (*models.CalculateTDSResponse, error) {
	// Get TDS rate for section
	rate, err := c.repo.GetTDSRate(ctx, req.TenantID, req.Section)
	if err != nil {
		return nil, fmt.Errorf("TDS rate not found for section %s: %w", req.Section, err)
	}

	// Determine financial year and quarter
	paymentDate, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		return nil, fmt.Errorf("invalid payment date: %w", err)
	}
	fy := getFinancialYear(paymentDate)
	quarter := getQuarter(paymentDate)

	// Check threshold - get cumulative payments in FY
	cumulativeAmount, err := c.repo.GetTDSSummaryByDeductee(ctx, req.TenantID, req.DeducteeID, fy)
	if err != nil {
		cumulativeAmount = decimal.Zero
	}

	totalWithCurrent := cumulativeAmount.Add(req.GrossAmount)
	thresholdApplied := false

	// If threshold is per annum and total is below threshold, no TDS
	if rate.ThresholdPerAnnum && totalWithCurrent.LessThan(rate.ThresholdAmount) {
		thresholdApplied = true
		return &models.CalculateTDSResponse{
			Section:          req.Section,
			GrossAmount:      req.GrossAmount,
			TDSRate:          decimal.Zero,
			TDSAmount:        decimal.Zero,
			NetAmount:        req.GrossAmount,
			IsPANAvailable:   req.DeducteePAN != "",
			ThresholdApplied: thresholdApplied,
			ThresholdAmount:  rate.ThresholdAmount,
			FinancialYear:    fy,
			Quarter:          quarter,
		}, nil
	}

	// Determine applicable rate based on PAN availability
	var tdsRate decimal.Decimal
	if req.DeducteePAN != "" {
		tdsRate = rate.RateWithPAN
	} else {
		tdsRate = rate.RateWithoutPAN // Higher rate without PAN (20% typically)
	}

	// Calculate TDS
	tdsAmount := req.GrossAmount.Mul(tdsRate).Div(decimal.NewFromInt(100))
	netAmount := req.GrossAmount.Sub(tdsAmount)

	return &models.CalculateTDSResponse{
		Section:          req.Section,
		GrossAmount:      req.GrossAmount,
		TDSRate:          tdsRate,
		TDSAmount:        tdsAmount,
		NetAmount:        netAmount,
		IsPANAvailable:   req.DeducteePAN != "",
		ThresholdApplied: thresholdApplied,
		ThresholdAmount:  rate.ThresholdAmount,
		FinancialYear:    fy,
		Quarter:          quarter,
	}, nil
}

// CalculateTCS calculates TCS for a sale
func (c *TaxCalculator) CalculateTCS(ctx context.Context, req models.CalculateTCSRequest) (*models.CalculateTCSResponse, error) {
	// Get TCS rate for section
	rate, err := c.repo.GetTCSRate(ctx, req.TenantID, req.Section)
	if err != nil {
		return nil, fmt.Errorf("TCS rate not found for section %s: %w", req.Section, err)
	}

	// Parse invoice date
	invoiceDate, err := time.Parse("2006-01-02", req.InvoiceDate)
	if err != nil {
		return nil, fmt.Errorf("invalid invoice date: %w", err)
	}
	fy := getFinancialYear(invoiceDate)
	quarter := getQuarter(invoiceDate)

	// Check threshold - get cumulative sales in FY
	cumulativeAmount, err := c.repo.GetTCSSummaryByCustomer(ctx, req.TenantID, req.CustomerID, fy)
	if err != nil {
		cumulativeAmount = decimal.Zero
	}

	totalWithCurrent := cumulativeAmount.Add(req.SaleAmount)
	thresholdApplied := false

	// For 206C(1H), TCS applies only on amount exceeding 50 lakhs
	if req.Section == models.TCSSection206C1H {
		threshold := rate.ThresholdAmount // 50 lakhs
		if totalWithCurrent.LessThanOrEqual(threshold) {
			thresholdApplied = true
			return &models.CalculateTCSResponse{
				Section:          req.Section,
				SaleAmount:       req.SaleAmount,
				TCSRate:          decimal.Zero,
				TCSAmount:        decimal.Zero,
				TotalAmount:      req.SaleAmount,
				IsPANAvailable:   req.CustomerPAN != "",
				ThresholdApplied: thresholdApplied,
				ThresholdAmount:  threshold,
				FinancialYear:    fy,
				Quarter:          quarter,
			}, nil
		}

		// Calculate TCS only on amount exceeding threshold
		taxableAmount := totalWithCurrent.Sub(threshold)
		if taxableAmount.GreaterThan(req.SaleAmount) {
			taxableAmount = req.SaleAmount
		}

		var tcsRate decimal.Decimal
		if req.CustomerPAN != "" {
			tcsRate = rate.RateWithPAN
		} else {
			tcsRate = rate.RateWithoutPAN
		}

		tcsAmount := taxableAmount.Mul(tcsRate).Div(decimal.NewFromInt(100))
		totalAmount := req.SaleAmount.Add(tcsAmount)

		return &models.CalculateTCSResponse{
			Section:          req.Section,
			SaleAmount:       req.SaleAmount,
			TCSRate:          tcsRate,
			TCSAmount:        tcsAmount,
			TotalAmount:      totalAmount,
			IsPANAvailable:   req.CustomerPAN != "",
			ThresholdApplied: false,
			ThresholdAmount:  threshold,
			FinancialYear:    fy,
			Quarter:          quarter,
		}, nil
	}

	// Standard TCS calculation for other sections
	var tcsRate decimal.Decimal
	if req.CustomerPAN != "" {
		tcsRate = rate.RateWithPAN
	} else {
		tcsRate = rate.RateWithoutPAN
	}

	tcsAmount := req.SaleAmount.Mul(tcsRate).Div(decimal.NewFromInt(100))
	totalAmount := req.SaleAmount.Add(tcsAmount)

	return &models.CalculateTCSResponse{
		Section:          req.Section,
		SaleAmount:       req.SaleAmount,
		TCSRate:          tcsRate,
		TCSAmount:        tcsAmount,
		TotalAmount:      totalAmount,
		IsPANAvailable:   req.CustomerPAN != "",
		ThresholdApplied: thresholdApplied,
		ThresholdAmount:  rate.ThresholdAmount,
		FinancialYear:    fy,
		Quarter:          quarter,
	}, nil
}

// RecordITC records Input Tax Credit from a purchase
func (c *TaxCalculator) RecordITC(ctx context.Context, req models.RecordITCRequest) (*models.InputTaxCredit, error) {
	invoiceDate, err := time.Parse("2006-01-02", req.InvoiceDate)
	if err != nil {
		return nil, fmt.Errorf("invalid invoice date: %w", err)
	}

	// Calculate total ITC
	totalITC := req.CGSTAmount.Add(req.SGSTAmount).Add(req.IGSTAmount).Add(req.CessAmount)

	// For now, eligible ITC = total ITC (can add reversal logic later)
	eligibleITC := totalITC

	// Determine claim period (MMYYYY format)
	claimPeriod := fmt.Sprintf("%02d%04d", invoiceDate.Month(), invoiceDate.Year())

	itc := &models.InputTaxCredit{
		TenantID:          req.TenantID,
		PurchaseInvoiceID: req.PurchaseInvoiceID,
		SupplierID:        req.SupplierID,
		SupplierGSTIN:     req.SupplierGSTIN,
		SupplierName:      req.SupplierName,
		InvoiceNumber:     req.InvoiceNumber,
		InvoiceDate:       invoiceDate,
		ITCType:           req.ITCType,
		HSNCode:           req.HSNCode,
		TaxableAmount:     req.TaxableAmount,
		CGSTAmount:        req.CGSTAmount,
		SGSTAmount:        req.SGSTAmount,
		IGSTAmount:        req.IGSTAmount,
		CessAmount:        req.CessAmount,
		TotalITC:          totalITC,
		EligibleITC:       eligibleITC,
		Status:            models.ITCStatusAvailable,
		ClaimPeriod:       claimPeriod,
	}

	err = c.repo.CreateInputTaxCredit(ctx, itc)
	if err != nil {
		return nil, err
	}

	return itc, nil
}

// GetITCSummary gets ITC summary for a period
func (c *TaxCalculator) GetITCSummary(ctx context.Context, tenantID, period string) (*models.ITCSummaryResponse, error) {
	return c.repo.GetITCSummary(ctx, tenantID, period)
}

// Helper functions
func (c *TaxCalculator) calculateSubtotal(items []models.LineItemInput) float64 {
	var subtotal float64
	for _, item := range items {
		subtotal += item.Subtotal
	}
	return subtotal
}

func (c *TaxCalculator) generateCacheKey(req models.CalculateTaxRequest) string {
	key := fmt.Sprintf("%s:%s:%s:%s:%s:%f",
		req.TenantID,
		req.ShippingAddress.Country,
		req.ShippingAddress.State,
		req.ShippingAddress.City,
		req.ShippingAddress.Zip,
		req.ShippingAmount,
	)

	for _, item := range req.LineItems {
		categoryID := "nil"
		if item.CategoryID != nil {
			categoryID = item.CategoryID.String()
		}
		key += fmt.Sprintf(":%s:%f", categoryID, item.Subtotal)
	}

	if req.CustomerID != nil {
		key += fmt.Sprintf(":%s", req.CustomerID.String())
	}

	hash := md5.Sum([]byte(key))
	return fmt.Sprintf("%x", hash)
}

func (c *TaxCalculator) cacheResult(ctx context.Context, cacheKey string, response *models.TaxCalculationResponse) {
	resultJSON, err := json.Marshal(response)
	if err != nil {
		return
	}

	cache := &models.TaxCalculationCache{
		CacheKey:          cacheKey,
		CalculationResult: string(resultJSON),
		ExpiresAt:         time.Now().Add(c.cacheTTL),
	}

	c.repo.CacheTaxCalculation(ctx, cache)
}

// getFinancialYear returns financial year in format "2024-25"
func getFinancialYear(date time.Time) string {
	year := date.Year()
	month := date.Month()

	if month < 4 { // Jan-Mar belongs to previous FY
		year--
	}

	return fmt.Sprintf("%d-%02d", year, (year+1)%100)
}

// getQuarter returns quarter (1-4) based on financial year
func getQuarter(date time.Time) int {
	month := date.Month()
	switch {
	case month >= 4 && month <= 6:
		return 1 // Q1: Apr-Jun
	case month >= 7 && month <= 9:
		return 2 // Q2: Jul-Sep
	case month >= 10 && month <= 12:
		return 3 // Q3: Oct-Dec
	default:
		return 4 // Q4: Jan-Mar
	}
}
