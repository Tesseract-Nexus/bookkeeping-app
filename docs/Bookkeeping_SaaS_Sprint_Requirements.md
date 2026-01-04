# Bookkeeping SaaS Platform
## Sprint Development Requirements & Technical Specifications
### 5-Sprint Development Plan (20 Weeks)

**Version 1.0 | January 2026**

---

## Sprint Overview

| Sprint | Duration | Focus Area | Story Points |
|--------|----------|------------|--------------|
| Sprint 1 | 4 weeks | Foundation & Authentication | 120 points |
| Sprint 2 | 4 weeks | Core Accounting (COA, GL, Contacts) | 130 points |
| Sprint 3 | 4 weeks | Invoicing & Bills (AR/AP) | 140 points |
| Sprint 4 | 4 weeks | Banking & Tax (GST India/Australia) | 150 points |
| Sprint 5 | 4 weeks | Reporting & Dashboard | 130 points |

**Total: 670 Story Points over 20 Weeks**

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React.js with TypeScript | 18.x / 5.x |
| UI Framework | Tailwind CSS + shadcn/ui | 3.x / Latest |
| State Management | Redux Toolkit + RTK Query | 2.x |
| Backend | Node.js with NestJS | 20.x LTS / 10.x |
| Database | PostgreSQL | 16.x |
| ORM | Prisma | 5.x |
| Cache | Redis | 7.x |
| Authentication | JWT + Passport.js | Latest |
| API Documentation | Swagger/OpenAPI | 3.0 |
| Testing | Jest + Cypress | 29.x / 13.x |
| Cloud | AWS (Mumbai + Sydney) | - |
| Container | Docker + Kubernetes | Latest |

---

# SPRINT 1: Foundation & Authentication

**Duration: 4 Weeks | Story Points: 120**

## Sprint 1 Goals

- Set up project infrastructure and CI/CD pipeline
- Implement complete authentication system with MFA
- Build organization/company management module
- Implement role-based access control (RBAC)
- Create base UI components and layout

---

## User Stories - Sprint 1

### US-1.1: User Registration

| Field | Details |
|-------|---------|
| Story ID | US-1.1 |
| Story Points | 8 |
| Priority | P0 - Critical |
| User Story | As a new user, I want to register an account with my email, So that I can access the bookkeeping platform. |

**Acceptance Criteria:**
1. User can register with email, password, full name, phone
2. Email validation with OTP (6-digit, 10-min expiry)
3. Password: min 8 chars, 1 uppercase, 1 number, 1 special
4. Phone: support +91 (India) and +61 (Australia) formats
5. Terms & Privacy acceptance checkbox required
6. Duplicate email shows appropriate error
7. Success redirects to onboarding wizard

---

### US-1.2: User Login

| Field | Details |
|-------|---------|
| Story ID | US-1.2 |
| Story Points | 5 |
| Priority | P0 - Critical |
| User Story | As a registered user, I want to login securely, So that I can access my account. |

**Acceptance Criteria:**
1. Login with email and password
2. Remember me option (30-day token)
3. Account lockout after 5 failed attempts (15 min)
4. Session timeout after 30 min inactivity
5. Login from new device triggers email notification
6. Support Google OAuth login
7. Support Microsoft OAuth login

---

### US-1.3: Multi-Factor Authentication

| Field | Details |
|-------|---------|
| Story ID | US-1.3 |
| Story Points | 8 |
| Priority | P0 - Critical |
| User Story | As a security-conscious user, I want to enable MFA on my account, So that my financial data is protected. |

**Acceptance Criteria:**
1. Support TOTP authenticator apps (Google Auth, Authy)
2. Support SMS OTP as backup method
3. Generate 10 backup codes on MFA setup
4. Allow MFA to be mandatory at org level
5. Trusted device management (skip MFA for 30 days)
6. MFA recovery flow with identity verification

---

### US-1.4: Password Recovery

| Field | Details |
|-------|---------|
| Story ID | US-1.4 |
| Story Points | 5 |
| Priority | P0 - Critical |
| User Story | As a user who forgot my password, I want to reset it securely, So that I can regain access to my account. |

**Acceptance Criteria:**
1. Request reset via email
2. Reset link valid for 1 hour, single use
3. Rate limit: 3 requests per hour
4. New password cannot match last 5 passwords
5. All active sessions invalidated on reset
6. Email confirmation after successful reset

---

### US-1.5: Organization Setup

| Field | Details |
|-------|---------|
| Story ID | US-1.5 |
| Story Points | 13 |
| Priority | P0 - Critical |
| User Story | As a business owner, I want to set up my organization profile, So that my business information is configured correctly. |

**Acceptance Criteria:**
1. Capture: Business name, type, industry, address
2. Select country: India or Australia
3. India: Capture GSTIN with validation via API
4. Australia: Capture ABN with validation via ABR
5. Set fiscal year (Apr-Mar India, Jul-Jun Australia)
6. Upload company logo (PNG/JPG, max 2MB)
7. Set base currency (INR/AUD) - cannot change later
8. Configure date format (DD/MM/YYYY)
9. Set timezone (IST/AEST/AEDT)

---

### US-1.6: User Roles & Permissions

| Field | Details |
|-------|---------|
| Story ID | US-1.6 |
| Story Points | 13 |
| Priority | P0 - Critical |
| User Story | As an organization admin, I want to manage user roles and permissions, So that team members have appropriate access. |

**Acceptance Criteria:**
1. Predefined roles: Owner, Admin, Accountant, Staff, Viewer
2. Owner: Full access, cannot be deleted, transfers ownership
3. Admin: All except ownership transfer and billing
4. Accountant: Full accounting access, no user management
5. Staff: Create transactions, no reports/settings
6. Viewer: Read-only access to assigned modules
7. Invite users via email with role assignment
8. Audit log for all permission changes

---

### US-1.7: Multi-Company Support

| Field | Details |
|-------|---------|
| Story ID | US-1.7 |
| Story Points | 8 |
| Priority | P1 - High |
| User Story | As an accountant or business owner, I want to manage multiple companies, So that I can handle different businesses from one account. |

**Acceptance Criteria:**
1. Create up to 10 companies per account (configurable)
2. Quick company switcher in header
3. Each company has isolated data
4. Different users can have different roles per company
5. Company-specific settings and preferences
6. Archive/deactivate company option

---

### US-1.8: Audit Trail

| Field | Details |
|-------|---------|
| Story ID | US-1.8 |
| Story Points | 8 |
| Priority | P0 - Critical |
| User Story | As a compliance officer, I want to view audit logs of all actions, So that I can track changes for compliance. |

**Acceptance Criteria:**
1. Log: who, what, when, where (IP), before/after values
2. Immutable logs stored in separate audit schema
3. Filter by user, action type, date range, entity
4. Export audit logs to CSV/PDF
5. Retain logs for 7 years minimum
6. Alert on suspicious activities (bulk deletes, etc.)

---

## Sprint 1 - Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  phone_country_code VARCHAR(5),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  mfa_backup_codes TEXT[],
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, deleted
  last_login_at TIMESTAMP,
  last_login_ip INET,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  password_changed_at TIMESTAMP,
  password_history TEXT[], -- Last 5 hashes
  timezone VARCHAR(50) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en',
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Organizations Table

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(200),
  business_type VARCHAR(50), -- sole_proprietor, partnership, company, llp, trust
  industry VARCHAR(100),
  country_code VARCHAR(2) NOT NULL, -- IN, AU
  base_currency VARCHAR(3) NOT NULL, -- INR, AUD
  fiscal_year_start_month INT NOT NULL, -- 4 for India (April), 7 for Australia (July)
  
  -- Address
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  
  -- Tax Registration
  tax_registration_number VARCHAR(50), -- GSTIN for India, ABN for Australia
  tax_registration_verified BOOLEAN DEFAULT FALSE,
  gst_registered BOOLEAN DEFAULT FALSE,
  composition_scheme BOOLEAN DEFAULT FALSE, -- India specific
  
  -- Branding
  logo_url VARCHAR(500),
  primary_color VARCHAR(7), -- Hex color
  
  -- Settings
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  timezone VARCHAR(50),
  number_format VARCHAR(20) DEFAULT 'indian', -- indian (lakhs), western (millions)
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  subscription_plan VARCHAR(50) DEFAULT 'trial',
  subscription_expires_at TIMESTAMP,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Organization Members Table

```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- owner, admin, accountant, staff, viewer
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended
  permissions JSONB DEFAULT '{}', -- Custom permission overrides
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

### Sessions Table

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  device_info JSONB, -- browser, os, device type
  ip_address INET,
  location JSONB, -- city, country from IP
  is_trusted BOOLEAN DEFAULT FALSE,
  trusted_until TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_active_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- create, update, delete, login, logout, etc.
  entity_type VARCHAR(50) NOT NULL, -- user, organization, invoice, etc.
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB, -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

---

## Sprint 1 - API Endpoints

### Authentication APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/auth/register | Register new user | Public |
| POST | /api/v1/auth/verify-email | Verify email with OTP | Public |
| POST | /api/v1/auth/login | Login with credentials | Public |
| POST | /api/v1/auth/logout | Logout current session | Bearer |
| POST | /api/v1/auth/refresh-token | Refresh access token | Refresh Token |
| POST | /api/v1/auth/forgot-password | Request password reset | Public |
| POST | /api/v1/auth/reset-password | Reset password with token | Public |
| POST | /api/v1/auth/mfa/setup | Initialize MFA setup | Bearer |
| POST | /api/v1/auth/mfa/verify | Verify MFA code | Bearer |
| POST | /api/v1/auth/mfa/disable | Disable MFA | Bearer + MFA |
| POST | /api/v1/auth/oauth/google | Google OAuth callback | OAuth |
| POST | /api/v1/auth/oauth/microsoft | Microsoft OAuth callback | OAuth |

### User APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/users/me | Get current user profile | Bearer |
| PATCH | /api/v1/users/me | Update user profile | Bearer |
| POST | /api/v1/users/me/avatar | Upload avatar | Bearer |
| POST | /api/v1/users/me/change-password | Change password | Bearer |
| GET | /api/v1/users/me/sessions | List active sessions | Bearer |
| DELETE | /api/v1/users/me/sessions/:id | Revoke specific session | Bearer |

### Organization APIs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | /api/v1/organizations | Create organization | Any User |
| GET | /api/v1/organizations | List user's organizations | Any User |
| GET | /api/v1/organizations/:id | Get organization details | Member |
| PATCH | /api/v1/organizations/:id | Update organization | Admin+ |
| DELETE | /api/v1/organizations/:id | Delete organization | Owner |
| POST | /api/v1/organizations/:id/logo | Upload logo | Admin+ |
| POST | /api/v1/organizations/:id/validate-gstin | Validate GSTIN | Admin+ |
| POST | /api/v1/organizations/:id/validate-abn | Validate ABN | Admin+ |
| GET | /api/v1/organizations/:id/members | List members | Member |
| POST | /api/v1/organizations/:id/members/invite | Invite member | Admin+ |
| PATCH | /api/v1/organizations/:id/members/:userId | Update member role | Admin+ |
| DELETE | /api/v1/organizations/:id/members/:userId | Remove member | Admin+ |
| GET | /api/v1/organizations/:id/audit-logs | Get audit logs | Admin+ |

---

## Sprint 1 - UI Components

| Page | Components | Route |
|------|------------|-------|
| Registration | Form, OTP Modal, Password Strength Indicator | /register |
| Login | Form, Social Login Buttons, Remember Me | /login |
| Forgot Password | Email Form, Success Message | /forgot-password |
| Reset Password | New Password Form, Validation | /reset-password/:token |
| MFA Setup | QR Code, TOTP Input, Backup Codes | /settings/security/mfa |
| Onboarding Wizard | Multi-step Form, Progress Bar | /onboarding |
| Dashboard Shell | Sidebar, Header, Company Switcher | /dashboard |
| Organization Settings | Form Tabs, Logo Upload, Tax Config | /settings/organization |
| Team Members | Table, Invite Modal, Role Select | /settings/team |
| User Profile | Profile Form, Avatar Upload, Sessions | /settings/profile |
| Audit Logs | Filterable Table, Export Button | /settings/audit-logs |

---

## Sprint 1 - Testing Requirements

### Unit Tests
- Password hashing and validation functions
- JWT token generation and verification
- TOTP generation and validation
- GSTIN/ABN validation logic
- Permission checking functions
- Input validation schemas

### Integration Tests
- Full registration flow with email verification
- Login with MFA flow
- Password reset flow
- Organization CRUD operations
- Member invitation and acceptance flow
- RBAC permission enforcement

### E2E Tests (Cypress)
- New user registration and onboarding
- Returning user login with different scenarios
- Organization setup wizard
- Team member management
- Company switching

---

# SPRINT 2: Core Accounting (COA, GL, Contacts)

**Duration: 4 Weeks | Story Points: 130**

## Sprint 2 Goals

- Implement Chart of Accounts with India/Australia templates
- Build General Ledger with journal entry system
- Create Customer and Vendor management modules
- Implement fiscal period management
- Build product/service catalog foundation

---

## User Stories - Sprint 2

### US-2.1: Chart of Accounts Setup

| Field | Details |
|-------|---------|
| Story ID | US-2.1 |
| Story Points | 13 |
| Priority | P0 - Critical |
| User Story | As a business owner, I want a pre-configured chart of accounts, So that I can start recording transactions quickly. |

**Acceptance Criteria:**
1. India template with Schedule III compliant structure
2. Australia template with standard BAS-ready accounts
3. Account types: Asset, Liability, Equity, Revenue, Expense
4. Sub-types: Current Asset, Fixed Asset, Current Liability, etc.
5. System accounts (locked): Retained Earnings, Opening Balance
6. Account code auto-generation with configurable format
7. Hierarchical parent-child relationships up to 5 levels
8. Tax code assignment to accounts
9. Account activation/deactivation (not delete if has transactions)

---

### US-2.2: Custom Account Creation

| Field | Details |
|-------|---------|
| Story ID | US-2.2 |
| Story Points | 8 |
| Priority | P0 - Critical |
| User Story | As an accountant, I want to create custom accounts, So that I can track specific categories for my business. |

**Acceptance Criteria:**
1. Create account with: code, name, type, sub-type, parent
2. Unique account code validation within organization
3. Optional: description, tax code, currency (for multi-currency)
4. Bank/Cash accounts require additional bank details
5. Control accounts for AR/AP auto-selected
6. Edit account (name, description) - not type if has transactions
7. Merge duplicate accounts with transaction migration
8. Import accounts from CSV/Excel

---

### US-2.3: Journal Entry Creation

| Field | Details |
|-------|---------|
| Story ID | US-2.3 |
| Story Points | 13 |
| Priority | P0 - Critical |
| User Story | As an accountant, I want to create manual journal entries, So that I can record adjustments and corrections. |

**Acceptance Criteria:**
1. Entry date, reference number (auto/manual), narration
2. Multiple debit/credit lines (minimum 2)
3. Total debits must equal total credits (balanced)
4. Attach supporting documents (PDF, images)
5. Draft/Posted status for entries
6. Cannot post to locked periods
7. Entry reversal creates opposite entry with reference
8. Clone/duplicate entry functionality
9. Audit trail for all changes

---

### US-2.4: Recurring Journal Entries

| Field | Details |
|-------|---------|
| Story ID | US-2.4 |
| Story Points | 8 |
| Priority | P1 - High |
| User Story | As an accountant, I want to set up recurring journal entries, So that regular transactions are automated. |

**Acceptance Criteria:**
1. Frequency: Daily, Weekly, Monthly, Quarterly, Yearly
2. Start date and optional end date
3. Auto-post or review before posting option
4. Skip weekends/holidays option
5. Email notification on creation
6. View upcoming scheduled entries
7. Pause/resume recurring entry
8. Edit template without affecting posted entries

---

### US-2.5: Customer Management

| Field | Details |
|-------|---------|
| Story ID | US-2.5 |
| Story Points | 13 |
| Priority | P0 - Critical |
| User Story | As a business user, I want to manage customer information, So that I can create invoices and track receivables. |

**Acceptance Criteria:**
1. Customer: Name (individual/business), display name
2. Contact: Email, phone, website
3. Multiple addresses: Billing, Shipping
4. India: GSTIN validation, Place of Supply state
5. Australia: ABN validation
6. Default payment terms (Net 7, 15, 30, 45, 60, custom)
7. Default currency for multi-currency
8. Credit limit setting
9. Customer since date, notes field
10. Contact persons (multiple per customer)
11. Customer portal access toggle
12. Import from CSV with mapping

---

### US-2.6: Vendor Management

| Field | Details |
|-------|---------|
| Story ID | US-2.6 |
| Story Points | 13 |
| Priority | P0 - Critical |
| User Story | As a business user, I want to manage vendor information, So that I can track bills and payables. |

**Acceptance Criteria:**
1. Vendor: Name, display name, company type
2. Contact details and addresses
3. India: GSTIN, TDS applicable flag, TDS section
4. Australia: ABN, GST registered flag
5. Default expense account for quick bill entry
6. Payment terms and currency
7. Bank details for payments
8. MSME registration (India) for 45-day payment tracking
9. 1099 eligible flag (for future US expansion)
10. Vendor portal access
11. Import/Export functionality

---

### US-2.7: Product/Service Catalog

| Field | Details |
|-------|---------|
| Story ID | US-2.7 |
| Story Points | 13 |
| Priority | P1 - High |
| User Story | As a business user, I want to maintain a product/service catalog, So that I can quickly add items to invoices and bills. |

**Acceptance Criteria:**
1. Type: Product (goods), Service
2. Name, SKU/code, description
3. Unit of measure (UoM) with custom options
4. Selling price and cost price
5. Income account and expense account mapping
6. India: HSN code (goods), SAC code (services)
7. Default tax rate/code
8. Active/inactive status
9. Product category/grouping
10. Import from CSV

---

### US-2.8: Fiscal Period Management

| Field | Details |
|-------|---------|
| Story ID | US-2.8 |
| Story Points | 8 |
| Priority | P0 - Critical |
| User Story | As an accountant, I want to manage fiscal periods, So that I can control when transactions can be posted. |

**Acceptance Criteria:**
1. Auto-generate 12 monthly periods per fiscal year
2. Period status: Open, Closed, Locked
3. Close period: Prevents new transactions
4. Lock period: Prevents any modifications
5. Year-end closing with P&L to Retained Earnings
6. Adjustment period for year-end entries
7. Warning when posting to previous period
8. Admin can reopen closed (not locked) periods

---

## Sprint 2 - Database Schema

### Accounts (Chart of Accounts) Table

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES accounts(id),
  
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  account_type VARCHAR(20) NOT NULL, -- asset, liability, equity, revenue, expense
  account_subtype VARCHAR(50), -- current_asset, fixed_asset, bank, accounts_receivable, etc.
  
  -- Classification
  is_system_account BOOLEAN DEFAULT FALSE, -- Cannot be deleted
  is_control_account BOOLEAN DEFAULT FALSE, -- AR/AP control accounts
  is_bank_account BOOLEAN DEFAULT FALSE,
  is_cash_account BOOLEAN DEFAULT FALSE,
  
  -- Bank Details (if bank account)
  bank_name VARCHAR(200),
  bank_account_number VARCHAR(50),
  bank_branch VARCHAR(200),
  bank_ifsc VARCHAR(20), -- India
  bank_bsb VARCHAR(10), -- Australia
  
  -- Tax
  default_tax_code_id UUID, -- References tax_codes
  
  -- Multi-currency
  currency_code VARCHAR(3),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Reporting
  report_group VARCHAR(50), -- For grouping in financial statements
  display_order INT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, code)
);
```

### Journal Entries Table

```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  entry_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL,
  
  reference VARCHAR(100),
  narration TEXT,
  
  -- Source
  source_type VARCHAR(50) DEFAULT 'manual', -- manual, invoice, bill, payment, bank, etc.
  source_id UUID, -- Reference to source document
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- draft, posted, reversed
  posted_at TIMESTAMP,
  posted_by UUID REFERENCES users(id),
  
  -- Reversal
  is_reversal BOOLEAN DEFAULT FALSE,
  reversed_entry_id UUID REFERENCES journal_entries(id),
  reversal_reason TEXT,
  
  -- Totals (denormalized for performance)
  total_debit DECIMAL(18,2) NOT NULL,
  total_credit DECIMAL(18,2) NOT NULL,
  
  -- Recurring
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_template_id UUID,
  
  -- Period
  fiscal_period_id UUID REFERENCES fiscal_periods(id),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, entry_number)
);
```

### Journal Entry Lines Table

```sql
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  
  line_number INT NOT NULL,
  account_id UUID REFERENCES accounts(id) NOT NULL,
  
  description TEXT,
  
  debit_amount DECIMAL(18,2) DEFAULT 0,
  credit_amount DECIMAL(18,2) DEFAULT 0,
  
  -- Multi-currency
  currency_code VARCHAR(3),
  exchange_rate DECIMAL(18,6) DEFAULT 1,
  base_debit_amount DECIMAL(18,2) DEFAULT 0,
  base_credit_amount DECIMAL(18,2) DEFAULT 0,
  
  -- Tax
  tax_code_id UUID,
  tax_amount DECIMAL(18,2) DEFAULT 0,
  
  -- Tracking
  contact_id UUID, -- Customer or Vendor
  project_id UUID,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Contacts Table

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  contact_type VARCHAR(20) NOT NULL, -- customer, vendor, both
  contact_name VARCHAR(200) NOT NULL,
  display_name VARCHAR(200),
  company_name VARCHAR(200),
  
  -- Contact Info
  email VARCHAR(255),
  phone VARCHAR(30),
  mobile VARCHAR(30),
  website VARCHAR(500),
  
  -- Tax Registration
  tax_number VARCHAR(50), -- GSTIN (India) or ABN (Australia)
  tax_number_verified BOOLEAN DEFAULT FALSE,
  gst_registered BOOLEAN DEFAULT FALSE,
  place_of_supply VARCHAR(50), -- State code for India
  
  -- TDS (India specific)
  tds_applicable BOOLEAN DEFAULT FALSE,
  tds_section VARCHAR(20),
  pan_number VARCHAR(20),
  
  -- MSME (India specific)
  is_msme BOOLEAN DEFAULT FALSE,
  msme_registration_number VARCHAR(50),
  
  -- Defaults
  default_currency VARCHAR(3),
  default_payment_terms INT, -- Days
  credit_limit DECIMAL(18,2),
  default_account_id UUID REFERENCES accounts(id),
  
  -- Portal Access
  portal_enabled BOOLEAN DEFAULT FALSE,
  portal_email VARCHAR(255),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Products Table

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  product_type VARCHAR(20) NOT NULL, -- goods, service
  
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50),
  description TEXT,
  
  -- Pricing
  selling_price DECIMAL(18,2),
  cost_price DECIMAL(18,2),
  
  -- Unit
  unit_of_measure VARCHAR(50),
  
  -- Accounts
  income_account_id UUID REFERENCES accounts(id),
  expense_account_id UUID REFERENCES accounts(id),
  
  -- Tax
  hsn_sac_code VARCHAR(20), -- HSN for goods, SAC for services (India)
  default_tax_code_id UUID,
  
  -- Category
  category VARCHAR(100),
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Sprint 2 - API Endpoints

### Chart of Accounts APIs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | /api/v1/accounts | List all accounts | Staff+ |
| GET | /api/v1/accounts/tree | Get hierarchical tree | Staff+ |
| POST | /api/v1/accounts | Create account | Accountant+ |
| GET | /api/v1/accounts/:id | Get account details | Staff+ |
| PATCH | /api/v1/accounts/:id | Update account | Accountant+ |
| DELETE | /api/v1/accounts/:id | Delete account | Admin+ |
| POST | /api/v1/accounts/import | Import from CSV | Accountant+ |
| GET | /api/v1/accounts/:id/transactions | Get account transactions | Staff+ |
| GET | /api/v1/accounts/:id/balance | Get account balance | Staff+ |

### Journal Entry APIs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | /api/v1/journal-entries | List entries | Staff+ |
| POST | /api/v1/journal-entries | Create entry | Staff+ |
| GET | /api/v1/journal-entries/:id | Get entry details | Staff+ |
| PATCH | /api/v1/journal-entries/:id | Update draft entry | Staff+ |
| DELETE | /api/v1/journal-entries/:id | Delete draft entry | Accountant+ |
| POST | /api/v1/journal-entries/:id/post | Post entry | Accountant+ |
| POST | /api/v1/journal-entries/:id/reverse | Reverse entry | Accountant+ |
| POST | /api/v1/journal-entries/:id/clone | Clone entry | Staff+ |

### Contacts APIs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | /api/v1/contacts | List contacts | Staff+ |
| GET | /api/v1/contacts/customers | List customers only | Staff+ |
| GET | /api/v1/contacts/vendors | List vendors only | Staff+ |
| POST | /api/v1/contacts | Create contact | Staff+ |
| GET | /api/v1/contacts/:id | Get contact details | Staff+ |
| PATCH | /api/v1/contacts/:id | Update contact | Staff+ |
| DELETE | /api/v1/contacts/:id | Delete contact | Admin+ |
| POST | /api/v1/contacts/import | Import contacts | Accountant+ |
| GET | /api/v1/contacts/:id/transactions | Contact transactions | Staff+ |
| GET | /api/v1/contacts/:id/balance | Contact balance | Staff+ |

### Products APIs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | /api/v1/products | List products | Staff+ |
| POST | /api/v1/products | Create product | Staff+ |
| GET | /api/v1/products/:id | Get product details | Staff+ |
| PATCH | /api/v1/products/:id | Update product | Staff+ |
| DELETE | /api/v1/products/:id | Delete product | Admin+ |
| POST | /api/v1/products/import | Import products | Accountant+ |

---

# SPRINT 3: Invoicing & Bills (AR/AP)

**Duration: 4 Weeks | Story Points: 140**

## Sprint 3 Goals

- Build complete invoicing module with GST compliance
- Implement bill entry and expense tracking
- Create payment recording for both AR and AP
- Build credit notes and debit notes functionality
- Implement aging reports for receivables and payables

---

## User Stories - Sprint 3

### US-3.1: Invoice Creation

| Field | Details |
|-------|---------|
| Story ID | US-3.1 |
| Story Points | 13 |
| Priority | P0 - Critical |
| User Story | As a business user, I want to create professional invoices, So that I can bill my customers. |

**Acceptance Criteria:**
1. Select customer (auto-populate defaults)
2. Invoice date, due date (from payment terms)
3. Invoice number auto-generation with prefix
4. Add line items: product/service, description, qty, rate
5. India: HSN/SAC, GST calculation (CGST+SGST or IGST)
6. Australia: GST 10% or GST-free
7. Discount: per line or total (%, amount)
8. Multiple tax rates on same invoice
9. Notes and terms sections
10. Draft/Sent/Paid status workflow
11. Reference/PO number field

---

### US-3.2: Invoice PDF Generation

| Field | Details |
|-------|---------|
| Story ID | US-3.2 |
| Story Points | 8 |
| Priority | P0 - Critical |
| User Story | As a business user, I want to generate PDF invoices, So that I can send them to customers. |

**Acceptance Criteria:**
1. Professional template with company branding
2. India: GST-compliant format with all mandatory fields
3. Australia: Tax Invoice format with ABN
4. QR code for invoice details (India e-invoice ready)
5. Customizable template selection
6. Amount in words
7. Bank details for payment
8. Terms and conditions
9. Digital signature placeholder
10. Download and email options

---

### US-3.3: Invoice Email Delivery

| Field | Details |
|-------|---------|
| Story ID | US-3.3 |
| Story Points | 8 |
| Priority | P0 - Critical |
| User Story | As a business user, I want to email invoices to customers, So that they receive them quickly. |

**Acceptance Criteria:**
1. Send to customer email(s), CC/BCC options
2. Customizable email subject and body
3. PDF attachment
4. Track email sent/delivered/opened status
5. Resend option
6. Email template management
7. Bulk email for multiple invoices
8. Schedule send option

---

### US-3.4: Payment Recording (AR)

| Field | Details |
|-------|---------|
| Story ID | US-3.4 |
| Story Points | 13 |
| Priority | P0 - Critical |
| User Story | As an accountant, I want to record customer payments, So that I can track receivables accurately. |

**Acceptance Criteria:**
1. Payment date, amount, reference number
2. Payment method: Cash, Bank, UPI, Card, Cheque
3. Deposit to account selection
4. Apply to specific invoices or oldest first
5. Partial payment support
6. Overpayment creates credit balance
7. Auto-update invoice status (Partial/Paid)
8. Generate receipt
9. Payment reversal/void option
10. Multi-currency payment with exchange rate

---

### US-3.5: Bill Entry

| Field | Details |
|-------|---------|
| Story ID | US-3.5 |
| Story Points | 13 |
| Priority | P0 - Critical |
| User Story | As an accountant, I want to enter vendor bills, So that I can track payables. |

**Acceptance Criteria:**
1. Select vendor, bill date, due date
2. Vendor invoice number (unique per vendor)
3. Line items with expense account mapping
4. GST: Capture CGST/SGST/IGST from vendor invoice
5. ITC eligible/ineligible flag per line
6. Reverse Charge Mechanism (RCM) handling
7. India: TDS applicable with section selection
8. Attach bill image/PDF
9. Draft/Approved/Paid workflow
10. Clone from previous bill

---

### US-3.6: Bill Payment

| Field | Details |
|-------|---------|
| Story ID | US-3.6 |
| Story Points | 13 |
| Priority | P0 - Critical |
| User Story | As an accountant, I want to record bill payments, So that I can track payables accurately. |

**Acceptance Criteria:**
1. Payment date, amount, reference
2. Payment method selection
3. Pay from bank account selection
4. Apply to specific bills or oldest first
5. Partial payment support
6. India: TDS deduction at payment time
7. Generate payment voucher
8. Batch payment for multiple bills
9. Payment reversal option
10. MSME payment tracking (India)

---

### US-3.7: Credit Notes

| Field | Details |
|-------|---------|
| Story ID | US-3.7 |
| Story Points | 8 |
| Priority | P1 - High |
| User Story | As an accountant, I want to issue credit notes, So that I can handle returns and adjustments. |

**Acceptance Criteria:**
1. Link to original invoice (optional)
2. Credit note number auto-generation
3. Reason for credit note
4. Line items with GST adjustment
5. Apply to outstanding invoices or refund
6. GST compliant credit note format
7. Email to customer option
8. Credit balance tracking per customer

---

### US-3.8: Recurring Invoices

| Field | Details |
|-------|---------|
| Story ID | US-3.8 |
| Story Points | 8 |
| Priority | P1 - High |
| User Story | As a business user, I want to set up recurring invoices, So that regular billing is automated. |

**Acceptance Criteria:**
1. Create from existing invoice or template
2. Frequency: Weekly, Monthly, Quarterly, Yearly
3. Start date, optional end date or occurrences
4. Auto-send or draft for review
5. Price escalation option (annual increase %)
6. View upcoming scheduled invoices
7. Skip/pause individual occurrences
8. Edit template without affecting generated invoices

---

## Sprint 3 - Database Schema

### Invoices Table

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  customer_id UUID REFERENCES contacts(id) NOT NULL,
  
  -- Addresses (snapshot at invoice time)
  billing_address JSONB,
  shipping_address JSONB,
  
  -- Reference
  reference_number VARCHAR(100), -- PO number, etc.
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- draft, sent, viewed, partial, paid, overdue, void
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  
  -- Amounts
  subtotal DECIMAL(18,2) NOT NULL,
  discount_type VARCHAR(10), -- percent, amount
  discount_value DECIMAL(18,2) DEFAULT 0,
  discount_amount DECIMAL(18,2) DEFAULT 0,
  
  -- Tax (India specific)
  cgst_amount DECIMAL(18,2) DEFAULT 0,
  sgst_amount DECIMAL(18,2) DEFAULT 0,
  igst_amount DECIMAL(18,2) DEFAULT 0,
  cess_amount DECIMAL(18,2) DEFAULT 0,
  
  -- Tax (Australia)
  gst_amount DECIMAL(18,2) DEFAULT 0,
  
  total_tax DECIMAL(18,2) DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL,
  
  -- Payment
  amount_paid DECIMAL(18,2) DEFAULT 0,
  balance_due DECIMAL(18,2) NOT NULL,
  
  -- Multi-currency
  currency_code VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(18,6) DEFAULT 1,
  
  -- India GST
  place_of_supply VARCHAR(50),
  reverse_charge BOOLEAN DEFAULT FALSE,
  
  -- E-invoice (India)
  irn VARCHAR(100),
  irn_generated_at TIMESTAMP,
  qr_code TEXT,
  
  -- Notes
  notes TEXT,
  terms TEXT,
  
  -- Recurring
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_template_id UUID,
  
  -- Journal
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, invoice_number)
);
```

### Invoice Lines Table

```sql
CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  line_number INT NOT NULL,
  
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  
  hsn_sac_code VARCHAR(20),
  
  quantity DECIMAL(18,4) NOT NULL,
  unit_of_measure VARCHAR(50),
  unit_price DECIMAL(18,4) NOT NULL,
  
  -- Discount
  discount_type VARCHAR(10),
  discount_value DECIMAL(18,2) DEFAULT 0,
  discount_amount DECIMAL(18,2) DEFAULT 0,
  
  -- Tax
  tax_code_id UUID,
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(18,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_amount DECIMAL(18,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  igst_amount DECIMAL(18,2) DEFAULT 0,
  gst_rate DECIMAL(5,2) DEFAULT 0, -- Australia
  gst_amount DECIMAL(18,2) DEFAULT 0,
  
  line_total DECIMAL(18,2) NOT NULL,
  
  -- Account
  account_id UUID REFERENCES accounts(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Bills Table

```sql
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  bill_number VARCHAR(50) NOT NULL, -- Our reference
  vendor_invoice_number VARCHAR(100), -- Vendor's invoice number
  
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  vendor_id UUID REFERENCES contacts(id) NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- draft, approved, partial, paid, void
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  
  -- Amounts
  subtotal DECIMAL(18,2) NOT NULL,
  cgst_amount DECIMAL(18,2) DEFAULT 0,
  sgst_amount DECIMAL(18,2) DEFAULT 0,
  igst_amount DECIMAL(18,2) DEFAULT 0,
  gst_amount DECIMAL(18,2) DEFAULT 0,
  total_tax DECIMAL(18,2) DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL,
  
  -- ITC (India)
  itc_eligible_amount DECIMAL(18,2) DEFAULT 0,
  itc_ineligible_amount DECIMAL(18,2) DEFAULT 0,
  
  -- TDS (India)
  tds_applicable BOOLEAN DEFAULT FALSE,
  tds_section VARCHAR(20),
  tds_rate DECIMAL(5,2) DEFAULT 0,
  tds_amount DECIMAL(18,2) DEFAULT 0,
  
  -- RCM
  reverse_charge BOOLEAN DEFAULT FALSE,
  
  -- Payment
  amount_paid DECIMAL(18,2) DEFAULT 0,
  balance_due DECIMAL(18,2) NOT NULL,
  
  currency_code VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(18,6) DEFAULT 1,
  
  notes TEXT,
  
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, bill_number)
);
```

### Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  payment_number VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  
  payment_type VARCHAR(20) NOT NULL, -- receive (AR), pay (AP)
  
  contact_id UUID REFERENCES contacts(id) NOT NULL,
  
  -- Method
  payment_method VARCHAR(30) NOT NULL, -- cash, bank_transfer, upi, card, cheque
  
  -- Account
  account_id UUID REFERENCES accounts(id) NOT NULL, -- Bank/Cash account
  
  -- Amount
  amount DECIMAL(18,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(18,6) DEFAULT 1,
  
  -- Reference
  reference_number VARCHAR(100), -- Cheque no, UTR, etc.
  
  -- TDS (for AP payments in India)
  tds_amount DECIMAL(18,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed', -- completed, voided
  voided_at TIMESTAMP,
  void_reason TEXT,
  
  notes TEXT,
  
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, payment_number)
);

CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  
  document_type VARCHAR(20) NOT NULL, -- invoice, bill, credit_note, debit_note
  document_id UUID NOT NULL,
  
  amount DECIMAL(18,2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Sprint 3 - API Endpoints

### Invoice APIs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | /api/v1/invoices | List invoices | Staff+ |
| POST | /api/v1/invoices | Create invoice | Staff+ |
| GET | /api/v1/invoices/:id | Get invoice details | Staff+ |
| PATCH | /api/v1/invoices/:id | Update draft invoice | Staff+ |
| DELETE | /api/v1/invoices/:id | Delete draft invoice | Accountant+ |
| POST | /api/v1/invoices/:id/send | Send invoice | Staff+ |
| POST | /api/v1/invoices/:id/void | Void invoice | Accountant+ |
| GET | /api/v1/invoices/:id/pdf | Download PDF | Staff+ |
| POST | /api/v1/invoices/:id/clone | Clone invoice | Staff+ |

### Bill APIs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | /api/v1/bills | List bills | Staff+ |
| POST | /api/v1/bills | Create bill | Staff+ |
| GET | /api/v1/bills/:id | Get bill details | Staff+ |
| PATCH | /api/v1/bills/:id | Update draft bill | Staff+ |
| DELETE | /api/v1/bills/:id | Delete draft bill | Accountant+ |
| POST | /api/v1/bills/:id/approve | Approve bill | Accountant+ |
| POST | /api/v1/bills/:id/void | Void bill | Accountant+ |

### Payment APIs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | /api/v1/payments | List payments | Staff+ |
| POST | /api/v1/payments/receive | Record customer payment | Staff+ |
| POST | /api/v1/payments/pay | Record bill payment | Staff+ |
| GET | /api/v1/payments/:id | Get payment details | Staff+ |
| POST | /api/v1/payments/:id/void | Void payment | Accountant+ |
| GET | /api/v1/payments/:id/receipt | Download receipt | Staff+ |

---

# SPRINT 4: Banking & Tax Management

**Duration: 4 Weeks | Story Points: 150**

## Sprint 4 Goals

- Implement bank account management and transactions
- Build bank reconciliation functionality
- Create GST tax configuration and calculation engine
- Build India GST returns data (GSTR-1, GSTR-3B)
- Build Australia BAS preparation
- Implement TDS management (India)

---

## User Stories - Sprint 4

### US-4.1: Bank Account Setup

| Field | Details |
|-------|---------|
| Story ID | US-4.1 |
| Story Points | 8 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. Add bank account with name, account number, bank name
2. India: IFSC code with bank/branch auto-lookup
3. Australia: BSB with validation
4. Account type: Savings, Current, CC, Loan, etc.
5. Opening balance and date
6. Currency setting
7. Link to COA bank account
8. Set as default for payments
9. Deactivate account option

---

### US-4.2: Bank Transaction Import

| Field | Details |
|-------|---------|
| Story ID | US-4.2 |
| Story Points | 13 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. Import from CSV, OFX, QIF formats
2. Column mapping for CSV
3. Duplicate detection by date+amount+reference
4. Transaction status: Unmatched, Matched, Reconciled
5. Preview before import
6. Import history tracking
7. Undo last import option

---

### US-4.3: Bank Reconciliation

| Field | Details |
|-------|---------|
| Story ID | US-4.3 |
| Story Points | 13 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. Enter statement end date and closing balance
2. Show unreconciled transactions
3. Auto-match by amount and date proximity
4. Manual match option for complex matches
5. Create adjustment entries for differences
6. Finalize reconciliation with report
7. Undo finalized reconciliation (admin only)
8. Reconciliation history and reports

---

### US-4.4: GST Configuration (India)

| Field | Details |
|-------|---------|
| Story ID | US-4.4 |
| Story Points | 13 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. Tax codes: GST@0, 5, 12, 18, 28% with CGST+SGST split
2. IGST rates for inter-state
3. Cess configuration (per item)
4. Exempt and Nil-rated tax codes
5. RCM tax codes
6. HSN code master with rate mapping
7. SAC code master with rate mapping
8. State code master for Place of Supply
9. Custom tax code creation

---

### US-4.5: GSTR-1 Data Preparation

| Field | Details |
|-------|---------|
| Story ID | US-4.5 |
| Story Points | 13 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. B2B invoices section with GSTIN-wise summary
2. B2C Large (>2.5L inter-state) section
3. B2C Small section by state
4. Credit/Debit notes linked to invoices
5. Advances received section
6. Nil-rated and exempt supplies
7. HSN-wise summary
8. Document issue summary
9. Export to JSON for GST portal
10. Validation errors report

---

### US-4.6: GSTR-3B Summary

| Field | Details |
|-------|---------|
| Story ID | US-4.6 |
| Story Points | 8 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. Outward supplies summary (taxable, zero-rated, nil, exempt)
2. Inward supplies liable to RCM
3. ITC available breakdown
4. ITC reversed
5. Net tax liability calculation
6. Interest computation for late payment
7. Export to JSON
8. Filing status tracking

---

### US-4.7: BAS Preparation (Australia)

| Field | Details |
|-------|---------|
| Story ID | US-4.7 |
| Story Points | 13 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. GST on sales (G1)
2. GST on purchases (G10, G11)
3. Export sales (G2)
4. GST-free sales (G3)
5. Input taxed sales (G4)
6. Capital acquisitions (G10)
7. Non-capital acquisitions (G11)
8. Adjustments section
9. Net GST payable/refundable
10. PAYG withholding section (if applicable)
11. Export format for ATO/SBR

---

### US-4.8: TDS Management (India)

| Field | Details |
|-------|---------|
| Story ID | US-4.8 |
| Story Points | 13 |
| Priority | P1 - High |

**Acceptance Criteria:**
1. TDS section master (194C, 194J, 194H, etc.)
2. TDS rates by section and threshold
3. PAN verification for vendors
4. Auto TDS calculation on bill payment
5. Lower/NIL deduction certificate tracking
6. TDS payable ledger
7. Form 26Q data generation
8. TDS certificate (Form 16A) generation
9. Challan tracking for TDS deposits

---

## Sprint 4 - Database Schema

### Bank Transactions Table

```sql
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  
  transaction_date DATE NOT NULL,
  value_date DATE,
  
  transaction_type VARCHAR(20), -- debit, credit
  amount DECIMAL(18,2) NOT NULL,
  
  description TEXT,
  reference VARCHAR(100),
  
  -- Matching
  status VARCHAR(20) DEFAULT 'unmatched', -- unmatched, matched, reconciled
  matched_document_type VARCHAR(30), -- invoice, bill, payment, journal, etc.
  matched_document_id UUID,
  
  -- Reconciliation
  reconciliation_id UUID,
  reconciled_at TIMESTAMP,
  
  -- Import
  import_batch_id UUID,
  external_id VARCHAR(100), -- Bank's transaction ID
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tax Codes Table

```sql
CREATE TABLE tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  country_code VARCHAR(2) NOT NULL, -- IN, AU
  tax_type VARCHAR(30) NOT NULL, -- gst_india, gst_australia
  
  -- Rates (India)
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  cess_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Rates (Australia)
  gst_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Classification
  is_exempt BOOLEAN DEFAULT FALSE,
  is_nil_rated BOOLEAN DEFAULT FALSE,
  is_reverse_charge BOOLEAN DEFAULT FALSE,
  is_itc_eligible BOOLEAN DEFAULT TRUE,
  
  -- Accounts
  tax_account_id UUID REFERENCES accounts(id),
  
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### GST Returns Table (India)

```sql
CREATE TABLE gst_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  return_type VARCHAR(20) NOT NULL, -- gstr1, gstr3b, gstr9
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  
  status VARCHAR(20) DEFAULT 'draft', -- draft, generated, filed
  
  -- Summary amounts
  total_taxable_value DECIMAL(18,2),
  total_cgst DECIMAL(18,2),
  total_sgst DECIMAL(18,2),
  total_igst DECIMAL(18,2),
  total_cess DECIMAL(18,2),
  total_tax DECIMAL(18,2),
  
  -- Filing details
  filed_at TIMESTAMP,
  arn VARCHAR(50), -- Acknowledgement number
  
  json_data JSONB, -- Full return data
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

# SPRINT 5: Reporting & Dashboard

**Duration: 4 Weeks | Story Points: 130**

## Sprint 5 Goals

- Build core financial reports (P&L, Balance Sheet, Cash Flow)
- Create interactive dashboard with KPIs
- Implement AR/AP aging reports
- Build trial balance and general ledger reports
- Add export functionality (PDF, Excel)
- Create scheduled report delivery

---

## User Stories - Sprint 5

### US-5.1: Profit & Loss Report

| Field | Details |
|-------|---------|
| Story ID | US-5.1 |
| Story Points | 13 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. Date range selection (this month, quarter, year, custom)
2. Revenue section with account breakdown
3. Cost of Goods Sold section
4. Gross Profit calculation
5. Operating Expenses by category
6. Operating Profit (EBIT)
7. Other Income/Expenses
8. Net Profit
9. Comparison: Period vs Period, vs Budget
10. Drill-down to transactions
11. India: Schedule III format option
12. Export to PDF and Excel

---

### US-5.2: Balance Sheet

| Field | Details |
|-------|---------|
| Story ID | US-5.2 |
| Story Points | 13 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. As-of date selection
2. Assets: Current, Fixed, Other
3. Liabilities: Current, Long-term
4. Equity section with Retained Earnings
5. Assets = Liabilities + Equity validation
6. Drill-down to account details
7. Comparative view (vs prior period)
8. India: Schedule III format
9. Export to PDF and Excel

---

### US-5.3: Cash Flow Statement

| Field | Details |
|-------|---------|
| Story ID | US-5.3 |
| Story Points | 13 |
| Priority | P1 - High |

**Acceptance Criteria:**
1. Operating Activities (Indirect Method)
2. Investing Activities
3. Financing Activities
4. Net Change in Cash
5. Opening and Closing Cash Balance
6. Date range selection
7. Direct Method option
8. Export to PDF and Excel

---

### US-5.4: Trial Balance

| Field | Details |
|-------|---------|
| Story ID | US-5.4 |
| Story Points | 8 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. As-of date selection
2. All accounts with debit/credit balances
3. Total Debits = Total Credits validation
4. Filter by account type
5. Show zero balance accounts toggle
6. Drill-down to account ledger
7. Export to PDF and Excel

---

### US-5.5: General Ledger Report

| Field | Details |
|-------|---------|
| Story ID | US-5.5 |
| Story Points | 8 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. Date range selection
2. Account selection (single or multiple)
3. Opening balance, transactions, closing balance
4. Transaction details: date, reference, narration
5. Running balance column
6. Filter by transaction type
7. Link to source documents
8. Export to PDF and Excel

---

### US-5.6: AR Aging Report

| Field | Details |
|-------|---------|
| Story ID | US-5.6 |
| Story Points | 8 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. Aging buckets: Current, 1-30, 31-60, 61-90, 90+ days
2. Customer-wise breakdown
3. Invoice-level detail option
4. As-of date selection
5. Summary and detail views
6. Total outstanding amount
7. Contact information for follow-up
8. Export to PDF and Excel

---

### US-5.7: Dashboard

| Field | Details |
|-------|---------|
| Story ID | US-5.7 |
| Story Points | 13 |
| Priority | P0 - Critical |

**Acceptance Criteria:**
1. Total Receivables with aging breakdown
2. Total Payables with aging breakdown
3. Cash position (sum of bank accounts)
4. Revenue this month/quarter/year
5. Expenses this month/quarter/year
6. Profit/Loss summary
7. Top 5 customers by revenue
8. Recent invoices and bills
9. Overdue invoices alert
10. Upcoming bills due alert
11. GST/BAS due date reminder
12. Revenue trend chart (last 12 months)
13. Expense breakdown pie chart

---

### US-5.8: Report Scheduling

| Field | Details |
|-------|---------|
| Story ID | US-5.8 |
| Story Points | 8 |
| Priority | P2 - Medium |

**Acceptance Criteria:**
1. Schedule any report for recurring delivery
2. Frequency: Daily, Weekly, Monthly
3. Delivery time selection
4. Email recipients (internal and external)
5. Format selection: PDF, Excel
6. Pause/resume schedule
7. View scheduled report history
8. Custom subject and message

---

## Dashboard KPIs

| KPI | Calculation | Display |
|-----|-------------|---------|
| Total Receivables | Sum of unpaid invoices | Currency with aging bar |
| Total Payables | Sum of unpaid bills | Currency with aging bar |
| Cash Position | Sum of bank account balances | Currency |
| Revenue MTD | Revenue accounts, current month | Currency with % change |
| Expenses MTD | Expense accounts, current month | Currency with % change |
| Profit MTD | Revenue - Expenses | Currency, green/red |
| Gross Margin | (Revenue - COGS) / Revenue | Percentage |
| DSO | (AR / Revenue) * Days | Days |
| DPO | (AP / COGS) * Days | Days |

---

# Definition of Done & Quality Standards

## Definition of Done (DoD)

1. Code complete with no known bugs
2. Unit tests written with >80% code coverage
3. Integration tests passing
4. Code reviewed and approved by at least one peer
5. API documentation updated (Swagger)
6. Database migrations tested
7. Feature tested in staging environment
8. No security vulnerabilities (SAST scan passed)
9. Performance acceptable (load tested if applicable)
10. Product Owner acceptance received

## Code Quality Standards

- ESLint/Prettier for JavaScript/TypeScript
- TypeScript strict mode enabled
- No `any` types without justification
- Database queries optimized (explain analyze)
- N+1 query problems resolved
- Error handling with proper logging
- Input validation on all endpoints
- Meaningful variable and function names

## Security Checklist (Per Feature)

- [ ] Authentication required for protected routes
- [ ] Authorization checks (RBAC) in place
- [ ] Organization data isolation verified
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF tokens for state-changing requests
- [ ] Sensitive data not logged
- [ ] File upload validation (type, size)
- [ ] Rate limiting on sensitive endpoints

## Sprint Ceremonies

| Ceremony | Duration | Purpose |
|----------|----------|---------|
| Sprint Planning | 4 hours | Define sprint goals, select and estimate stories |
| Daily Standup | 15 minutes | Sync on progress, blockers, today's plan |
| Backlog Refinement | 2 hours (weekly) | Clarify upcoming stories, add acceptance criteria |
| Sprint Review | 2 hours | Demo completed work to stakeholders |
| Sprint Retrospective | 1.5 hours | Reflect on process, identify improvements |

---

# Environment Setup

## Development Environment

```bash
# Prerequisites
- Node.js 20.x LTS
- PostgreSQL 16.x
- Redis 7.x
- Docker Desktop

# Clone and Setup
git clone https://github.com/company/bookkeeping-saas.git
cd bookkeeping-saas

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with local settings

# Database setup
docker-compose up -d postgres redis
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev

# Run tests
npm test
npm run test:e2e
```

## Project Structure

```
bookkeeping-saas/
├── apps/
│   ├── web/                 # React frontend
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── features/    # Feature modules
│   │   │   ├── hooks/       # Custom hooks
│   │   │   ├── pages/       # Route pages
│   │   │   ├── services/    # API clients
│   │   │   └── store/       # Redux store
│   │   └── package.json
│   │
│   └── api/                 # Node.js backend
│       ├── src/
│       │   ├── modules/     # Feature modules
│       │   ├── common/      # Shared utilities
│       │   ├── config/      # Configuration
│       │   └── prisma/      # Database schema
│       └── package.json
├── packages/
│   └── shared/              # Shared types and utilities
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Document Summary

| Field | Value |
|-------|-------|
| Document Title | Sprint Development Requirements |
| Version | 1.0 |
| Date | January 2026 |
| Total Sprints | 5 Sprints (20 weeks) |
| Total Story Points | 670 points |
| Target Markets | India, Australia |
