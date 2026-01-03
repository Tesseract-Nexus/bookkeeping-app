package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// JurisdictionType represents the type of tax jurisdiction
type JurisdictionType string

const (
	JurisdictionTypeCountry JurisdictionType = "COUNTRY"
	JurisdictionTypeState   JurisdictionType = "STATE"
	JurisdictionTypeCounty  JurisdictionType = "COUNTY"
	JurisdictionTypeCity    JurisdictionType = "CITY"
	JurisdictionTypeZIP     JurisdictionType = "ZIP"
)

// TaxType represents the type of tax
type TaxType string

const (
	TaxTypeSales   TaxType = "SALES"
	TaxTypeVAT     TaxType = "VAT"
	TaxTypeGST     TaxType = "GST"
	TaxTypeCGST    TaxType = "CGST"  // India - Central GST
	TaxTypeSGST    TaxType = "SGST"  // India - State GST
	TaxTypeIGST    TaxType = "IGST"  // India - Integrated GST (interstate)
	TaxTypeUTGST   TaxType = "UTGST" // India - Union Territory GST
	TaxTypeCESS    TaxType = "CESS"  // India - GST Cess (luxury goods)
	TaxTypeTDS     TaxType = "TDS"   // India - Tax Deducted at Source
	TaxTypeTCS     TaxType = "TCS"   // India - Tax Collected at Source
	TaxTypeCity    TaxType = "CITY"
	TaxTypeCounty  TaxType = "COUNTY"
	TaxTypeState   TaxType = "STATE"
	TaxTypeSpecial TaxType = "SPECIAL"
	TaxTypeHST     TaxType = "HST" // Canada - Harmonized Sales Tax
	TaxTypePST     TaxType = "PST" // Canada - Provincial Sales Tax
	TaxTypeQST     TaxType = "QST" // Canada - Quebec Sales Tax
)

// TaxJurisdiction represents a tax jurisdiction (country, state, city, etc.)
type TaxJurisdiction struct {
	ID        uuid.UUID        `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID  string           `json:"tenantId" gorm:"type:varchar(255);not null;uniqueIndex:idx_jurisdiction_unique,priority:1"`
	Name      string           `json:"name" gorm:"type:varchar(255);not null"`
	Type      JurisdictionType `json:"type" gorm:"type:varchar(50);not null;uniqueIndex:idx_jurisdiction_unique,priority:2"`
	Code      string           `json:"code" gorm:"type:varchar(50);not null;uniqueIndex:idx_jurisdiction_unique,priority:3"`
	StateCode string           `json:"stateCode" gorm:"type:varchar(10)"` // India state code (MH, KA, etc.)
	ParentID  *uuid.UUID       `json:"parentId" gorm:"type:uuid"`
	IsActive  bool             `json:"isActive" gorm:"default:true"`
	CreatedAt time.Time        `json:"createdAt"`
	UpdatedAt time.Time        `json:"updatedAt"`

	// Relationships
	Parent   *TaxJurisdiction  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children []TaxJurisdiction `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	TaxRates []TaxRate         `json:"taxRates,omitempty" gorm:"foreignKey:JurisdictionID"`
}

// TaxRate represents a tax rate for a jurisdiction
type TaxRate struct {
	ID             uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID       string     `json:"tenantId" gorm:"type:varchar(255);not null"`
	JurisdictionID uuid.UUID  `json:"jurisdictionId" gorm:"type:uuid;not null"`
	Name           string     `json:"name" gorm:"type:varchar(255);not null"`
	Rate           float64    `json:"rate" gorm:"type:decimal(10,6);not null"`
	TaxType        TaxType    `json:"taxType" gorm:"type:varchar(50);not null"`
	Priority       int        `json:"priority" gorm:"default:0"`
	IsCompound     bool       `json:"isCompound" gorm:"default:false"`
	EffectiveFrom  time.Time  `json:"effectiveFrom" gorm:"not null"`
	EffectiveTo    *time.Time `json:"effectiveTo"`
	IsActive       bool       `json:"isActive" gorm:"default:true"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`

	Jurisdiction TaxJurisdiction `json:"jurisdiction,omitempty" gorm:"foreignKey:JurisdictionID"`
}

// ProductTaxCategory represents a product category with specific tax treatment
type ProductTaxCategory struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID    string    `json:"tenantId" gorm:"type:varchar(255);not null;uniqueIndex:idx_category_unique,priority:1"`
	Name        string    `json:"name" gorm:"type:varchar(255);not null;uniqueIndex:idx_category_unique,priority:2"`
	Description string    `json:"description" gorm:"type:text"`
	TaxCode     string    `json:"taxCode" gorm:"type:varchar(50)"`
	HSNCode     string    `json:"hsnCode" gorm:"type:varchar(10)"` // India - Harmonized System of Nomenclature
	SACCode     string    `json:"sacCode" gorm:"type:varchar(10)"` // India - Services Accounting Code
	GSTSlab     float64   `json:"gstSlab" gorm:"type:decimal(5,2)"` // India - GST slab (0, 5, 12, 18, 28)
	IsTaxExempt bool      `json:"isTaxExempt" gorm:"default:false"`
	IsNilRated  bool      `json:"isNilRated" gorm:"default:false"` // 0% GST but not exempt
	IsZeroRated bool      `json:"isZeroRated" gorm:"default:false"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// TaxNexus represents a location where business has tax collection obligation
type TaxNexus struct {
	ID                  uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID            string    `json:"tenantId" gorm:"type:varchar(255);not null;uniqueIndex:idx_nexus_unique,priority:1"`
	JurisdictionID      uuid.UUID `json:"jurisdictionId" gorm:"type:uuid;not null;uniqueIndex:idx_nexus_unique,priority:2"`
	NexusType           string    `json:"nexusType" gorm:"type:varchar(50);not null"`
	RegistrationNumber  string    `json:"registrationNumber" gorm:"type:varchar(100)"`
	EffectiveDate       time.Time `json:"effectiveDate" gorm:"type:date;not null"`
	IsActive            bool      `json:"isActive" gorm:"default:true"`
	GSTIN               string    `json:"gstin" gorm:"type:varchar(15)"`            // 15-char GSTIN
	IsCompositionScheme bool      `json:"isCompositionScheme" gorm:"default:false"` // GST composition scheme
	VATNumber           string    `json:"vatNumber" gorm:"type:varchar(50)"`        // EU VAT number
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`

	Jurisdiction TaxJurisdiction `json:"jurisdiction,omitempty" gorm:"foreignKey:JurisdictionID"`
}

// ============ BOOKKEEPING SPECIFIC: TDS Models ============

// TDSSection represents TDS sections under Income Tax Act
type TDSSection string

const (
	TDSSection192  TDSSection = "192"  // Salary
	TDSSection194A TDSSection = "194A" // Interest other than securities
	TDSSection194C TDSSection = "194C" // Contractor
	TDSSection194H TDSSection = "194H" // Commission/Brokerage
	TDSSection194I TDSSection = "194I" // Rent
	TDSSection194J TDSSection = "194J" // Professional/Technical fees
	TDSSection194Q TDSSection = "194Q" // Purchase of goods
	TDSSection195  TDSSection = "195"  // Non-resident payments
)

// TDSRate represents TDS rates for different sections
type TDSRate struct {
	ID                   uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID             string         `json:"tenantId" gorm:"type:varchar(255);not null"`
	Section              TDSSection     `json:"section" gorm:"type:varchar(10);not null"`
	Description          string         `json:"description" gorm:"type:varchar(255)"`
	RateWithPAN          decimal.Decimal `json:"rateWithPan" gorm:"type:decimal(5,2);not null"`    // Rate when PAN available
	RateWithoutPAN       decimal.Decimal `json:"rateWithoutPan" gorm:"type:decimal(5,2);not null"` // Higher rate without PAN
	ThresholdAmount      decimal.Decimal `json:"thresholdAmount" gorm:"type:decimal(12,2)"`        // Amount below which TDS not applicable
	ThresholdPerAnnum    bool           `json:"thresholdPerAnnum" gorm:"default:true"`             // Threshold is per annum
	EffectiveFrom        time.Time      `json:"effectiveFrom" gorm:"not null"`
	EffectiveTo          *time.Time     `json:"effectiveTo"`
	IsActive             bool           `json:"isActive" gorm:"default:true"`
	CreatedAt            time.Time      `json:"createdAt"`
	UpdatedAt            time.Time      `json:"updatedAt"`
}

// TDSDeduction represents a TDS deduction record
type TDSDeduction struct {
	ID              uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID        string          `json:"tenantId" gorm:"type:varchar(255);not null;index"`
	InvoiceID       *uuid.UUID      `json:"invoiceId" gorm:"type:uuid;index"`
	PaymentID       *uuid.UUID      `json:"paymentId" gorm:"type:uuid;index"`
	DeducteeID      uuid.UUID       `json:"deducteeId" gorm:"type:uuid;not null"` // Vendor/Supplier
	DeducteeName    string          `json:"deducteeName" gorm:"type:varchar(255);not null"`
	DeducteePAN     string          `json:"deducteePan" gorm:"type:varchar(10)"`
	Section         TDSSection      `json:"section" gorm:"type:varchar(10);not null"`
	GrossAmount     decimal.Decimal `json:"grossAmount" gorm:"type:decimal(12,2);not null"`
	TDSRate         decimal.Decimal `json:"tdsRate" gorm:"type:decimal(5,2);not null"`
	TDSAmount       decimal.Decimal `json:"tdsAmount" gorm:"type:decimal(12,2);not null"`
	NetAmount       decimal.Decimal `json:"netAmount" gorm:"type:decimal(12,2);not null"`
	DeductionDate   time.Time       `json:"deductionDate" gorm:"type:date;not null"`
	DepositDate     *time.Time      `json:"depositDate" gorm:"type:date"`
	ChallanNumber   string          `json:"challanNumber" gorm:"type:varchar(50)"`
	BSRCode         string          `json:"bsrCode" gorm:"type:varchar(10)"`
	CertificateNo   string          `json:"certificateNo" gorm:"type:varchar(50)"` // Form 16A number
	FinancialYear   string          `json:"financialYear" gorm:"type:varchar(10);not null"` // 2024-25
	Quarter         int             `json:"quarter" gorm:"not null"` // Q1, Q2, Q3, Q4
	Status          string          `json:"status" gorm:"type:varchar(20);default:'PENDING'"` // PENDING, DEPOSITED, FILED
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

// ============ BOOKKEEPING SPECIFIC: TCS Models ============

// TCSSection represents TCS sections
type TCSSection string

const (
	TCSSection206C1  TCSSection = "206C(1)"  // Sale of specified goods
	TCSSection206C1H TCSSection = "206C(1H)" // Sale of goods exceeding 50 lakhs
	TCSSection206C1G TCSSection = "206C(1G)" // Overseas tour package
)

// TCSRate represents TCS rates for different sections
type TCSRate struct {
	ID                uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID          string          `json:"tenantId" gorm:"type:varchar(255);not null"`
	Section           TCSSection      `json:"section" gorm:"type:varchar(20);not null"`
	Description       string          `json:"description" gorm:"type:varchar(255)"`
	RateWithPAN       decimal.Decimal `json:"rateWithPan" gorm:"type:decimal(5,2);not null"`
	RateWithoutPAN    decimal.Decimal `json:"rateWithoutPan" gorm:"type:decimal(5,2);not null"`
	ThresholdAmount   decimal.Decimal `json:"thresholdAmount" gorm:"type:decimal(12,2)"`
	EffectiveFrom     time.Time       `json:"effectiveFrom" gorm:"not null"`
	EffectiveTo       *time.Time      `json:"effectiveTo"`
	IsActive          bool            `json:"isActive" gorm:"default:true"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

// TCSCollection represents a TCS collection record
type TCSCollection struct {
	ID              uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID        string          `json:"tenantId" gorm:"type:varchar(255);not null;index"`
	InvoiceID       uuid.UUID       `json:"invoiceId" gorm:"type:uuid;not null;index"`
	CustomerID      uuid.UUID       `json:"customerId" gorm:"type:uuid;not null"`
	CustomerName    string          `json:"customerName" gorm:"type:varchar(255);not null"`
	CustomerPAN     string          `json:"customerPan" gorm:"type:varchar(10)"`
	Section         TCSSection      `json:"section" gorm:"type:varchar(20);not null"`
	SaleAmount      decimal.Decimal `json:"saleAmount" gorm:"type:decimal(12,2);not null"`
	TCSRate         decimal.Decimal `json:"tcsRate" gorm:"type:decimal(5,2);not null"`
	TCSAmount       decimal.Decimal `json:"tcsAmount" gorm:"type:decimal(12,2);not null"`
	CollectionDate  time.Time       `json:"collectionDate" gorm:"type:date;not null"`
	DepositDate     *time.Time      `json:"depositDate" gorm:"type:date"`
	ChallanNumber   string          `json:"challanNumber" gorm:"type:varchar(50)"`
	FinancialYear   string          `json:"financialYear" gorm:"type:varchar(10);not null"`
	Quarter         int             `json:"quarter" gorm:"not null"`
	Status          string          `json:"status" gorm:"type:varchar(20);default:'PENDING'"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

// ============ BOOKKEEPING SPECIFIC: ITC Models ============

// ITCType represents types of Input Tax Credit
type ITCType string

const (
	ITCTypeInputs       ITCType = "INPUTS"        // ITC on inputs (raw materials)
	ITCTypeInputService ITCType = "INPUT_SERVICE" // ITC on input services
	ITCTypeCapitalGoods ITCType = "CAPITAL_GOODS" // ITC on capital goods
)

// ITCStatus represents ITC claim status
type ITCStatus string

const (
	ITCStatusAvailable   ITCStatus = "AVAILABLE"   // ITC available for claim
	ITCStatusClaimed     ITCStatus = "CLAIMED"     // ITC already claimed
	ITCStatusReversed    ITCStatus = "REVERSED"    // ITC reversed (blocked/ineligible)
	ITCStatusReconciled  ITCStatus = "RECONCILED"  // ITC matched with GSTR-2A/2B
	ITCStatusMismatch    ITCStatus = "MISMATCH"    // ITC mismatch with supplier filing
)

// InputTaxCredit represents ITC available from purchases
type InputTaxCredit struct {
	ID                uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID          string          `json:"tenantId" gorm:"type:varchar(255);not null;index"`
	PurchaseInvoiceID uuid.UUID       `json:"purchaseInvoiceId" gorm:"type:uuid;not null;index"`
	SupplierID        uuid.UUID       `json:"supplierId" gorm:"type:uuid;not null"`
	SupplierGSTIN     string          `json:"supplierGstin" gorm:"type:varchar(15);not null"`
	SupplierName      string          `json:"supplierName" gorm:"type:varchar(255);not null"`
	InvoiceNumber     string          `json:"invoiceNumber" gorm:"type:varchar(50);not null"`
	InvoiceDate       time.Time       `json:"invoiceDate" gorm:"type:date;not null"`
	ITCType           ITCType         `json:"itcType" gorm:"type:varchar(20);not null"`
	HSNCode           string          `json:"hsnCode" gorm:"type:varchar(10)"`
	TaxableAmount     decimal.Decimal `json:"taxableAmount" gorm:"type:decimal(12,2);not null"`
	CGSTAmount        decimal.Decimal `json:"cgstAmount" gorm:"type:decimal(12,2);default:0"`
	SGSTAmount        decimal.Decimal `json:"sgstAmount" gorm:"type:decimal(12,2);default:0"`
	IGSTAmount        decimal.Decimal `json:"igstAmount" gorm:"type:decimal(12,2);default:0"`
	CessAmount        decimal.Decimal `json:"cessAmount" gorm:"type:decimal(12,2);default:0"`
	TotalITC          decimal.Decimal `json:"totalItc" gorm:"type:decimal(12,2);not null"`
	EligibleITC       decimal.Decimal `json:"eligibleItc" gorm:"type:decimal(12,2);not null"` // After reversal
	Status            ITCStatus       `json:"status" gorm:"type:varchar(20);default:'AVAILABLE'"`
	ClaimPeriod       string          `json:"claimPeriod" gorm:"type:varchar(10)"` // MMYYYY format
	GSTR2AMatched     bool            `json:"gstr2aMatched" gorm:"default:false"`
	GSTR2BMatched     bool            `json:"gstr2bMatched" gorm:"default:false"`
	ReversalReason    string          `json:"reversalReason" gorm:"type:varchar(255)"`
	ReversalAmount    decimal.Decimal `json:"reversalAmount" gorm:"type:decimal(12,2);default:0"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

// ITCReconciliation represents ITC reconciliation with GSTR-2A/2B
type ITCReconciliation struct {
	ID               uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID         string          `json:"tenantId" gorm:"type:varchar(255);not null;index"`
	Period           string          `json:"period" gorm:"type:varchar(10);not null"` // MMYYYY
	FinancialYear    string          `json:"financialYear" gorm:"type:varchar(10);not null"`

	// As per books
	BooksITCCGST     decimal.Decimal `json:"booksItcCgst" gorm:"type:decimal(12,2);default:0"`
	BooksITCSGST     decimal.Decimal `json:"booksItcSgst" gorm:"type:decimal(12,2);default:0"`
	BooksITCIGST     decimal.Decimal `json:"booksItcIgst" gorm:"type:decimal(12,2);default:0"`
	BooksITCCess     decimal.Decimal `json:"booksItcCess" gorm:"type:decimal(12,2);default:0"`

	// As per GSTR-2B
	GSTR2BITCCGST    decimal.Decimal `json:"gstr2bItcCgst" gorm:"type:decimal(12,2);default:0"`
	GSTR2BITCSGST    decimal.Decimal `json:"gstr2bItcSgst" gorm:"type:decimal(12,2);default:0"`
	GSTR2BITCIGST    decimal.Decimal `json:"gstr2bItcIgst" gorm:"type:decimal(12,2);default:0"`
	GSTR2BITCCess    decimal.Decimal `json:"gstr2bItcCess" gorm:"type:decimal(12,2);default:0"`

	// Difference
	DifferenceCGST   decimal.Decimal `json:"differenceCgst" gorm:"type:decimal(12,2);default:0"`
	DifferenceSGST   decimal.Decimal `json:"differenceSgst" gorm:"type:decimal(12,2);default:0"`
	DifferenceIGST   decimal.Decimal `json:"differenceIgst" gorm:"type:decimal(12,2);default:0"`
	DifferenceCess   decimal.Decimal `json:"differenceCess" gorm:"type:decimal(12,2);default:0"`

	MatchedCount     int       `json:"matchedCount" gorm:"default:0"`
	MismatchCount    int       `json:"mismatchCount" gorm:"default:0"`
	NotInGSTRCount   int       `json:"notInGstrCount" gorm:"default:0"` // In books but not in GSTR
	NotInBooksCount  int       `json:"notInBooksCount" gorm:"default:0"` // In GSTR but not in books

	ReconciledAt     *time.Time `json:"reconciledAt"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

// ============ GSTR Compliance Models ============

// GSTRType represents different GST return types
type GSTRType string

const (
	GSTRType1   GSTRType = "GSTR1"   // Outward supplies
	GSTRType2A  GSTRType = "GSTR2A"  // Auto-populated inward supplies
	GSTRType2B  GSTRType = "GSTR2B"  // Auto-populated ITC statement
	GSTRType3B  GSTRType = "GSTR3B"  // Monthly summary return
	GSTRType9   GSTRType = "GSTR9"   // Annual return
	GSTRType9C  GSTRType = "GSTR9C"  // Reconciliation statement
)

// GSTRStatus represents GSTR filing status
type GSTRStatus string

const (
	GSTRStatusDraft     GSTRStatus = "DRAFT"
	GSTRStatusGenerated GSTRStatus = "GENERATED"
	GSTRStatusValidated GSTRStatus = "VALIDATED"
	GSTRStatusFiled     GSTRStatus = "FILED"
	GSTRStatusError     GSTRStatus = "ERROR"
)

// GSTRFiling represents a GST return filing record
type GSTRFiling struct {
	ID              uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	TenantID        string          `json:"tenantId" gorm:"type:varchar(255);not null;index"`
	GSTIN           string          `json:"gstin" gorm:"type:varchar(15);not null"`
	ReturnType      GSTRType        `json:"returnType" gorm:"type:varchar(10);not null"`
	Period          string          `json:"period" gorm:"type:varchar(10);not null"` // MMYYYY
	FinancialYear   string          `json:"financialYear" gorm:"type:varchar(10);not null"`

	// GSTR-3B Summary
	TotalOutward    decimal.Decimal `json:"totalOutward" gorm:"type:decimal(14,2);default:0"`
	TotalInward     decimal.Decimal `json:"totalInward" gorm:"type:decimal(14,2);default:0"`
	ITCAvailed      decimal.Decimal `json:"itcAvailed" gorm:"type:decimal(14,2);default:0"`
	ITCReversed     decimal.Decimal `json:"itcReversed" gorm:"type:decimal(14,2);default:0"`
	TaxPayableCGST  decimal.Decimal `json:"taxPayableCgst" gorm:"type:decimal(12,2);default:0"`
	TaxPayableSGST  decimal.Decimal `json:"taxPayableSgst" gorm:"type:decimal(12,2);default:0"`
	TaxPayableIGST  decimal.Decimal `json:"taxPayableIgst" gorm:"type:decimal(12,2);default:0"`
	TaxPayableCess  decimal.Decimal `json:"taxPayableCess" gorm:"type:decimal(12,2);default:0"`
	TotalTaxPayable decimal.Decimal `json:"totalTaxPayable" gorm:"type:decimal(14,2);default:0"`

	// Payment
	TaxPaidCGST     decimal.Decimal `json:"taxPaidCgst" gorm:"type:decimal(12,2);default:0"`
	TaxPaidSGST     decimal.Decimal `json:"taxPaidSgst" gorm:"type:decimal(12,2);default:0"`
	TaxPaidIGST     decimal.Decimal `json:"taxPaidIgst" gorm:"type:decimal(12,2);default:0"`
	TaxPaidCess     decimal.Decimal `json:"taxPaidCess" gorm:"type:decimal(12,2);default:0"`
	InterestPaid    decimal.Decimal `json:"interestPaid" gorm:"type:decimal(12,2);default:0"`
	LateFee         decimal.Decimal `json:"lateFee" gorm:"type:decimal(12,2);default:0"`

	Status          GSTRStatus `json:"status" gorm:"type:varchar(20);default:'DRAFT'"`
	DueDate         time.Time  `json:"dueDate" gorm:"type:date"`
	FiledAt         *time.Time `json:"filedAt"`
	ARN             string     `json:"arn" gorm:"type:varchar(50)"` // Acknowledgement Reference Number
	ErrorMessage    string     `json:"errorMessage" gorm:"type:text"`
	JSONData        JSONB      `json:"jsonData" gorm:"type:jsonb"` // Full GSTR JSON for filing

	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// ============ Helper Types ============

// JSONB is a custom type for PostgreSQL JSONB fields
type JSONB json.RawMessage

func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return []byte(j), nil
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	switch v := value.(type) {
	case []byte:
		*j = JSONB(v)
		return nil
	case string:
		*j = JSONB([]byte(v))
		return nil
	default:
		return nil
	}
}

func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return []byte(j), nil
}

func (j *JSONB) UnmarshalJSON(data []byte) error {
	if len(data) == 0 {
		*j = nil
		return nil
	}
	*j = JSONB(data)
	return nil
}

// TaxCalculationCache for caching tax calculations
type TaxCalculationCache struct {
	ID                uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	CacheKey          string    `json:"cacheKey" gorm:"type:varchar(255);not null;uniqueIndex"`
	CalculationResult string    `json:"calculationResult" gorm:"type:text"`
	CreatedAt         time.Time `json:"createdAt"`
	ExpiresAt         time.Time `json:"expiresAt" gorm:"not null;index"`
}

func (c *TaxCalculationCache) BeforeCreate(tx *gorm.DB) error {
	if c.ExpiresAt.IsZero() {
		c.ExpiresAt = time.Now().Add(1 * time.Hour)
	}
	return nil
}
