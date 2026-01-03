# MVP Developer Guide

## Purpose

This guide provides step-by-step instructions for developers to build the BookKeep MVP. It breaks down every feature into actionable tasks with clear acceptance criteria, technical requirements, and implementation details.

**MVP Goal**: A functional bookkeeping app where store owners can record sales/expenses, create GST-compliant invoices, and view basic reports.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Sprint 1: Authentication & Onboarding](#2-sprint-1-authentication--onboarding)
3. [Sprint 2: Core Bookkeeping](#3-sprint-2-core-bookkeeping)
4. [Sprint 3: Invoice Management](#4-sprint-3-invoice-management)
5. [Sprint 4: Customer & Vendor Management](#5-sprint-4-customer--vendor-management)
6. [Sprint 5: GST Compliance (Basic)](#6-sprint-5-gst-compliance-basic)
7. [Sprint 6: Reports & Dashboard](#7-sprint-6-reports--dashboard)
8. [Sprint 7: Mobile App & Offline](#8-sprint-7-mobile-app--offline)
9. [Sprint 8: Testing & Launch](#9-sprint-8-testing--launch)
10. [Technical Specifications](#10-technical-specifications)

---

## 1. Project Setup

### 1.1 Repository Structure

```
bookkeeping-app/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── app/                # App router pages
│   │   ├── components/         # React components
│   │   ├── lib/                # Utilities
│   │   └── package.json
│   └── mobile/                 # React Native/Expo app
│       ├── app/                # Expo router
│       ├── components/
│       └── package.json
├── services/
│   ├── auth-service/           # Go - Authentication
│   ├── bookkeeping-service/    # Go - Transactions
│   ├── invoice-service/        # Go - Invoices
│   ├── customer-service/       # Go - Parties
│   ├── tax-service/            # Go - GST calculations
│   └── report-service/         # Go - Reports
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── api-client/             # TypeScript API client
│   └── shared/                 # Shared utilities
├── docker/
│   └── docker-compose.yml
├── docs/
├── turbo.json
├── pnpm-workspace.yaml
└── Makefile
```

### 1.2 Development Environment Setup

```bash
# Prerequisites
- Node.js 20+
- Go 1.25+
- PostgreSQL 15
- Redis 7
- Docker & Docker Compose
- pnpm 9+

# Clone and setup
git clone <repo-url>
cd bookkeeping-app

# Install dependencies
pnpm install

# Start infrastructure
docker-compose up -d postgres redis nats

# Run database migrations
make migrate-up

# Start all services
make dev
```

### 1.3 Environment Variables

```bash
# .env.local (apps/web)
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=BookKeep

# .env (services/auth-service)
DATABASE_URL=postgres://user:pass@localhost:5432/bookkeep_auth
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
OTP_EXPIRY_MINUTES=10
```

---

## 2. Sprint 1: Authentication & Onboarding

### 2.1 User Registration

#### Feature: Phone/Email Signup

**User Story**: As a store owner, I want to sign up using my phone number so I can quickly access the app.

**Acceptance Criteria**:
- [ ] User can enter phone number (Indian format: +91XXXXXXXXXX)
- [ ] OTP is sent via SMS (use MSG91 or Twilio for India)
- [ ] OTP is valid for 10 minutes
- [ ] Maximum 3 OTP attempts per phone
- [ ] After verification, user enters basic details
- [ ] Account is created and JWT issued

**API Endpoints**:

```go
// POST /api/v1/auth/otp/request
type OTPRequest struct {
    Phone   string `json:"phone" validate:"required,e164"`
    Purpose string `json:"purpose" validate:"required,oneof=register login reset"`
}

// POST /api/v1/auth/otp/verify
type OTPVerify struct {
    Phone string `json:"phone" validate:"required"`
    OTP   string `json:"otp" validate:"required,len=6"`
}

// POST /api/v1/auth/register
type RegisterRequest struct {
    Phone     string `json:"phone" validate:"required"`
    OTPToken  string `json:"otp_token" validate:"required"` // Verified OTP token
    FirstName string `json:"first_name" validate:"required,min=2"`
    LastName  string `json:"last_name"`
    Email     string `json:"email" validate:"omitempty,email"`
    Password  string `json:"password" validate:"omitempty,min=8"` // Optional for phone users
}
```

**Database Tables**:

```sql
-- Already in 04-database-schema.md
-- users, otp_tokens
```

**Implementation Steps**:

1. Create `services/auth-service/` with Gin framework
2. Implement OTP generation and storage in Redis
3. Integrate SMS provider (MSG91 for India)
4. Implement JWT token generation
5. Create rate limiting middleware (5 OTP requests per hour)
6. Create frontend signup flow with OTP input

**UI Components Needed**:
- PhoneInput with country code
- OTPInput (6-digit)
- RegistrationForm
- LoadingButton

---

### 2.2 User Login

#### Feature: Phone OTP Login

**User Story**: As a returning user, I want to login with OTP so I don't need to remember passwords.

**Acceptance Criteria**:
- [ ] User enters registered phone number
- [ ] OTP is sent and verified
- [ ] JWT access token (15 min) and refresh token (7 days) issued
- [ ] User is redirected to dashboard

**API Endpoints**:

```go
// POST /api/v1/auth/login
type LoginRequest struct {
    Phone    string `json:"phone,omitempty"`
    Email    string `json:"email,omitempty"`
    Password string `json:"password,omitempty"`
    OTPToken string `json:"otp_token,omitempty"` // For phone login
}

// Response
type LoginResponse struct {
    AccessToken  string    `json:"access_token"`
    RefreshToken string    `json:"refresh_token"`
    ExpiresIn    int       `json:"expires_in"` // seconds
    User         UserDTO   `json:"user"`
    Tenant       TenantDTO `json:"tenant"`
}
```

**Implementation Steps**:

1. Create login handler with phone/OTP flow
2. Create JWT middleware for protected routes
3. Implement refresh token rotation
4. Create login page UI
5. Handle token storage (HttpOnly cookies for web, SecureStore for mobile)

---

### 2.3 Business Onboarding

#### Feature: Business Setup Wizard

**User Story**: As a new user, I want to set up my business details so invoices show correct information.

**Acceptance Criteria**:
- [ ] Wizard collects: Business Name, Type, Address, GSTIN (optional)
- [ ] GSTIN is validated (format + checksum)
- [ ] Business is created as a new tenant
- [ ] User is set as Owner role
- [ ] User is redirected to dashboard

**API Endpoints**:

```go
// POST /api/v1/tenants
type CreateTenantRequest struct {
    Name         string `json:"name" validate:"required,min=2"`
    BusinessType string `json:"business_type" validate:"required,oneof=retail wholesale service manufacturing"`

    // Optional
    GSTIN        string `json:"gstin" validate:"omitempty,len=15"`
    PAN          string `json:"pan" validate:"omitempty,len=10"`

    // Address
    AddressLine1 string `json:"address_line1"`
    City         string `json:"city"`
    State        string `json:"state"`
    Pincode      string `json:"pincode" validate:"omitempty,len=6"`

    // Contact
    Email string `json:"email" validate:"omitempty,email"`
    Phone string `json:"phone"`
}
```

**GSTIN Validation Logic**:

```go
func ValidateGSTIN(gstin string) error {
    // 1. Length check (15 characters)
    if len(gstin) != 15 {
        return errors.New("GSTIN must be 15 characters")
    }

    // 2. State code check (01-38)
    stateCode := gstin[:2]
    if !isValidStateCode(stateCode) {
        return errors.New("Invalid state code")
    }

    // 3. PAN format check (characters 3-12)
    pan := gstin[2:12]
    if !isValidPANFormat(pan) {
        return errors.New("Invalid PAN in GSTIN")
    }

    // 4. Checksum validation (last character)
    if !validateGSTINChecksum(gstin) {
        return errors.New("Invalid GSTIN checksum")
    }

    return nil
}
```

**UI Flow**:

```
Step 1: Business Name & Type
├── Business Name (text input)
└── Business Type (select: Retail/Wholesale/Service/Manufacturing)

Step 2: Location
├── Address Line 1
├── City
├── State (dropdown with state codes)
└── Pincode

Step 3: Tax Details (Optional)
├── GSTIN (with validation)
└── PAN

Step 4: Review & Create
└── Summary of entered details
```

---

## 3. Sprint 2: Core Bookkeeping

### 3.1 Record Sale (Income)

#### Feature: Quick Sale Entry

**User Story**: As a store owner, I want to record a sale in under 30 seconds so I can track all income.

**Acceptance Criteria**:
- [ ] Single screen to enter sale details
- [ ] Amount, description, payment mode are required
- [ ] Customer selection is optional
- [ ] GST is auto-calculated based on settings
- [ ] Transaction is saved and reflected in dashboard

**API Endpoints**:

```go
// POST /api/v1/transactions
type CreateTransactionRequest struct {
    TransactionDate string `json:"transaction_date" validate:"required,date"` // YYYY-MM-DD
    TransactionType string `json:"transaction_type" validate:"required,oneof=sale purchase expense income transfer"`

    Amount      float64 `json:"amount" validate:"required,gt=0"`
    Description string  `json:"description" validate:"required,min=3"`

    // Optional
    PartyID       string `json:"party_id,omitempty"`
    PaymentMode   string `json:"payment_mode" validate:"required,oneof=cash bank upi card credit"`
    PaymentRef    string `json:"payment_reference,omitempty"`

    // Tax (auto-calculated if not provided)
    TaxRate       float64 `json:"tax_rate,omitempty"`
    TaxAmount     float64 `json:"tax_amount,omitempty"`

    Notes string `json:"notes,omitempty"`
}

// Response
type TransactionResponse struct {
    ID              string  `json:"id"`
    TransactionNum  string  `json:"transaction_number"` // Auto-generated: TXN-2026-0001
    TransactionDate string  `json:"transaction_date"`
    Type            string  `json:"type"`
    Amount          float64 `json:"amount"`
    TaxAmount       float64 `json:"tax_amount"`
    TotalAmount     float64 `json:"total_amount"`
    Description     string  `json:"description"`
    PaymentMode     string  `json:"payment_mode"`
    Party           *PartyDTO `json:"party,omitempty"`
    CreatedAt       string  `json:"created_at"`
}
```

**Mobile UI Design**:

```
┌─────────────────────────────────────────┐
│ ← Record Sale                           │
├─────────────────────────────────────────┤
│                                         │
│  Amount *                               │
│  ┌─────────────────────────────────────┐│
│  │ ₹ 0.00                              ││
│  └─────────────────────────────────────┘│
│  (Large number input, auto-format)      │
│                                         │
│  Description *                          │
│  ┌─────────────────────────────────────┐│
│  │ What did you sell?                  ││
│  └─────────────────────────────────────┘│
│                                         │
│  Customer (Optional)                    │
│  ┌─────────────────────────────────────┐│
│  │ 🔍 Search or add new                ││
│  └─────────────────────────────────────┘│
│                                         │
│  Payment                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ Cash │ │ UPI  │ │ Card │ │Credit│   │
│  │  ✓   │ │      │ │      │ │      │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │        ████ Save Sale ████          ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

**Implementation Steps**:

1. Create `services/bookkeeping-service/`
2. Implement transaction repository with PostgreSQL
3. Create transaction number generator (sequential per tenant per FY)
4. Implement GST auto-calculation
5. Create transaction API handlers
6. Build Quick Sale UI component
7. Add success toast with transaction summary

---

### 3.2 Record Expense

#### Feature: Quick Expense Entry

**User Story**: As a store owner, I want to record expenses so I can track where money goes.

**Acceptance Criteria**:
- [ ] Amount, description, category are required
- [ ] Categories: Rent, Utilities, Salaries, Transport, Supplies, Marketing, Other
- [ ] Receipt image can be attached (optional for MVP)
- [ ] Vendor selection is optional
- [ ] Transaction is saved

**Expense Categories (Seed Data)**:

```go
var DefaultExpenseCategories = []Category{
    {Code: "RENT", Name: "Rent", Icon: "building"},
    {Code: "UTILITIES", Name: "Utilities", Icon: "zap"},
    {Code: "SALARIES", Name: "Salaries & Wages", Icon: "users"},
    {Code: "TRANSPORT", Name: "Transportation", Icon: "truck"},
    {Code: "SUPPLIES", Name: "Office Supplies", Icon: "package"},
    {Code: "MARKETING", Name: "Marketing & Ads", Icon: "megaphone"},
    {Code: "PROFESSIONAL", Name: "Professional Services", Icon: "briefcase"},
    {Code: "BANK", Name: "Bank Charges", Icon: "credit-card"},
    {Code: "INSURANCE", Name: "Insurance", Icon: "shield"},
    {Code: "MAINTENANCE", Name: "Maintenance", Icon: "wrench"},
    {Code: "OTHER", Name: "Other", Icon: "more-horizontal"},
}
```

---

### 3.3 Transaction List

#### Feature: View All Transactions

**User Story**: As a store owner, I want to see all my transactions so I can review my business activity.

**Acceptance Criteria**:
- [ ] List shows recent transactions (newest first)
- [ ] Each item shows: date, description, amount, type (income/expense)
- [ ] Color coding: green for income, red for expense
- [ ] Filter by: date range, type, payment mode
- [ ] Search by description
- [ ] Pagination (20 items per page)

**API Endpoints**:

```go
// GET /api/v1/transactions
// Query params: page, per_page, type, from_date, to_date, payment_mode, search

type TransactionListResponse struct {
    Transactions []TransactionDTO `json:"transactions"`
    Meta         PaginationMeta   `json:"meta"`
}

type PaginationMeta struct {
    Page       int `json:"page"`
    PerPage    int `json:"per_page"`
    Total      int `json:"total"`
    TotalPages int `json:"total_pages"`
}
```

---

## 4. Sprint 3: Invoice Management

### 4.1 Create Sales Invoice

#### Feature: GST-Compliant Invoice Creation

**User Story**: As a store owner, I want to create professional GST invoices so I can bill my customers properly.

**Acceptance Criteria**:
- [ ] Invoice number is auto-generated (sequential)
- [ ] Customer is required for invoices
- [ ] Can add multiple line items
- [ ] Each item has: description, HSN (optional), qty, rate, GST%
- [ ] Tax is calculated automatically (CGST+SGST or IGST)
- [ ] Total is calculated with proper rounding
- [ ] Invoice can be saved as draft or finalized
- [ ] PDF preview available

**Invoice Number Format**:
```
{PREFIX}/{FY}/{SEQUENCE}
Example: INV/24-25/0001

Logic:
- Prefix: Configurable per tenant (default: INV)
- FY: Financial year (April-March in India)
- Sequence: Auto-increment, resets each FY
```

**GST Calculation Logic**:

```go
func CalculateInvoiceTax(invoice *Invoice, sellerState, buyerState string) {
    isInterstate := sellerState != buyerState

    for _, item := range invoice.Items {
        taxableAmount := item.Quantity * item.Rate - item.Discount

        if isInterstate {
            // IGST = Full rate
            item.IGSTRate = item.TaxRate
            item.IGSTAmount = taxableAmount * item.TaxRate / 100
        } else {
            // CGST + SGST = Full rate (split equally)
            item.CGSTRate = item.TaxRate / 2
            item.SGSTRate = item.TaxRate / 2
            item.CGSTAmount = taxableAmount * item.CGSTRate / 100
            item.SGSTAmount = taxableAmount * item.SGSTRate / 100
        }

        item.TotalAmount = taxableAmount + item.CGSTAmount + item.SGSTAmount + item.IGSTAmount
    }

    // Aggregate totals
    invoice.IsInterstate = isInterstate
    invoice.SubTotal = sumItemTaxableAmounts(invoice.Items)
    invoice.CGSTAmount = sumItemCGST(invoice.Items)
    invoice.SGSTAmount = sumItemSGST(invoice.Items)
    invoice.IGSTAmount = sumItemIGST(invoice.Items)
    invoice.TotalTax = invoice.CGSTAmount + invoice.SGSTAmount + invoice.IGSTAmount
    invoice.GrandTotal = roundToNearestRupee(invoice.SubTotal + invoice.TotalTax)
}
```

**API Endpoints**:

```go
// POST /api/v1/invoices
type CreateInvoiceRequest struct {
    InvoiceType string `json:"invoice_type" validate:"required,oneof=sale purchase"`
    InvoiceDate string `json:"invoice_date" validate:"required"`
    DueDate     string `json:"due_date,omitempty"`

    PartyID string `json:"party_id" validate:"required"`

    // For GST
    PlaceOfSupply string `json:"place_of_supply"` // State code

    Items []InvoiceItemRequest `json:"items" validate:"required,min=1"`

    // Discount at invoice level
    DiscountType  string  `json:"discount_type,omitempty"` // percentage, flat
    DiscountValue float64 `json:"discount_value,omitempty"`

    Notes string `json:"notes,omitempty"`
    Terms string `json:"terms,omitempty"`
}

type InvoiceItemRequest struct {
    Description string  `json:"description" validate:"required"`
    HSNCode     string  `json:"hsn_code,omitempty"`
    Quantity    float64 `json:"quantity" validate:"required,gt=0"`
    Unit        string  `json:"unit,omitempty"` // pcs, kg, ltr, hrs
    Rate        float64 `json:"rate" validate:"required,gt=0"`
    TaxRate     float64 `json:"tax_rate" validate:"required,oneof=0 5 12 18 28"`

    // Item-level discount
    DiscountType  string  `json:"discount_type,omitempty"`
    DiscountValue float64 `json:"discount_value,omitempty"`
}
```

---

### 4.2 View & Share Invoice

#### Feature: Invoice PDF & Sharing

**User Story**: As a store owner, I want to share invoices via WhatsApp so my customers can pay easily.

**Acceptance Criteria**:
- [ ] Invoice PDF is generated with professional template
- [ ] PDF includes: logo, business details, GSTIN, QR code placeholder
- [ ] Share via WhatsApp, Email, or download
- [ ] WhatsApp sends with message: "Invoice {number} for ₹{amount}"

**PDF Template Requirements**:

```
┌─────────────────────────────────────────────────────────────────┐
│  [LOGO]    BUSINESS NAME                           TAX INVOICE  │
│            Address Line 1, City                                  │
│            GSTIN: 27XXXXXXXXXXXXXXX                             │
├─────────────────────────────────────────────────────────────────┤
│  Invoice No: INV/24-25/0001              Date: 03-Jan-2026      │
│  Due Date: 02-Feb-2026                                          │
├─────────────────────────────────────────────────────────────────┤
│  Bill To:                           Ship To:                     │
│  Customer Name                      (Same as billing)            │
│  Address                                                         │
│  GSTIN: 27XXXXXXXXXXXXXXX                                       │
├─────────────────────────────────────────────────────────────────┤
│  # │ Description     │ HSN   │ Qty │ Rate    │ Tax  │ Amount   │
│────┼─────────────────┼───────┼─────┼─────────┼──────┼──────────│
│  1 │ Product Name    │ 8528  │ 1   │ 35,000  │ 18%  │ 41,300   │
├─────────────────────────────────────────────────────────────────┤
│                                          Subtotal  │  35,000   │
│                                          CGST 9%   │   3,150   │
│                                          SGST 9%   │   3,150   │
│                                          ─────────────────────  │
│                                          TOTAL     │  41,300   │
├─────────────────────────────────────────────────────────────────┤
│  Amount in Words: Forty One Thousand Three Hundred Rupees Only  │
├─────────────────────────────────────────────────────────────────┤
│  Bank Details:                          [QR CODE]               │
│  Bank Name: HDFC Bank                                           │
│  A/C No: XXXXXXXXX                                              │
│  IFSC: HDFC0001234                                              │
├─────────────────────────────────────────────────────────────────┤
│  Terms & Conditions:                                            │
│  1. Payment due within 30 days                                  │
├─────────────────────────────────────────────────────────────────┤
│                                          Authorized Signature   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.3 Record Payment Against Invoice

#### Feature: Payment Collection

**User Story**: As a store owner, I want to record when a customer pays so I can track outstanding amounts.

**Acceptance Criteria**:
- [ ] Can record partial or full payment
- [ ] Payment modes: Cash, Bank Transfer, UPI, Card, Cheque
- [ ] Invoice status updates: Unpaid → Partial → Paid
- [ ] Balance amount is calculated
- [ ] Transaction is created in bookkeeping

**API Endpoints**:

```go
// POST /api/v1/invoices/:id/payments
type RecordPaymentRequest struct {
    PaymentDate     string  `json:"payment_date" validate:"required"`
    Amount          float64 `json:"amount" validate:"required,gt=0"`
    PaymentMode     string  `json:"payment_mode" validate:"required"`
    PaymentRef      string  `json:"payment_reference,omitempty"`
    BankAccountID   string  `json:"bank_account_id,omitempty"`
    Notes           string  `json:"notes,omitempty"`
}
```

---

## 5. Sprint 4: Customer & Vendor Management

### 5.1 Add Customer

#### Feature: Customer Creation

**User Story**: As a store owner, I want to save customer details so I don't have to enter them every time.

**Acceptance Criteria**:
- [ ] Name is required
- [ ] Phone and/or email optional but recommended
- [ ] GSTIN is validated if provided
- [ ] Address is optional
- [ ] Credit limit can be set
- [ ] Can add from invoice screen with quick-add

**API Endpoints**:

```go
// POST /api/v1/customers
type CreateCustomerRequest struct {
    Name      string `json:"name" validate:"required,min=2"`
    PartyType string `json:"party_type" validate:"required,oneof=customer vendor both"`

    Phone string `json:"phone,omitempty"`
    Email string `json:"email,omitempty" validate:"omitempty,email"`

    GSTIN string `json:"gstin,omitempty" validate:"omitempty,len=15"`
    PAN   string `json:"pan,omitempty" validate:"omitempty,len=10"`

    BillingAddress struct {
        Line1   string `json:"line1,omitempty"`
        City    string `json:"city,omitempty"`
        State   string `json:"state,omitempty"`
        Pincode string `json:"pincode,omitempty"`
    } `json:"billing_address,omitempty"`

    CreditLimit int `json:"credit_limit,omitempty"` // In rupees
    CreditDays  int `json:"credit_days,omitempty"`  // Payment terms
}
```

---

### 5.2 Customer Ledger

#### Feature: View Customer Balance

**User Story**: As a store owner, I want to see how much each customer owes me.

**Acceptance Criteria**:
- [ ] Shows opening balance
- [ ] Lists all invoices and payments
- [ ] Running balance calculated
- [ ] Current outstanding shown prominently
- [ ] Can send statement to customer

---

## 6. Sprint 5: GST Compliance (Basic)

### 6.1 GST Settings

#### Feature: Configure GST Details

**User Story**: As a registered business, I want to set up my GST details so invoices are compliant.

**Acceptance Criteria**:
- [ ] Enter GSTIN (validated)
- [ ] State is auto-detected from GSTIN
- [ ] Configure default GST rates
- [ ] Enable/disable reverse charge
- [ ] Set HSN mandatory threshold (₹5 crore turnover)

---

### 6.2 HSN/SAC Code Management

#### Feature: HSN Code Lookup

**User Story**: As a store owner, I want to find HSN codes so my invoices are GST compliant.

**Acceptance Criteria**:
- [ ] Searchable HSN database (seeded)
- [ ] Search by code or description
- [ ] Shows default GST rate for each code
- [ ] Can save frequently used codes
- [ ] Auto-suggest in invoice item

**Seed Data**:

```sql
-- Common HSN codes for retail
INSERT INTO hsn_codes (code, description, type, default_rate) VALUES
('8471', 'Computers and accessories', 'hsn', 18),
('8517', 'Mobile phones', 'hsn', 18),
('8528', 'Television sets', 'hsn', 18),
('6109', 'T-shirts', 'hsn', 5),
('6203', 'Trousers', 'hsn', 12),
('0402', 'Milk and cream', 'hsn', 0),
('1006', 'Rice', 'hsn', 5),
-- ... more codes
```

---

### 6.3 GSTR-1 Data Preparation

#### Feature: Export Sales Data for GSTR-1

**User Story**: As a business owner, I want to export my sales data so I can file GSTR-1.

**Acceptance Criteria**:
- [ ] Filter by month/quarter
- [ ] Categorize: B2B, B2C Large, B2C Small, CDNR
- [ ] Generate JSON in GST portal format
- [ ] Show summary before export
- [ ] Highlight missing data (e.g., missing GSTIN for B2B)

---

## 7. Sprint 6: Reports & Dashboard

### 7.1 Dashboard

#### Feature: Home Dashboard

**User Story**: As a store owner, I want to see my business summary so I know how I'm doing.

**Acceptance Criteria**:
- [ ] Today's sales and expenses
- [ ] Cash in hand / Bank balance
- [ ] Outstanding receivables (money owed to you)
- [ ] Outstanding payables (money you owe)
- [ ] Recent transactions (last 5)
- [ ] Quick action buttons (New Sale, New Expense, New Invoice)
- [ ] Alerts (overdue invoices, GST filing due)

**Dashboard Data API**:

```go
// GET /api/v1/dashboard
type DashboardResponse struct {
    Today struct {
        Sales       float64 `json:"sales"`
        Expenses    float64 `json:"expenses"`
        NetIncome   float64 `json:"net_income"`
        Invoices    int     `json:"invoices_created"`
        Payments    int     `json:"payments_received"`
    } `json:"today"`

    Period struct { // Current month
        Sales           float64 `json:"sales"`
        Expenses        float64 `json:"expenses"`
        SalesChange     float64 `json:"sales_change_percent"` // vs last month
    } `json:"this_month"`

    Outstanding struct {
        Receivables float64 `json:"receivables"`
        Payables    float64 `json:"payables"`
    } `json:"outstanding"`

    CashPosition struct {
        CashInHand   float64 `json:"cash_in_hand"`
        BankBalance  float64 `json:"bank_balance"`
    } `json:"cash_position"`

    RecentTransactions []TransactionDTO `json:"recent_transactions"`
    OverdueInvoices    []InvoiceSummary `json:"overdue_invoices"`
    Alerts             []Alert          `json:"alerts"`
}
```

---

### 7.2 Profit & Loss Report

#### Feature: P&L Statement

**User Story**: As a store owner, I want to see my profit so I know if I'm making money.

**Acceptance Criteria**:
- [ ] Select date range (month, quarter, year, custom)
- [ ] Show Revenue (all sales)
- [ ] Show Expenses (by category)
- [ ] Calculate Net Profit
- [ ] Compare with previous period
- [ ] Export to PDF/Excel

---

### 7.3 Receivables Report

#### Feature: Outstanding Receivables

**User Story**: As a store owner, I want to see who owes me money so I can follow up.

**Acceptance Criteria**:
- [ ] List all unpaid/partial invoices
- [ ] Group by customer
- [ ] Show aging: Current, 1-30 days, 31-60 days, 61-90 days, 90+ days
- [ ] Total outstanding amount
- [ ] Quick action: Send reminder

---

## 8. Sprint 7: Mobile App & Offline

### 8.1 React Native App Setup

**Tech Stack**:
- Expo SDK 52+
- Expo Router for navigation
- NativeWind for styling
- DrizzleORM with expo-sqlite
- TanStack Query for data fetching
- Zustand for state

**Project Setup**:

```bash
# Create Expo app
npx create-expo-app apps/mobile --template expo-template-blank-typescript

# Install dependencies
cd apps/mobile
npx expo install expo-router expo-secure-store expo-sqlite
pnpm add drizzle-orm @tanstack/react-query zustand nativewind tailwindcss
```

---

### 8.2 Offline Data Sync

#### Feature: Work Offline

**User Story**: As a store owner with poor internet, I want to record sales offline so I don't miss any transactions.

**Acceptance Criteria**:
- [ ] Transactions can be created offline
- [ ] Data syncs when connection is available
- [ ] Visual indicator shows sync status
- [ ] Conflicts are resolved (server wins for MVP)
- [ ] Offline data persists app restarts

**Sync Queue Schema**:

```typescript
// apps/mobile/lib/db/schema.ts
export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(), // 'transaction', 'invoice', 'customer'
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // 'create', 'update', 'delete'
  payload: text('payload').notNull(), // JSON string
  attempts: integer('attempts').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
```

---

## 9. Sprint 8: Testing & Launch

### 9.1 Testing Requirements

**Unit Tests**:
- [ ] All service functions have unit tests
- [ ] GST calculation tests (interstate, intrastate)
- [ ] GSTIN validation tests
- [ ] Invoice number generation tests

**Integration Tests**:
- [ ] API endpoint tests with test database
- [ ] Auth flow tests
- [ ] Transaction creation flow

**E2E Tests**:
- [ ] Signup to first invoice flow
- [ ] Record sale and verify dashboard update
- [ ] Create invoice and payment

### 9.2 Launch Checklist

**Pre-Launch**:
- [ ] SSL certificates configured
- [ ] Environment variables secured
- [ ] Database backups scheduled
- [ ] Monitoring and alerting set up
- [ ] Error tracking (Sentry) configured
- [ ] Analytics (Mixpanel/Amplitude) set up

**App Store**:
- [ ] iOS: App Store listing, screenshots, privacy policy
- [ ] Android: Play Store listing, screenshots
- [ ] Both: App icons, splash screens

---

## 10. Technical Specifications

### 10.1 API Response Standards

```go
// Success response
{
  "success": true,
  "data": { ... },
  "meta": { ... } // For pagination
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {"field": "phone", "message": "Invalid phone format"}
    ]
  }
}
```

### 10.2 Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate entry |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### 10.3 Date/Time Handling

- All dates in API: `YYYY-MM-DD` format
- All timestamps in API: ISO 8601 with timezone
- Database: Timestamps stored in UTC
- Display: Convert to IST (Asia/Kolkata) for India users

### 10.4 Amount Handling

- All amounts in paisa (₹1 = 100 paisa) internally
- Display with 2 decimal places
- Use `decimal` type in Go, not `float64`
- Round to nearest rupee for totals

---

## MVP Definition of Done

A feature is considered complete when:

1. ✅ Code is written and reviewed
2. ✅ Unit tests pass
3. ✅ API documentation updated
4. ✅ Works on both web and mobile
5. ✅ Handles offline gracefully (mobile)
6. ✅ Error states handled
7. ✅ Loading states shown
8. ✅ Accessible (keyboard nav, screen reader)
9. ✅ Performance acceptable (< 200ms API, < 16ms UI)
10. ✅ Product owner has approved

---

## Quick Reference

### Service Ports (Development)

| Service | Port |
|---------|------|
| Web App | 3000 |
| Auth Service | 3080 |
| Bookkeeping Service | 3100 |
| Invoice Service | 3101 |
| Tax Service | 3102 |
| Report Service | 3103 |
| Customer Service | 3104 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| NATS | 4222 |

### Key Commands

```bash
# Start development
make dev

# Run tests
make test

# Build all services
make build

# Run migrations
make migrate-up

# Generate API docs
make docs
```
