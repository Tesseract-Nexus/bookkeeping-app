-- BookKeep Database Initialization Script
-- This script sets up the database schema, indexes, and initial data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ==============================================
-- USERS & AUTHENTICATION
-- ==============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;

-- ==============================================
-- TENANTS (BUSINESSES)
-- ==============================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    legal_name VARCHAR(255),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    tan VARCHAR(10),
    cin VARCHAR(21),
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    state_code VARCHAR(2),
    pin_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    financial_year_start INTEGER DEFAULT 4,
    currency VARCHAR(3) DEFAULT 'INR',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    invoice_prefix VARCHAR(20) DEFAULT 'INV',
    invoice_next_number INTEGER DEFAULT 1,
    invoice_terms TEXT,
    invoice_notes TEXT,
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(11),
    bank_branch VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free',
    max_users INTEGER DEFAULT 1,
    max_invoices_per_month INTEGER DEFAULT 50,
    status VARCHAR(20) DEFAULT 'active',
    verified_at TIMESTAMP WITH TIME ZONE,
    logo_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_gstin ON tenants(gstin) WHERE gstin IS NOT NULL AND deleted_at IS NULL;

-- ==============================================
-- ROLES & PERMISSIONS (RBAC)
-- ==============================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    is_system BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_roles_tenant ON roles(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    constraints JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

-- ==============================================
-- TENANT MEMBERS (USER-TENANT MAPPING)
-- ==============================================

CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id),
    email VARCHAR(255),
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id) WHERE deleted_at IS NULL;

-- ==============================================
-- TENANT INVITATIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS tenant_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role_id UUID NOT NULL REFERENCES roles(id),
    token VARCHAR(100) UNIQUE NOT NULL,
    invited_by_id UUID NOT NULL REFERENCES users(id),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenant_invitations_token ON tenant_invitations(token);
CREATE INDEX idx_tenant_invitations_tenant ON tenant_invitations(tenant_id, status);

-- ==============================================
-- PARTIES (CUSTOMERS/VENDORS)
-- ==============================================

CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('customer', 'vendor', 'both')),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    website VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    state_code VARCHAR(2),
    pin_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    credit_limit DECIMAL(15, 2) DEFAULT 0,
    credit_period INTEGER DEFAULT 0,
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_parties_tenant ON parties(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_parties_type ON parties(tenant_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_parties_gstin ON parties(tenant_id, gstin) WHERE gstin IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_parties_name_search ON parties USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL;

-- ==============================================
-- ACCOUNTS (CHART OF ACCOUNTS)
-- ==============================================

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    sub_type VARCHAR(50),
    parent_id UUID REFERENCES accounts(id),
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_accounts_tenant ON accounts(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_type ON accounts(tenant_id, type) WHERE deleted_at IS NULL;

-- ==============================================
-- TRANSACTIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference_number VARCHAR(50),
    party_id UUID REFERENCES parties(id),
    description TEXT,
    narration TEXT,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'posted',
    is_reconciled BOOLEAN DEFAULT FALSE,
    invoice_id UUID,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_transactions_tenant ON transactions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_date ON transactions(tenant_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_type ON transactions(tenant_id, type, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_party ON transactions(tenant_id, party_id) WHERE party_id IS NOT NULL AND deleted_at IS NULL;

-- ==============================================
-- TRANSACTION LINES (DOUBLE-ENTRY)
-- ==============================================

CREATE TABLE IF NOT EXISTS transaction_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transaction_lines_transaction ON transaction_lines(transaction_id);
CREATE INDEX idx_transaction_lines_account ON transaction_lines(account_id);

-- ==============================================
-- INVOICES
-- ==============================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sales', 'purchase', 'credit_note', 'debit_note')),
    party_id UUID NOT NULL REFERENCES parties(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    reference_number VARCHAR(100),
    place_of_supply VARCHAR(100),
    is_reverse_charge BOOLEAN DEFAULT FALSE,
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    discount_type VARCHAR(20),
    taxable_amount DECIMAL(15, 2) DEFAULT 0,
    cgst_amount DECIMAL(15, 2) DEFAULT 0,
    sgst_amount DECIMAL(15, 2) DEFAULT 0,
    igst_amount DECIMAL(15, 2) DEFAULT 0,
    cess_amount DECIMAL(15, 2) DEFAULT 0,
    total_tax_amount DECIMAL(15, 2) DEFAULT 0,
    round_off DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    balance_due DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    notes TEXT,
    terms TEXT,
    is_einvoice_generated BOOLEAN DEFAULT FALSE,
    einvoice_irn VARCHAR(100),
    einvoice_ack_number VARCHAR(50),
    einvoice_ack_date TIMESTAMP WITH TIME ZONE,
    einvoice_signed_qr TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_party ON invoices(tenant_id, party_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_date ON invoices(tenant_id, invoice_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_due ON invoices(tenant_id, due_date) WHERE status != 'paid' AND deleted_at IS NULL;

-- ==============================================
-- INVOICE ITEMS
-- ==============================================

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID,
    description VARCHAR(500) NOT NULL,
    hsn_sac_code VARCHAR(10),
    quantity DECIMAL(15, 3) NOT NULL DEFAULT 1,
    unit VARCHAR(20),
    rate DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    taxable_amount DECIMAL(15, 2) DEFAULT 0,
    cgst_rate DECIMAL(5, 2) DEFAULT 0,
    cgst_amount DECIMAL(15, 2) DEFAULT 0,
    sgst_rate DECIMAL(5, 2) DEFAULT 0,
    sgst_amount DECIMAL(15, 2) DEFAULT 0,
    igst_rate DECIMAL(5, 2) DEFAULT 0,
    igst_amount DECIMAL(15, 2) DEFAULT 0,
    cess_rate DECIMAL(5, 2) DEFAULT 0,
    cess_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ==============================================
-- AUDIT LOGS
-- ==============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    request_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(tenant_id, resource, resource_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at DESC);

-- ==============================================
-- INSERT DEFAULT SYSTEM ROLES
-- ==============================================

INSERT INTO roles (id, name, description, is_system, is_default) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Owner', 'Full access to all features and settings. Can manage team and billing.', true, false),
    ('00000000-0000-0000-0000-000000000002', 'Admin', 'Can manage most features except billing and tenant deletion.', true, false),
    ('00000000-0000-0000-0000-000000000003', 'Accountant', 'Can manage transactions, invoices, reports, and GST. Cannot manage team.', true, false),
    ('00000000-0000-0000-0000-000000000004', 'Staff', 'Can create transactions and invoices. Limited editing rights.', true, true),
    ('00000000-0000-0000-0000-000000000005', 'Viewer', 'Read-only access to view transactions, invoices, and reports.', true, false)
ON CONFLICT DO NOTHING;

-- Owner permissions (all)
INSERT INTO role_permissions (role_id, permission) VALUES
    ('00000000-0000-0000-0000-000000000001', 'dashboard:view'),
    ('00000000-0000-0000-0000-000000000001', 'reports:view'),
    ('00000000-0000-0000-0000-000000000001', 'reports:export'),
    ('00000000-0000-0000-0000-000000000001', 'transaction:view'),
    ('00000000-0000-0000-0000-000000000001', 'transaction:create'),
    ('00000000-0000-0000-0000-000000000001', 'transaction:edit'),
    ('00000000-0000-0000-0000-000000000001', 'transaction:delete'),
    ('00000000-0000-0000-0000-000000000001', 'transaction:approve'),
    ('00000000-0000-0000-0000-000000000001', 'invoice:view'),
    ('00000000-0000-0000-0000-000000000001', 'invoice:create'),
    ('00000000-0000-0000-0000-000000000001', 'invoice:edit'),
    ('00000000-0000-0000-0000-000000000001', 'invoice:delete'),
    ('00000000-0000-0000-0000-000000000001', 'invoice:send'),
    ('00000000-0000-0000-0000-000000000001', 'invoice:void'),
    ('00000000-0000-0000-0000-000000000001', 'party:view'),
    ('00000000-0000-0000-0000-000000000001', 'party:create'),
    ('00000000-0000-0000-0000-000000000001', 'party:edit'),
    ('00000000-0000-0000-0000-000000000001', 'party:delete'),
    ('00000000-0000-0000-0000-000000000001', 'product:view'),
    ('00000000-0000-0000-0000-000000000001', 'product:create'),
    ('00000000-0000-0000-0000-000000000001', 'product:edit'),
    ('00000000-0000-0000-0000-000000000001', 'product:delete'),
    ('00000000-0000-0000-0000-000000000001', 'bank:view'),
    ('00000000-0000-0000-0000-000000000001', 'bank:create'),
    ('00000000-0000-0000-0000-000000000001', 'bank:edit'),
    ('00000000-0000-0000-0000-000000000001', 'bank:reconcile'),
    ('00000000-0000-0000-0000-000000000001', 'gst:view'),
    ('00000000-0000-0000-0000-000000000001', 'gst:file'),
    ('00000000-0000-0000-0000-000000000001', 'gst:export'),
    ('00000000-0000-0000-0000-000000000001', 'settings:view'),
    ('00000000-0000-0000-0000-000000000001', 'settings:edit'),
    ('00000000-0000-0000-0000-000000000001', 'team:view'),
    ('00000000-0000-0000-0000-000000000001', 'team:invite'),
    ('00000000-0000-0000-0000-000000000001', 'team:edit'),
    ('00000000-0000-0000-0000-000000000001', 'team:remove'),
    ('00000000-0000-0000-0000-000000000001', 'role:manage'),
    ('00000000-0000-0000-0000-000000000001', 'tenant:view'),
    ('00000000-0000-0000-0000-000000000001', 'tenant:edit'),
    ('00000000-0000-0000-0000-000000000001', 'tenant:delete'),
    ('00000000-0000-0000-0000-000000000001', 'tenant:billing')
ON CONFLICT DO NOTHING;

-- Staff permissions (basic)
INSERT INTO role_permissions (role_id, permission) VALUES
    ('00000000-0000-0000-0000-000000000004', 'dashboard:view'),
    ('00000000-0000-0000-0000-000000000004', 'transaction:view'),
    ('00000000-0000-0000-0000-000000000004', 'transaction:create'),
    ('00000000-0000-0000-0000-000000000004', 'invoice:view'),
    ('00000000-0000-0000-0000-000000000004', 'invoice:create'),
    ('00000000-0000-0000-0000-000000000004', 'party:view'),
    ('00000000-0000-0000-0000-000000000004', 'party:create'),
    ('00000000-0000-0000-0000-000000000004', 'product:view'),
    ('00000000-0000-0000-0000-000000000004', 'bank:view'),
    ('00000000-0000-0000-0000-000000000004', 'tenant:view')
ON CONFLICT DO NOTHING;

-- Viewer permissions (read-only)
INSERT INTO role_permissions (role_id, permission) VALUES
    ('00000000-0000-0000-0000-000000000005', 'dashboard:view'),
    ('00000000-0000-0000-0000-000000000005', 'reports:view'),
    ('00000000-0000-0000-0000-000000000005', 'transaction:view'),
    ('00000000-0000-0000-0000-000000000005', 'invoice:view'),
    ('00000000-0000-0000-0000-000000000005', 'party:view'),
    ('00000000-0000-0000-0000-000000000005', 'product:view'),
    ('00000000-0000-0000-0000-000000000005', 'bank:view'),
    ('00000000-0000-0000-0000-000000000005', 'gst:view'),
    ('00000000-0000-0000-0000-000000000005', 'tenant:view')
ON CONFLICT DO NOTHING;

-- ==============================================
-- FUNCTIONS & TRIGGERS
-- ==============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
        ', t, t, t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Balance update function for transactions
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE accounts
        SET current_balance = current_balance + NEW.debit_amount - NEW.credit_amount
        WHERE id = NEW.account_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE accounts
        SET current_balance = current_balance - OLD.debit_amount + OLD.credit_amount
        WHERE id = OLD.account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_balance_on_transaction_line
AFTER INSERT OR DELETE ON transaction_lines
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

COMMIT;
