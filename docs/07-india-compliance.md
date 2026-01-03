# India Tax & Regulatory Compliance

## Overview

BookKeep is designed with India's tax and regulatory requirements built-in from the ground up. This document covers GST, TDS, Income Tax, and other compliance requirements effective 2025-2026.

**Last Updated**: January 2026

> **Critical 2025-2026 Changes**:
> - July 2025: GSTR-3B becomes non-editable (auto-populated from GSTR-1)
> - July 2025: Three-year limit on filing old returns
> - October 2025: IMS (Invoice Management System) enhancements
> - January 2026: Negative ledger balance blocks GSTR-3B filing
> - Ongoing: E-Invoice mandatory for ₹5 crore+ turnover (₹2 crore proposed)

---

## GST (Goods and Services Tax)

### GST Registration Types

| Type | Turnover Limit | Requirements |
|------|----------------|--------------|
| Regular | > ₹40 lakh (goods) / ₹20 lakh (services) | Full compliance |
| Composition | < ₹1.5 crore | Simplified returns |
| Casual | Temporary business | Event-based |
| Non-Resident | Foreign businesses | Service-specific |

### GST Rates (2025)

```
Standard Rates:
├── 0%   - Essential items, exports
├── 5%   - Basic necessities
├── 12%  - Standard goods
├── 18%  - Most goods & services (default)
└── 28%  - Luxury, sin goods

Cess (additional):
├── 1% to 15% - Luxury cars, tobacco, etc.
└── Compensation cess on specific items
```

### GSTIN Structure

```
27 AABCU 9603 R 1 ZM
│  │     │    │ │ └── Check digit
│  │     │    │ └──── Entity type (1=Prop, 2=Partnership, etc.)
│  │     │    └────── State-wise registration number
│  │     └─────────── PAN
│  └───────────────── Entity code from PAN
└──────────────────── State code (27 = Maharashtra)
```

### BookKeep GST Features

#### 1. GSTIN Validation
```go
// Validate GSTIN format and verify with GST portal
func ValidateGSTIN(gstin string) (*GSTINDetails, error) {
    // 1. Format validation (regex)
    // 2. Checksum validation
    // 3. API call to GST portal for verification
    // Returns: legal name, trade name, status, state
}
```

#### 2. Tax Calculation
```go
type TaxCalculation struct {
    TaxableAmount  decimal.Decimal
    PlaceOfSupply  string
    SellerState    string

    // Calculated
    IsInterstate   bool
    CGST           decimal.Decimal
    SGST           decimal.Decimal
    IGST           decimal.Decimal
    Cess           decimal.Decimal
    TotalTax       decimal.Decimal
}

// Interstate: IGST = Full rate
// Intrastate: CGST + SGST = Full rate (split equally)
```

#### 3. HSN/SAC Code Management
```
HSN Codes (Goods):
├── 2 digits: Chapter level
├── 4 digits: Heading level
├── 6 digits: Sub-heading level
└── 8 digits: Tariff item level

SAC Codes (Services):
├── 99xxxx format
└── Specific service categories

BookKeep provides:
- Searchable HSN/SAC database
- Auto-suggest based on product description
- Rate mapping for each code
- Mandatory for B2B invoices > ₹50,000
```

---

## E-Invoice (Electronic Invoice)

### E-Invoice Threshold (Current as of Jan 2026)

| From | Threshold |
|------|-----------|
| October 2020 | ₹500 crore+ |
| January 2021 | ₹100 crore+ |
| April 2021 | ₹50 crore+ |
| April 2022 | ₹20 crore+ |
| October 2022 | ₹10 crore+ |
| **August 2023** | **₹5 crore+** (Current) |
| *Proposed* | *₹2 crore+ (TBD)* |

> **Note**: The ₹5 crore threshold is current as of January 2026. The GST Council has proposed reducing to ₹2 crore but this is yet to be implemented. Monitor official notifications.

### 30-Day Reporting Rule

| Turnover (AATO) | Reporting Deadline | Effective From |
|-----------------|-------------------|----------------|
| ₹100 crore+ | Within 30 days of invoice | November 2023 |
| ₹10 crore+ | Within 30 days of invoice | April 2025 |

**Penalty for late reporting**: Invoice cannot be reported after 30 days, leading to ITC denial for buyer.

### E-Invoice Generation Flow

```
1. Create Invoice in BookKeep
                │
                ▼
2. Generate Invoice JSON (GST format)
                │
                ▼
3. Send to IRP (Invoice Registration Portal)
                │
                ▼
4. IRP validates and returns:
   ├── IRN (Invoice Reference Number) - 64 chars
   ├── Ack. Number
   ├── Ack. Date
   └── Signed QR Code
                │
                ▼
5. Store IRN & QR in invoice record
                │
                ▼
6. Print/share invoice with QR code
```

### E-Invoice JSON Schema (Key Fields)

```json
{
  "Version": "1.1",
  "TranDtls": {
    "TaxSch": "GST",
    "SupTyp": "B2B",
    "RegRev": "N"
  },
  "DocDtls": {
    "Typ": "INV",
    "No": "INV-2025-0001",
    "Dt": "03/01/2025"
  },
  "SellerDtls": {
    "Gstin": "27AABCU9603R1ZM",
    "LglNm": "Seller Legal Name",
    "TrdNm": "Seller Trade Name",
    "Addr1": "Address Line 1",
    "Loc": "Mumbai",
    "Pin": 400001,
    "Stcd": "27"
  },
  "BuyerDtls": {
    "Gstin": "27AABCS1429B1Z2",
    "LglNm": "Buyer Legal Name",
    "Pos": "27",
    "Addr1": "Address",
    "Loc": "Mumbai",
    "Pin": 400002,
    "Stcd": "27"
  },
  "ItemList": [
    {
      "SlNo": "1",
      "PrdDesc": "Product Description",
      "IsServc": "N",
      "HsnCd": "85287100",
      "Qty": 1,
      "Unit": "NOS",
      "UnitPrice": 35000,
      "TotAmt": 35000,
      "Discount": 0,
      "AssAmt": 35000,
      "GstRt": 18,
      "CgstAmt": 3150,
      "SgstAmt": 3150,
      "TotItemVal": 41300
    }
  ],
  "ValDtls": {
    "AssVal": 35000,
    "CgstVal": 3150,
    "SgstVal": 3150,
    "TotInvVal": 41300
  }
}
```

### E-Invoice Rules (2025-2026)

1. **30-Day Upload Rule**: For ₹10 crore+ turnover, invoices must be uploaded within 30 days (April 2025+)
2. **Credit Notes**: E-invoicing mandatory for credit notes (requires recipient action in IMS)
3. **Auto-population**: GSTR-3B auto-populated and NON-EDITABLE from July 2025
4. **Cancellation**: IRN can be cancelled within 24 hours only
5. **Amendment**: No amendments; cancel and reissue
6. **Penalty**: 100% of tax due or ₹10,000 (whichever higher); incorrect invoice up to ₹25,000

### E-Invoice Exemptions

The following are exempt from e-invoicing:
- Banking and financial institutions (banks, NBFCs, insurers)
- Goods Transport Agencies (GTAs)
- Passenger transport service providers
- Multiplex cinema operators
- SEZ units (not developers)
- Government departments and local authorities

### BookKeep E-Invoice Implementation

```go
type EInvoiceService interface {
    // Generate and register e-invoice
    GenerateEInvoice(invoiceID uuid.UUID) (*EInvoiceResponse, error)

    // Cancel within 24 hours
    CancelEInvoice(irn string, reason string) error

    // Get e-invoice details
    GetEInvoiceByIRN(irn string) (*EInvoiceDetails, error)

    // Bulk generation
    BulkGenerateEInvoice(invoiceIDs []uuid.UUID) ([]EInvoiceResult, error)
}

type EInvoiceResponse struct {
    IRN         string
    AckNumber   string
    AckDate     time.Time
    SignedQRCode string
    SignedInvoice string
    Status      string
}
```

---

## E-Way Bill

### When Required

| Condition | Requirement |
|-----------|-------------|
| Inter-state movement | Value > ₹50,000 |
| Intra-state movement | Value > ₹50,000 (varies by state) |
| Exempted goods | Not required |
| Job work | Required if applicable |

### E-Way Bill Validity

| Distance | Validity |
|----------|----------|
| Up to 200 km | 1 day |
| For every 200 km | Additional 1 day |
| Over-dimensional cargo | 1 day per 20 km |

### E-Way Bill Flow

```
1. Create Invoice with shipping details
                │
                ▼
2. Auto-check if E-Way Bill required
   (Value > ₹50,000 + goods movement)
                │
                ▼
3. Enter transport details:
   ├── Mode (Road/Rail/Air/Ship)
   ├── Vehicle Number
   ├── Transporter ID (optional)
   └── Distance (km)
                │
                ▼
4. Generate E-Way Bill via API
                │
                ▼
5. Receive:
   ├── E-Way Bill Number
   ├── Valid From
   └── Valid Until
                │
                ▼
6. Print E-Way Bill or keep digital copy
```

### E-Way Bill Actions

```go
type EWayBillService interface {
    // Generate new e-way bill
    Generate(invoiceID uuid.UUID, transport TransportDetails) (*EWayBill, error)

    // Update vehicle number (Part-B)
    UpdateVehicle(ewbNumber string, vehicleNumber string) error

    // Extend validity
    Extend(ewbNumber string, reason string, newVehicle string) error

    // Cancel (within 24 hours, if not verified)
    Cancel(ewbNumber string, reason string) error

    // Reject (by recipient)
    Reject(ewbNumber string, reason string) error
}
```

---

## GST Returns

### Return Types

| Return | Due Date | Description |
|--------|----------|-------------|
| GSTR-1 | 11th of next month | Outward supplies (sales) |
| **GSTR-1A** | Before GSTR-3B | **Correction return** (NEW - one-time rectification) |
| GSTR-3B | 20th of next month | Summary return with tax payment |
| GSTR-2A | Auto-generated | Inward supplies (purchases) |
| GSTR-2B | Auto-generated (14th) | ITC statement |
| GSTR-9 | 31st December | Annual return |
| GSTR-9C | 31st December | Reconciliation (if turnover > ₹5 crore) |

### Critical Changes - July 2025 Onwards

#### 1. Non-Editable GSTR-3B
From July 2025 return period (filed in August 2025):
- **Tax liability auto-populated from GSTR-1 and LOCKED**
- Manual editing of outward supply figures NOT allowed
- All corrections MUST be made via GSTR-1A before filing GSTR-3B
- Only reverse charge transactions allow manual entry

#### 2. GSTR-1A (Correction Return)
- One-time rectification window after GSTR-1, before GSTR-3B
- Can add, modify, or delete invoices
- **Only ONE correction per tax period**
- Must be filed if any changes needed

#### 3. Three-Year Filing Deadline
From July 1, 2025:
- Cannot file returns older than 3 years from due date
- Applies to: GSTR-1, 3B, 4, 5, 5A, 6, 7, 8, 9
- Missing this window = permanent non-filing

#### 4. January 2026 - Negative Ledger Balance
From January 2026:
- Negative balance in specified ledgers will BLOCK GSTR-3B filing
- ITC mismatch situations will restrict filing
- Must resolve ledger issues before filing

### Invoice Management System (IMS) - October 2025

IMS enhancements effective October 2025:

```
Invoice Status Options:
├── Accepted: ITC flows to GSTR-2B/3B
├── Rejected: ITC not available
├── Pending: Hold for specified period
└── No Action: Deemed accepted (auto-flow)

Credit Note Handling:
├── Recipient can mark as Pending
├── Partial ITC reversal allowed
├── Flexibility in reversal amount
└── Required: Buyer acceptance
```

**Key IMS Features**:
- GSTR-2B auto-generated on 14th of every month
- ITC auto-flows from IMS → GSTR-2B → GSTR-3B
- Can take action after GSTR-2B generation (until GSTR-3B filing)
- GSTR-2B can be regenerated if IMS actions taken
- Bill of Entry (BoE) details now visible including SEZ imports

### GSTR-1 Data Preparation

```go
type GSTR1Data struct {
    GSTIN     string
    Period    string // "012025" for Jan 2025

    // B2B Invoices (to registered businesses)
    B2B []B2BInvoice

    // B2C Large (to unregistered, interstate > ₹2.5 lakh)
    B2CL []B2CLInvoice

    // B2C Small (to unregistered, intrastate)
    B2CS []B2CSSummary

    // Credit/Debit Notes
    CDNR []CreditDebitNote
    CDNUR []CreditDebitNoteUnregistered

    // Exports
    EXP []ExportInvoice

    // HSN Summary
    HSN []HSNSummary

    // Document Summary
    DOC []DocumentSummary
}

type B2BInvoice struct {
    GSTIN       string
    InvoiceNo   string
    InvoiceDate string
    Value       decimal.Decimal
    PlaceOfSupply string
    ReverseCharge string
    InvoiceType  string
    Items       []InvoiceItem
}
```

### GSTR-3B Summary

```go
type GSTR3BSummary struct {
    // 3.1 - Outward Supplies
    OutwardTaxable      TaxSummary
    OutwardZeroRated    TaxSummary
    OutwardNilRated     TaxSummary
    OutwardExempt       TaxSummary

    // 3.2 - Interstate supplies to unregistered
    InterStateUnreg     []StateWiseSummary

    // 4 - Eligible ITC
    ITCAvailable       ITCSummary
    ITCReversed        ITCSummary
    ITCNet             ITCSummary

    // 5 - Exempt/Non-GST supplies
    ExemptSupplies     ExemptSummary

    // 6 - Tax Payable
    TaxPayable         TaxPayment
    TaxPaid            TaxPayment
}
```

### BookKeep Return Features

1. **Auto-generation**: GSTR-1/3B data prepared from invoices
2. **GSTR-1A Support**: Automatic correction detection before GSTR-3B
3. **IMS Integration**: View and manage invoice status (Accept/Reject/Pending)
4. **Reconciliation**: Match GSTR-2A/2B with purchase records
5. **ITC Tracking**: Track input tax credit eligibility with mismatch alerts
6. **Export**: JSON format for GST portal upload
7. **Due Date Alerts**: Notifications before due dates
8. **Ledger Balance Monitoring**: Alert before GSTR-3B if negative balance detected

### BookKeep IMS Implementation

```go
type IMSService interface {
    // Get invoices pending action in IMS
    GetPendingInvoices(tenantID uuid.UUID, period string) ([]IMSInvoice, error)

    // Take action on supplier invoice
    UpdateInvoiceStatus(invoiceID uuid.UUID, status IMSStatus) error

    // Handle credit note actions
    ProcessCreditNote(creditNoteID uuid.UUID, action CreditNoteAction) error

    // Sync IMS data with GSTR-2B
    SyncWithGSTR2B(tenantID uuid.UUID, period string) error

    // Check for ITC mismatches before GSTR-3B
    CheckITCMismatches(tenantID uuid.UUID, period string) ([]ITCMismatch, error)
}

type IMSStatus string
const (
    IMSAccepted IMSStatus = "accepted"
    IMSRejected IMSStatus = "rejected"
    IMSPending  IMSStatus = "pending"
    IMSNoAction IMSStatus = "no_action"
)
```

---

## TDS (Tax Deducted at Source)

### TDS Applicability for Businesses

| Section | Payment Type | Threshold | Rate |
|---------|-------------|-----------|------|
| 194C | Contractor payments | ₹30,000 single / ₹1 lakh yearly | 1% (individual) / 2% (others) |
| 194J | Professional fees | ₹30,000 yearly | 10% |
| 194I | Rent | ₹2,40,000 yearly | 10% |
| 194H | Commission | ₹15,000 yearly | 5% |
| 194A | Interest | ₹5,000 yearly | 10% |

### TDS Implementation

```go
type TDSEntry struct {
    VendorID      uuid.UUID
    Section       string    // "194C", "194J", etc.
    PaymentDate   time.Time
    GrossAmount   decimal.Decimal
    TDSRate       decimal.Decimal
    TDSAmount     decimal.Decimal
    NetPayment    decimal.Decimal

    // Challan details (after deposit)
    ChallanNumber string
    DepositDate   time.Time
    BSRCode       string
}

type TDSService interface {
    // Calculate TDS on payment
    CalculateTDS(vendorID uuid.UUID, amount decimal.Decimal, section string) (*TDSCalculation, error)

    // Record TDS deduction
    RecordTDS(entry TDSEntry) error

    // Get TDS summary for vendor
    GetVendorTDS(vendorID uuid.UUID, financialYear string) ([]TDSEntry, error)

    // Generate TDS certificate (Form 16A)
    GenerateCertificate(vendorID uuid.UUID, quarter string) ([]byte, error)

    // Prepare TDS return data
    PrepareTDSReturn(quarter string) (*TDSReturnData, error)
}
```

### TDS Compliance Calendar

| Quarter | Period | Deposit Due | Return Due |
|---------|--------|-------------|------------|
| Q1 | Apr-Jun | 7th of next month | 31st July |
| Q2 | Jul-Sep | 7th of next month | 31st October |
| Q3 | Oct-Dec | 7th of next month | 31st January |
| Q4 | Jan-Mar | 30th April | 31st May |

---

## Multi-Factor Authentication (MFA) - GST Portal

### MFA Requirement (Effective April 2025)

From April 1, 2025, MFA is mandatory for all taxpayers logging into the GST portal.

**BookKeep Implementation**:
- Store GST portal credentials securely (encrypted)
- Support TOTP-based MFA
- Guide users through MFA setup
- Remember devices for seamless experience

---

## Invoice Compliance Requirements

### Mandatory Invoice Fields (B2B)

```
1. GSTIN of supplier
2. Invoice number (unique, sequential)
3. Invoice date
4. Recipient details:
   - Name
   - GSTIN (if registered)
   - Address
   - State code and name
5. HSN code (mandatory if turnover > ₹5 crore)
6. Description of goods/services
7. Quantity and unit
8. Total value
9. Taxable value and discounts
10. GST rates (CGST, SGST, IGST)
11. Tax amounts separately
12. Place of supply
13. Signature (physical) or digital signature
14. QR code (if e-invoice applicable)
```

### Invoice Number Rules

```
- Alphanumeric only
- Maximum 16 characters
- Sequential, no gaps
- Financial year based recommended
- Cannot be reused

BookKeep Format: {PREFIX}-{YEAR}-{NUMBER}
Example: INV-2025-0001
```

---

## State Codes Reference

```go
var StateCodes = map[string]string{
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
}
```

---

## Data Retention Requirements

### As per Income Tax Act

| Document Type | Retention Period |
|--------------|------------------|
| Books of accounts | 8 years from end of assessment year |
| Invoices | 8 years |
| Bank statements | 8 years |
| Contracts | 8 years |
| GST records | 6 years from due date of annual return |
| TDS records | 7 years |

### BookKeep Retention Policy

```go
type RetentionPolicy struct {
    Transactions    time.Duration // 8 years
    Invoices        time.Duration // 8 years
    TaxRecords      time.Duration // 8 years
    AuditLogs       time.Duration // 5 years
    UserData        time.Duration // Account lifetime + 90 days

    // Backup retention
    DailyBackups    time.Duration // 30 days
    WeeklyBackups   time.Duration // 1 year
    MonthlyBackups  time.Duration // 7 years
}
```

---

## Compliance Checklist

### Monthly

- [ ] Reconcile sales with GSTR-1 data
- [ ] Match purchases with GSTR-2A/2B
- [ ] File GSTR-1 by 11th
- [ ] File GSTR-3B by 20th
- [ ] Deposit TDS by 7th
- [ ] Review overdue invoices

### Quarterly

- [ ] File TDS returns
- [ ] Generate Form 16A for vendors
- [ ] Review GST ITC reconciliation
- [ ] Audit log review

### Annually

- [ ] File GSTR-9 (Annual Return)
- [ ] File GSTR-9C (if applicable)
- [ ] Year-end closing entries
- [ ] Financial statements preparation
- [ ] Tax audit (if applicable)

---

## API Integrations

### GST APIs (via GSP/ASP)

| API | Purpose |
|-----|---------|
| Search GSTIN | Validate and fetch taxpayer details |
| E-Invoice | Generate IRN |
| E-Way Bill | Generate, update, cancel |
| GSTR-1 | File returns |
| GSTR-3B | File summary return |
| GSTR-2A/2B | Fetch inward supplies |

### Recommended GSPs

- ClearTax
- Tally
- IRIS Business Services
- Cygnet Infotech

### BookKeep Integration

```go
type GSTIntegration interface {
    // GSTIN operations
    ValidateGSTIN(gstin string) (*GSTINDetails, error)

    // E-Invoice operations
    GenerateIRN(invoice *Invoice) (*IRNResponse, error)
    CancelIRN(irn string, reason string) error

    // E-Way Bill operations
    GenerateEWB(invoice *Invoice, transport *Transport) (*EWBResponse, error)
    UpdateEWBVehicle(ewbNumber string, vehicle string) error
    CancelEWB(ewbNumber string, reason string) error

    // Returns
    PrepareGSTR1(period string) (*GSTR1Data, error)
    SubmitGSTR1(data *GSTR1Data) (*SubmissionResponse, error)
    FetchGSTR2A(period string) (*GSTR2AData, error)
}
```
