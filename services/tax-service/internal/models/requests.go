package models

import (
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// CalculateTaxRequest represents a tax calculation request
type CalculateTaxRequest struct {
	TenantID        string          `json:"tenantId" binding:"required"`
	ShippingAddress AddressInput    `json:"shippingAddress" binding:"required"`
	OriginAddress   *AddressInput   `json:"originAddress"`
	LineItems       []LineItemInput `json:"lineItems" binding:"required,min=1"`
	ShippingAmount  float64         `json:"shippingAmount"`
	CustomerID      *uuid.UUID      `json:"customerId"`
	CustomerGSTIN   string          `json:"customerGstin"`
	IsB2B           bool            `json:"isB2b"`
}

// AddressInput represents an address for tax calculation
type AddressInput struct {
	Country     string `json:"country"`
	CountryCode string `json:"countryCode"`
	State       string `json:"state"`
	StateCode   string `json:"stateCode"`
	City        string `json:"city"`
	Zip         string `json:"zip"`
}

// LineItemInput represents a line item for tax calculation
type LineItemInput struct {
	ProductID  *uuid.UUID `json:"productId"`
	CategoryID *uuid.UUID `json:"categoryId"`
	Name       string     `json:"name"`
	Quantity   float64    `json:"quantity"`
	UnitPrice  float64    `json:"unitPrice"`
	Subtotal   float64    `json:"subtotal"`
	HSNCode    string     `json:"hsnCode"`
	SACCode    string     `json:"sacCode"`
}

// TaxCalculationResponse represents the tax calculation result
type TaxCalculationResponse struct {
	Subtotal       float64        `json:"subtotal"`
	ShippingAmount float64        `json:"shippingAmount"`
	TaxAmount      float64        `json:"taxAmount"`
	Total          float64        `json:"total"`
	TaxBreakdown   []TaxBreakdown `json:"taxBreakdown"`
	IsExempt       bool           `json:"isExempt"`
	ExemptReason   string         `json:"exemptReason,omitempty"`
	ReverseCharge  bool           `json:"reverseCharge,omitempty"`
	GSTSummary     *GSTSummary    `json:"gstSummary,omitempty"`
	VATSummary     *VATSummary    `json:"vatSummary,omitempty"`
}

// TaxBreakdown represents individual tax components
type TaxBreakdown struct {
	JurisdictionID   uuid.UUID `json:"jurisdictionId,omitempty"`
	JurisdictionName string    `json:"jurisdictionName"`
	TaxType          string    `json:"taxType"`
	Rate             float64   `json:"rate"`
	TaxableAmount    float64   `json:"taxableAmount"`
	TaxAmount        float64   `json:"taxAmount"`
	HSNCode          string    `json:"hsnCode,omitempty"`
	SACCode          string    `json:"sacCode,omitempty"`
	IsCompound       bool      `json:"isCompound,omitempty"`
}

// GSTSummary represents India GST summary
type GSTSummary struct {
	IsInterstate bool    `json:"isInterstate"`
	CGST         float64 `json:"cgst"`
	SGST         float64 `json:"sgst"`
	IGST         float64 `json:"igst"`
	UTGST        float64 `json:"utgst"`
	CESS         float64 `json:"cess"`
	TotalGST     float64 `json:"totalGst"`
}

// VATSummary represents EU/UK VAT summary
type VATSummary struct {
	VATRate         float64 `json:"vatRate"`
	VATAmount       float64 `json:"vatAmount"`
	IsReverseCharge bool    `json:"isReverseCharge"`
	BuyerVATNumber  string  `json:"buyerVatNumber,omitempty"`
}

// ValidateAddressRequest for address validation
type ValidateAddressRequest struct {
	Address AddressInput `json:"address" binding:"required"`
}

// ValidateAddressResponse for address validation result
type ValidateAddressResponse struct {
	IsValid             bool           `json:"isValid"`
	StandardizedAddress AddressInput   `json:"standardizedAddress"`
	Suggestions         []AddressInput `json:"suggestions"`
}

// ============ TDS Request/Response ============

// CalculateTDSRequest for TDS calculation
type CalculateTDSRequest struct {
	TenantID      string         `json:"tenantId" binding:"required"`
	DeducteeID    uuid.UUID      `json:"deducteeId" binding:"required"`
	DeducteeName  string         `json:"deducteeName" binding:"required"`
	DeducteePAN   string         `json:"deducteePan"`
	Section       TDSSection     `json:"section" binding:"required"`
	GrossAmount   decimal.Decimal `json:"grossAmount" binding:"required"`
	PaymentDate   string         `json:"paymentDate" binding:"required"` // YYYY-MM-DD
	InvoiceID     *uuid.UUID     `json:"invoiceId"`
}

// CalculateTDSResponse for TDS calculation result
type CalculateTDSResponse struct {
	Section          TDSSection      `json:"section"`
	GrossAmount      decimal.Decimal `json:"grossAmount"`
	TDSRate          decimal.Decimal `json:"tdsRate"`
	TDSAmount        decimal.Decimal `json:"tdsAmount"`
	NetAmount        decimal.Decimal `json:"netAmount"`
	IsPANAvailable   bool            `json:"isPanAvailable"`
	ThresholdApplied bool            `json:"thresholdApplied"`
	ThresholdAmount  decimal.Decimal `json:"thresholdAmount"`
	FinancialYear    string          `json:"financialYear"`
	Quarter          int             `json:"quarter"`
}

// CreateTDSDeductionRequest for creating TDS deduction record
type CreateTDSDeductionRequest struct {
	TenantID      string         `json:"tenantId" binding:"required"`
	InvoiceID     *uuid.UUID     `json:"invoiceId"`
	PaymentID     *uuid.UUID     `json:"paymentId"`
	DeducteeID    uuid.UUID      `json:"deducteeId" binding:"required"`
	DeducteeName  string         `json:"deducteeName" binding:"required"`
	DeducteePAN   string         `json:"deducteePan"`
	Section       TDSSection     `json:"section" binding:"required"`
	GrossAmount   decimal.Decimal `json:"grossAmount" binding:"required"`
	TDSRate       decimal.Decimal `json:"tdsRate" binding:"required"`
	TDSAmount     decimal.Decimal `json:"tdsAmount" binding:"required"`
	DeductionDate string         `json:"deductionDate" binding:"required"`
}

// ============ TCS Request/Response ============

// CalculateTCSRequest for TCS calculation
type CalculateTCSRequest struct {
	TenantID      string          `json:"tenantId" binding:"required"`
	CustomerID    uuid.UUID       `json:"customerId" binding:"required"`
	CustomerName  string          `json:"customerName" binding:"required"`
	CustomerPAN   string          `json:"customerPan"`
	Section       TCSSection      `json:"section" binding:"required"`
	SaleAmount    decimal.Decimal `json:"saleAmount" binding:"required"`
	InvoiceID     uuid.UUID       `json:"invoiceId" binding:"required"`
	InvoiceDate   string          `json:"invoiceDate" binding:"required"`
}

// CalculateTCSResponse for TCS calculation result
type CalculateTCSResponse struct {
	Section          TCSSection      `json:"section"`
	SaleAmount       decimal.Decimal `json:"saleAmount"`
	TCSRate          decimal.Decimal `json:"tcsRate"`
	TCSAmount        decimal.Decimal `json:"tcsAmount"`
	TotalAmount      decimal.Decimal `json:"totalAmount"` // Sale + TCS
	IsPANAvailable   bool            `json:"isPanAvailable"`
	ThresholdApplied bool            `json:"thresholdApplied"`
	ThresholdAmount  decimal.Decimal `json:"thresholdAmount"`
	FinancialYear    string          `json:"financialYear"`
	Quarter          int             `json:"quarter"`
}

// ============ ITC Request/Response ============

// RecordITCRequest for recording Input Tax Credit
type RecordITCRequest struct {
	TenantID          string          `json:"tenantId" binding:"required"`
	PurchaseInvoiceID uuid.UUID       `json:"purchaseInvoiceId" binding:"required"`
	SupplierID        uuid.UUID       `json:"supplierId" binding:"required"`
	SupplierGSTIN     string          `json:"supplierGstin" binding:"required"`
	SupplierName      string          `json:"supplierName" binding:"required"`
	InvoiceNumber     string          `json:"invoiceNumber" binding:"required"`
	InvoiceDate       string          `json:"invoiceDate" binding:"required"`
	ITCType           ITCType         `json:"itcType" binding:"required"`
	HSNCode           string          `json:"hsnCode"`
	TaxableAmount     decimal.Decimal `json:"taxableAmount" binding:"required"`
	CGSTAmount        decimal.Decimal `json:"cgstAmount"`
	SGSTAmount        decimal.Decimal `json:"sgstAmount"`
	IGSTAmount        decimal.Decimal `json:"igstAmount"`
	CessAmount        decimal.Decimal `json:"cessAmount"`
}

// ITCSummaryResponse for ITC summary
type ITCSummaryResponse struct {
	TenantID         string          `json:"tenantId"`
	Period           string          `json:"period"`
	FinancialYear    string          `json:"financialYear"`
	TotalITCCGST     decimal.Decimal `json:"totalItcCgst"`
	TotalITCSGST     decimal.Decimal `json:"totalItcSgst"`
	TotalITCIGST     decimal.Decimal `json:"totalItcIgst"`
	TotalITCCess     decimal.Decimal `json:"totalItcCess"`
	TotalITC         decimal.Decimal `json:"totalItc"`
	EligibleITC      decimal.Decimal `json:"eligibleItc"`
	ReversedITC      decimal.Decimal `json:"reversedItc"`
	MatchedCount     int             `json:"matchedCount"`
	UnmatchedCount   int             `json:"unmatchedCount"`
}

// ============ GSTR Request/Response ============

// GenerateGSTR3BRequest for generating GSTR-3B
type GenerateGSTR3BRequest struct {
	TenantID      string `json:"tenantId" binding:"required"`
	GSTIN         string `json:"gstin" binding:"required"`
	Period        string `json:"period" binding:"required"` // MMYYYY
	FinancialYear string `json:"financialYear" binding:"required"`
}

// GSTR3BSummary for GSTR-3B summary
type GSTR3BSummary struct {
	// 3.1 - Outward Supplies
	OutwardTaxableB2B     decimal.Decimal `json:"outwardTaxableB2b"`
	OutwardTaxableB2C     decimal.Decimal `json:"outwardTaxableB2c"`
	OutwardZeroRated      decimal.Decimal `json:"outwardZeroRated"`
	OutwardNilRated       decimal.Decimal `json:"outwardNilRated"`
	OutwardExempt         decimal.Decimal `json:"outwardExempt"`
	OutwardNonGST         decimal.Decimal `json:"outwardNonGst"`

	// 3.2 - Unregistered Persons
	UnregisteredTaxable   decimal.Decimal `json:"unregisteredTaxable"`
	UnregisteredComposition decimal.Decimal `json:"unregisteredComposition"`
	UnregisteredUIN       decimal.Decimal `json:"unregisteredUin"`

	// 4 - ITC
	ITCImportGoods        decimal.Decimal `json:"itcImportGoods"`
	ITCImportServices     decimal.Decimal `json:"itcImportServices"`
	ITCInwardReverseCharge decimal.Decimal `json:"itcInwardReverseCharge"`
	ITCInwardISD          decimal.Decimal `json:"itcInwardIsd"`
	ITCOtherITC           decimal.Decimal `json:"itcOtherItc"`
	ITCTotal              decimal.Decimal `json:"itcTotal"`
	ITCReversed           decimal.Decimal `json:"itcReversed"`
	ITCNet                decimal.Decimal `json:"itcNet"`
	ITCIneligible         decimal.Decimal `json:"itcIneligible"`

	// 5 - Exempt/Nil/Non-GST Inward
	InwardExemptInterstate decimal.Decimal `json:"inwardExemptInterstate"`
	InwardExemptIntrastate decimal.Decimal `json:"inwardExemptIntrastate"`

	// 6 - Payment
	TaxPayableIGST  decimal.Decimal `json:"taxPayableIgst"`
	TaxPayableCGST  decimal.Decimal `json:"taxPayableCgst"`
	TaxPayableSGST  decimal.Decimal `json:"taxPayableSgst"`
	TaxPayableCess  decimal.Decimal `json:"taxPayableCess"`
	Interest        decimal.Decimal `json:"interest"`
	LateFee         decimal.Decimal `json:"lateFee"`
}

// TDSReturn26QRequest for generating 26Q TDS return
type TDSReturn26QRequest struct {
	TenantID      string `json:"tenantId" binding:"required"`
	FinancialYear string `json:"financialYear" binding:"required"`
	Quarter       int    `json:"quarter" binding:"required"`
	TAN           string `json:"tan" binding:"required"`
}

// TDSReturn26QSummary for 26Q summary
type TDSReturn26QSummary struct {
	TAN              string          `json:"tan"`
	FinancialYear    string          `json:"financialYear"`
	Quarter          int             `json:"quarter"`
	DeductionCount   int             `json:"deductionCount"`
	TotalGrossAmount decimal.Decimal `json:"totalGrossAmount"`
	TotalTDSAmount   decimal.Decimal `json:"totalTdsAmount"`
	DepositedAmount  decimal.Decimal `json:"depositedAmount"`
	PendingAmount    decimal.Decimal `json:"pendingAmount"`
	Deductions       []TDSDeduction  `json:"deductions"`
}
