# Database Schema Design

## Database Architecture

### Multi-Database Strategy

Each microservice owns its data with isolated schemas:

```
PostgreSQL Cluster
├── bookkeep_auth        (Auth Service)
├── bookkeep_tenant      (Tenant Service)
├── bookkeep_core        (Bookkeeping Service)
├── bookkeep_invoice     (Invoice Service)
├── bookkeep_tax         (Tax/GST Service)
├── bookkeep_customer    (Customer Service)
├── bookkeep_inventory   (Inventory Service)
├── bookkeep_payment     (Payment Service)
├── bookkeep_notification(Notification Service)
├── bookkeep_document    (Document Service)
└── bookkeep_audit       (Audit Service)
```

### Design Principles

1. **UUID Primary Keys**: All tables use UUID for distributed uniqueness
2. **Soft Deletes**: `deleted_at` timestamp for recoverable deletions
3. **Audit Columns**: `created_at`, `updated_at`, `created_by`, `updated_by`
4. **Tenant Isolation**: `tenant_id` on all tenant-scoped tables
5. **JSONB for Flexibility**: Metadata and extensible fields

---

## Core Schemas

### Auth Database (`bookkeep_auth`)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- User-Tenant relationship (users can belong to multiple tenants)
CREATE TABLE user_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, tenant_id)
);

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active_at TIMESTAMP DEFAULT NOW()
);

-- MFA settings
CREATE TABLE user_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    method VARCHAR(20) NOT NULL, -- 'totp', 'sms'
    secret_encrypted VARCHAR(500), -- For TOTP
    is_enabled BOOLEAN DEFAULT FALSE,
    backup_codes_hash TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, method)
);

-- OTP tokens
CREATE TABLE otp_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL, -- phone or email
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'login', 'verify', 'reset'
    attempts INT DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    used_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_user_tenants_user ON user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant ON user_tenants(tenant_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE NOT is_revoked;
```

### Tenant Database (`bookkeep_tenant`)

```sql
-- Tenants (Businesses)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- for subdomain
    business_type VARCHAR(50), -- 'retail', 'wholesale', 'service', 'manufacturing'
    logo_url VARCHAR(500),

    -- Business details
    legal_name VARCHAR(255),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    cin VARCHAR(21),

    -- Contact
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    state_code VARCHAR(2),
    pincode VARCHAR(10),
    country VARCHAR(50) DEFAULT 'India',

    -- Settings
    financial_year_start INT DEFAULT 4, -- April
    currency VARCHAR(3) DEFAULT 'INR',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',

    -- Subscription
    plan VARCHAR(50) DEFAULT 'starter',
    subscription_status VARCHAR(20) DEFAULT 'trial',
    trial_ends_at TIMESTAMP,
    subscription_ends_at TIMESTAMP,

    -- Metadata
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Stores (for multi-store support)
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20),

    -- Location
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    state_code VARCHAR(2),
    pincode VARCHAR(10),

    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),

    -- Settings
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- User-Store access (for multi-store permission)
CREATE TABLE user_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id),
    role VARCHAR(50), -- Role can vary per store

    UNIQUE(user_id, store_id)
);

-- Subscription history
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    amount DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'INR',
    payment_id VARCHAR(100),
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_stores_tenant ON stores(tenant_id);
CREATE INDEX idx_user_stores_user ON user_stores(user_id);
```

### Core Bookkeeping Database (`bookkeep_core`)

```sql
-- Chart of Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    parent_id UUID REFERENCES accounts(id),

    code VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'income', 'expense'
    sub_type VARCHAR(50), -- 'cash', 'bank', 'receivable', 'payable', etc.

    description TEXT,
    is_system BOOLEAN DEFAULT FALSE, -- System-created accounts
    is_active BOOLEAN DEFAULT TRUE,

    opening_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,

    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    UNIQUE(tenant_id, code)
);

-- Transactions (Journal Entries)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    store_id UUID,

    transaction_number VARCHAR(50) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    -- 'sale', 'purchase', 'receipt', 'payment', 'expense', 'journal', 'transfer'

    reference_type VARCHAR(50), -- 'invoice', 'bill', 'manual'
    reference_id UUID,

    party_id UUID, -- Customer or vendor
    party_type VARCHAR(20), -- 'customer', 'vendor'

    description TEXT,
    notes TEXT,

    -- Totals
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,

    -- Payment info
    payment_mode VARCHAR(50), -- 'cash', 'bank', 'upi', 'card', 'credit'
    payment_reference VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'posted', -- 'draft', 'posted', 'void'

    -- Audit
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    UNIQUE(tenant_id, transaction_number)
);

-- Transaction Line Items (Double-entry)
CREATE TABLE transaction_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,

    account_id UUID NOT NULL,

    description TEXT,

    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,

    -- For tax tracking
    tax_rate_id UUID,
    tax_amount DECIMAL(15, 2) DEFAULT 0,

    line_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Bank Accounts
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    account_id UUID REFERENCES accounts(id), -- Linked ledger account

    bank_name VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    account_number_encrypted VARCHAR(500),
    ifsc_code VARCHAR(11),
    branch VARCHAR(255),

    account_type VARCHAR(50), -- 'savings', 'current', 'overdraft'

    opening_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,

    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- For payment gateway integration
    razorpay_account_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Bank Transactions (for reconciliation)
CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    tenant_id UUID NOT NULL,

    transaction_date DATE NOT NULL,
    value_date DATE,
    description TEXT,
    reference VARCHAR(100),

    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2),

    -- Reconciliation
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_transaction_id UUID REFERENCES transactions(id),
    reconciled_at TIMESTAMP,
    reconciled_by UUID,

    -- Import tracking
    import_batch_id UUID,
    external_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW()
);

-- Financial Year Closings
CREATE TABLE financial_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    year_start DATE NOT NULL,
    year_end DATE NOT NULL,
    name VARCHAR(50), -- "FY 2024-25"

    is_current BOOLEAN DEFAULT FALSE,
    is_closed BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMP,
    closed_by UUID,

    opening_balances JSONB, -- Snapshot of account balances
    closing_balances JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_tenant ON accounts(tenant_id);
CREATE INDEX idx_accounts_type ON accounts(tenant_id, type);
CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX idx_transactions_date ON transactions(tenant_id, transaction_date);
CREATE INDEX idx_transactions_type ON transactions(tenant_id, transaction_type);
CREATE INDEX idx_transactions_party ON transactions(party_id);
CREATE INDEX idx_transaction_lines_transaction ON transaction_lines(transaction_id);
CREATE INDEX idx_transaction_lines_account ON transaction_lines(account_id);
CREATE INDEX idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
```

### Invoice Database (`bookkeep_invoice`)

```sql
-- Invoices (Sales & Purchase)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    store_id UUID,

    -- Invoice identification
    invoice_number VARCHAR(50) NOT NULL,
    invoice_type VARCHAR(20) NOT NULL, -- 'sale', 'purchase'
    document_type VARCHAR(30) DEFAULT 'invoice',
    -- 'invoice', 'quotation', 'proforma', 'delivery_challan', 'credit_note', 'debit_note'

    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE,

    -- Party (Customer/Vendor)
    party_id UUID NOT NULL,
    party_name VARCHAR(255) NOT NULL,
    party_gstin VARCHAR(15),
    party_address TEXT,
    party_state VARCHAR(100),
    party_state_code VARCHAR(2),

    -- Shipping (if different)
    shipping_name VARCHAR(255),
    shipping_address TEXT,
    shipping_state VARCHAR(100),
    shipping_state_code VARCHAR(2),

    -- Place of supply (for GST)
    place_of_supply VARCHAR(100),
    place_of_supply_code VARCHAR(2),
    is_interstate BOOLEAN DEFAULT FALSE,

    -- Amounts
    subtotal DECIMAL(15, 2) NOT NULL,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    discount_type VARCHAR(10), -- 'percentage', 'flat'
    discount_value DECIMAL(10, 2),

    taxable_amount DECIMAL(15, 2) NOT NULL,
    cgst_amount DECIMAL(15, 2) DEFAULT 0,
    sgst_amount DECIMAL(15, 2) DEFAULT 0,
    igst_amount DECIMAL(15, 2) DEFAULT 0,
    cess_amount DECIMAL(15, 2) DEFAULT 0,
    total_tax DECIMAL(15, 2) DEFAULT 0,

    round_off DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,

    -- Payment tracking
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    balance_amount DECIMAL(15, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid'

    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'accepted', 'cancelled'

    -- E-Invoice (GST)
    is_einvoice BOOLEAN DEFAULT FALSE,
    irn VARCHAR(100), -- Invoice Reference Number
    ack_number VARCHAR(50),
    ack_date TIMESTAMP,
    signed_qr_code TEXT,
    einvoice_json JSONB,

    -- E-Way Bill
    eway_bill_number VARCHAR(20),
    eway_bill_date TIMESTAMP,
    eway_bill_valid_until TIMESTAMP,

    -- Reference
    reference_invoice_id UUID REFERENCES invoices(id), -- For credit/debit notes
    po_number VARCHAR(50),
    po_date DATE,

    -- Notes
    notes TEXT,
    terms TEXT,
    internal_notes TEXT,

    -- Linked transaction
    transaction_id UUID,

    -- Attachments
    attachment_ids UUID[],

    -- Audit
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    UNIQUE(tenant_id, invoice_number, invoice_type)
);

-- Invoice Line Items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    item_id UUID, -- Reference to product/service
    item_type VARCHAR(20), -- 'product', 'service'

    description TEXT NOT NULL,
    hsn_sac_code VARCHAR(10),

    quantity DECIMAL(15, 3) NOT NULL,
    unit VARCHAR(20), -- 'pcs', 'kg', 'ltr', 'hrs', etc.
    rate DECIMAL(15, 2) NOT NULL,

    -- Discount per item
    discount_type VARCHAR(10),
    discount_value DECIMAL(10, 2),
    discount_amount DECIMAL(15, 2) DEFAULT 0,

    taxable_amount DECIMAL(15, 2) NOT NULL,

    -- Tax details
    tax_rate DECIMAL(5, 2) NOT NULL, -- GST rate
    cgst_rate DECIMAL(5, 2),
    cgst_amount DECIMAL(15, 2) DEFAULT 0,
    sgst_rate DECIMAL(5, 2),
    sgst_amount DECIMAL(15, 2) DEFAULT 0,
    igst_rate DECIMAL(5, 2),
    igst_amount DECIMAL(15, 2) DEFAULT 0,
    cess_rate DECIMAL(5, 2),
    cess_amount DECIMAL(15, 2) DEFAULT 0,

    total_amount DECIMAL(15, 2) NOT NULL,

    line_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Payments
CREATE TABLE invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    tenant_id UUID NOT NULL,

    payment_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,

    payment_mode VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100),
    bank_account_id UUID,

    notes TEXT,

    -- Linked transaction
    transaction_id UUID,

    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Settings (per tenant)
CREATE TABLE invoice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,

    -- Numbering
    sale_prefix VARCHAR(20) DEFAULT 'INV',
    sale_next_number INT DEFAULT 1,
    purchase_prefix VARCHAR(20) DEFAULT 'BILL',
    purchase_next_number INT DEFAULT 1,

    -- Defaults
    default_due_days INT DEFAULT 30,
    default_notes TEXT,
    default_terms TEXT,

    -- Display
    show_hsn BOOLEAN DEFAULT TRUE,
    show_signature BOOLEAN DEFAULT TRUE,
    signature_url VARCHAR(500),

    -- Bank details for invoices
    bank_details TEXT,

    -- Template
    template_id VARCHAR(50) DEFAULT 'default',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_party ON invoices(party_id);
CREATE INDEX idx_invoices_date ON invoices(tenant_id, invoice_date);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, payment_status);
CREATE INDEX idx_invoices_type ON invoices(tenant_id, invoice_type);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id);
```

### Customer Database (`bookkeep_customer`)

```sql
-- Parties (Customers & Vendors)
CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    party_type VARCHAR(20) NOT NULL, -- 'customer', 'vendor', 'both'

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),

    -- Contact
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),

    -- Tax Info
    gstin VARCHAR(15),
    pan VARCHAR(10),
    tan VARCHAR(10),

    -- Billing Address
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_state_code VARCHAR(2),
    billing_pincode VARCHAR(10),
    billing_country VARCHAR(50) DEFAULT 'India',

    -- Shipping Address (if different)
    shipping_same_as_billing BOOLEAN DEFAULT TRUE,
    shipping_address_line1 VARCHAR(255),
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_state_code VARCHAR(2),
    shipping_pincode VARCHAR(10),

    -- Credit Settings
    credit_limit DECIMAL(15, 2) DEFAULT 0,
    credit_period_days INT DEFAULT 30,

    -- Payment Settings
    default_payment_terms TEXT,

    -- TDS (for vendors)
    tds_applicable BOOLEAN DEFAULT FALSE,
    tds_section VARCHAR(20),
    tds_rate DECIMAL(5, 2),

    -- Balances (denormalized for quick access)
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0, -- Positive = receivable, Negative = payable

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    notes TEXT,

    -- Audit
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Party Contacts (multiple contacts per party)
CREATE TABLE party_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Party Bank Details
CREATE TABLE party_bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

    bank_name VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    account_number_encrypted VARCHAR(500),
    ifsc_code VARCHAR(11),
    branch VARCHAR(255),

    is_primary BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_parties_tenant ON parties(tenant_id);
CREATE INDEX idx_parties_type ON parties(tenant_id, party_type);
CREATE INDEX idx_parties_gstin ON parties(gstin);
CREATE INDEX idx_parties_name ON parties(tenant_id, name);
CREATE INDEX idx_party_contacts_party ON party_contacts(party_id);
```

### Tax Database (`bookkeep_tax`)

```sql
-- GST Tax Rates
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID, -- NULL for system defaults

    name VARCHAR(100) NOT NULL,
    rate DECIMAL(5, 2) NOT NULL,

    -- Component rates
    cgst_rate DECIMAL(5, 2),
    sgst_rate DECIMAL(5, 2),
    igst_rate DECIMAL(5, 2),
    cess_rate DECIMAL(5, 2),

    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);

-- HSN/SAC Codes
CREATE TABLE hsn_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    type VARCHAR(10) NOT NULL, -- 'hsn', 'sac'

    -- Default GST rate for this code
    default_rate DECIMAL(5, 2),

    chapter VARCHAR(10),
    section VARCHAR(10),

    is_active BOOLEAN DEFAULT TRUE
);

-- GST Returns Data (prepared from transactions)
CREATE TABLE gst_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    return_type VARCHAR(20) NOT NULL, -- 'GSTR1', 'GSTR3B', 'GSTR9'
    period_month INT NOT NULL,
    period_year INT NOT NULL,

    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'prepared', 'filed', 'revised'

    -- Summary amounts
    total_taxable DECIMAL(15, 2),
    total_cgst DECIMAL(15, 2),
    total_sgst DECIMAL(15, 2),
    total_igst DECIMAL(15, 2),
    total_cess DECIMAL(15, 2),

    -- JSON data for detailed breakup
    data JSONB NOT NULL,

    -- Filing info
    arn VARCHAR(50), -- Acknowledgment Reference Number
    filed_at TIMESTAMP,
    filed_by UUID,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- E-Invoice Log
CREATE TABLE einvoice_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    invoice_id UUID NOT NULL,

    action VARCHAR(20) NOT NULL, -- 'generate', 'cancel'

    irn VARCHAR(100),
    ack_number VARCHAR(50),
    ack_date TIMESTAMP,

    request_json JSONB,
    response_json JSONB,

    status VARCHAR(20), -- 'success', 'failed'
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- E-Way Bill Log
CREATE TABLE eway_bill_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    invoice_id UUID,

    eway_bill_number VARCHAR(20),

    action VARCHAR(20) NOT NULL, -- 'generate', 'cancel', 'extend'

    document_type VARCHAR(30),
    document_number VARCHAR(50),
    document_date DATE,

    -- Transport details
    transporter_id VARCHAR(20),
    transporter_name VARCHAR(255),
    vehicle_number VARCHAR(20),
    vehicle_type VARCHAR(20),
    transport_mode VARCHAR(20),
    transport_distance INT,

    valid_from TIMESTAMP,
    valid_until TIMESTAMP,

    request_json JSONB,
    response_json JSONB,

    status VARCHAR(20),
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- TDS Entries
CREATE TABLE tds_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    vendor_id UUID NOT NULL,
    transaction_id UUID,

    section VARCHAR(20) NOT NULL,
    payment_date DATE NOT NULL,

    gross_amount DECIMAL(15, 2) NOT NULL,
    tds_rate DECIMAL(5, 2) NOT NULL,
    tds_amount DECIMAL(15, 2) NOT NULL,
    net_amount DECIMAL(15, 2) NOT NULL,

    is_deposited BOOLEAN DEFAULT FALSE,
    deposit_date DATE,
    challan_number VARCHAR(50),

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tax_rates_tenant ON tax_rates(tenant_id);
CREATE INDEX idx_hsn_codes_code ON hsn_codes(code);
CREATE INDEX idx_gst_returns_tenant ON gst_returns(tenant_id);
CREATE INDEX idx_gst_returns_period ON gst_returns(tenant_id, period_year, period_month);
CREATE INDEX idx_einvoice_log_invoice ON einvoice_log(invoice_id);
CREATE INDEX idx_eway_bill_log_invoice ON eway_bill_log(invoice_id);
CREATE INDEX idx_tds_entries_vendor ON tds_entries(vendor_id);
```

### Inventory Database (`bookkeep_inventory`)

```sql
-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    sku VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    category_id UUID,

    -- Pricing
    purchase_price DECIMAL(15, 2),
    selling_price DECIMAL(15, 2) NOT NULL,
    mrp DECIMAL(15, 2),

    -- Tax
    hsn_code VARCHAR(10),
    tax_rate_id UUID,
    tax_inclusive BOOLEAN DEFAULT FALSE,

    -- Units
    unit VARCHAR(20) DEFAULT 'pcs',

    -- Stock settings
    track_inventory BOOLEAN DEFAULT TRUE,
    low_stock_alert INT DEFAULT 10,

    -- Current stock (denormalized, total across all stores)
    current_stock DECIMAL(15, 3) DEFAULT 0,

    -- Images
    image_urls TEXT[],

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    UNIQUE(tenant_id, sku)
);

-- Product Categories
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    parent_id UUID REFERENCES product_categories(id),

    name VARCHAR(255) NOT NULL,
    description TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Stock by Store
CREATE TABLE stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    store_id UUID NOT NULL,
    tenant_id UUID NOT NULL,

    quantity DECIMAL(15, 3) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(15, 3) DEFAULT 0,
    available_quantity DECIMAL(15, 3) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,

    -- Valuation
    average_cost DECIMAL(15, 2),
    total_value DECIMAL(15, 2),

    last_updated TIMESTAMP DEFAULT NOW(),

    UNIQUE(product_id, store_id)
);

-- Stock Movements
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    store_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),

    movement_type VARCHAR(30) NOT NULL,
    -- 'purchase', 'sale', 'return_in', 'return_out', 'adjustment', 'transfer_in', 'transfer_out', 'opening'

    reference_type VARCHAR(30), -- 'invoice', 'adjustment', 'transfer'
    reference_id UUID,

    quantity DECIMAL(15, 3) NOT NULL, -- Positive for in, negative for out
    unit_cost DECIMAL(15, 2),

    balance_before DECIMAL(15, 3),
    balance_after DECIMAL(15, 3),

    notes TEXT,

    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Stock Transfers (between stores)
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    transfer_number VARCHAR(50) NOT NULL,
    transfer_date DATE NOT NULL,

    from_store_id UUID NOT NULL,
    to_store_id UUID NOT NULL,

    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'in_transit', 'received', 'cancelled'

    notes TEXT,

    created_by UUID NOT NULL,
    received_by UUID,
    received_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stock Transfer Items
CREATE TABLE stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES stock_transfers(id),
    product_id UUID NOT NULL REFERENCES products(id),

    quantity_sent DECIMAL(15, 3) NOT NULL,
    quantity_received DECIMAL(15, 3),

    notes TEXT
);

-- Stock Adjustments
CREATE TABLE stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    store_id UUID NOT NULL,

    adjustment_number VARCHAR(50) NOT NULL,
    adjustment_date DATE NOT NULL,
    reason VARCHAR(100), -- 'damage', 'theft', 'correction', 'opening'

    notes TEXT,

    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Stock Adjustment Items
CREATE TABLE stock_adjustment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id UUID NOT NULL REFERENCES stock_adjustments(id),
    product_id UUID NOT NULL REFERENCES products(id),

    quantity_before DECIMAL(15, 3),
    quantity_adjustment DECIMAL(15, 3) NOT NULL, -- Positive or negative
    quantity_after DECIMAL(15, 3),

    reason TEXT
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_sku ON products(tenant_id, sku);
CREATE INDEX idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX idx_stock_levels_store ON stock_levels(store_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_store ON stock_movements(store_id);
```

### Audit Database (`bookkeep_audit`)

```sql
-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    user_id UUID NOT NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),

    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'view', 'export', 'login', 'logout'
    resource VARCHAR(50) NOT NULL, -- 'transaction', 'invoice', 'customer', etc.
    resource_id UUID,

    -- What changed
    old_value JSONB,
    new_value JSONB,
    changes JSONB, -- Only the fields that changed

    -- Context
    ip_address INET,
    user_agent TEXT,
    request_id UUID,

    -- Metadata
    metadata JSONB,

    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions for each month
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- Continue for other months...

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

## Data Migration & Seeding

### Default Data Seeding

```sql
-- Default Tax Rates (India GST)
INSERT INTO tax_rates (name, rate, cgst_rate, sgst_rate, igst_rate, is_system) VALUES
('GST 0%', 0, 0, 0, 0, TRUE),
('GST 5%', 5, 2.5, 2.5, 5, TRUE),
('GST 12%', 12, 6, 6, 12, TRUE),
('GST 18%', 18, 9, 9, 18, TRUE),
('GST 28%', 28, 14, 14, 28, TRUE);

-- Default Chart of Accounts Template
-- (Created per tenant on registration)
```

### Tally Import Schema

```sql
-- Temporary table for Tally import
CREATE TABLE import_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    import_batch_id UUID NOT NULL,

    source VARCHAR(50), -- 'tally', 'excel', 'quickbooks'
    entity_type VARCHAR(50), -- 'customer', 'transaction', 'invoice'

    raw_data JSONB NOT NULL,
    mapped_data JSONB,

    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'mapped', 'imported', 'failed'
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```
