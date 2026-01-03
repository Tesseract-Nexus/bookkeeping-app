# BookKeep Architecture Documentation

## Overview

BookKeep is a multi-tenant SaaS bookkeeping application designed for Indian small and medium businesses. The platform provides comprehensive accounting, invoicing, GST compliance, and financial reporting capabilities.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
├─────────────────────────────┬───────────────────────────────────────────────┤
│       Web Application       │           Mobile Application                   │
│      (Next.js 15/React)     │         (React Native/Expo)                   │
└─────────────────────────────┴───────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                      │
│                           (NGINX/Kong/Traefik)                               │
│  • Rate Limiting • SSL Termination • Request Routing • Load Balancing        │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MICROSERVICES LAYER                               │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│ Auth Service │Tenant Service│  Customer    │ Bookkeeping  │    Invoice     │
│   (8081)     │   (8083)     │   Service    │   Service    │    Service     │
│              │              │   (8082)     │   (8084)     │    (8085)      │
├──────────────┼──────────────┼──────────────┼──────────────┼────────────────┤
│   Report     │     Tax      │   Product    │ Notification │    Storage     │
│   Service    │   Service    │   Service    │   Service    │    Service     │
│   (8086)     │   (8087)     │   (8088)     │   (8089)     │    (8090)      │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                       │
├─────────────────────────┬─────────────────────┬─────────────────────────────┤
│      PostgreSQL         │        Redis        │           NATS              │
│  (Primary Database)     │  (Cache & Sessions) │    (Message Queue)          │
│  • Multi-tenant data    │  • Token cache      │  • Event streaming          │
│  • Row-level security   │  • Rate limiting    │  • Async processing         │
│  • Full-text search     │  • Session store    │  • Service communication    │
└─────────────────────────┴─────────────────────┴─────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                    │
├─────────────────────────┬─────────────────────┬─────────────────────────────┤
│    SMS Gateway          │    Email Service    │     E-Invoice (GST)         │
│    (MSG91/Twilio)       │   (AWS SES/SMTP)    │    (NIC Portal API)         │
└─────────────────────────┴─────────────────────┴─────────────────────────────┘
```

## Multi-Tenancy Architecture

### Tenant Isolation Strategy

BookKeep uses a **shared database with tenant ID** approach for multi-tenancy:

```sql
-- Every table has tenant_id as a required column
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    -- ... other columns
    CONSTRAINT idx_transactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Create index for efficient tenant queries
CREATE INDEX idx_transactions_tenant_id ON transactions(tenant_id);

-- Row-Level Security (Optional, for additional isolation)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON transactions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### Tenant Context Flow

```
1. User authenticates → JWT contains user_id
2. Request includes tenant_id in header or path
3. Middleware validates user is member of tenant
4. Tenant ID is set in request context
5. All database queries filter by tenant_id
6. Response returned to user
```

## Role-Based Access Control (RBAC)

### Permission Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RBAC MODEL                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────┐         ┌──────────┐         ┌──────────────┐                  │
│  │   User   │─────────│  Member  │─────────│     Role     │                  │
│  └──────────┘   1:N   └──────────┘   N:1   └──────────────┘                  │
│       │                    │                      │                           │
│       │                    │                      │ 1:N                       │
│       │                    │                      ▼                           │
│       │                    │               ┌──────────────┐                  │
│       │                    │               │  Permission  │                  │
│       │                    │               └──────────────┘                  │
│       │                    │                                                  │
│  A user can be            Member links              Role contains            │
│  member of multiple       user to tenant            set of permissions       │
│  tenants                  with a specific role                               │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Default Roles & Permissions

| Role       | Description                          | Key Permissions                                  |
|------------|--------------------------------------|--------------------------------------------------|
| Owner      | Full access, billing, delete tenant  | All permissions                                  |
| Admin      | Manage team, settings, all features  | All except billing & tenant deletion             |
| Accountant | Transactions, invoices, reports, GST | Financial operations, no team management         |
| Staff      | Create transactions and invoices     | Create only, limited editing                     |
| Viewer     | Read-only access                     | View transactions, invoices, reports             |

### Permission Categories

```typescript
// Dashboard & Reports
"dashboard:view", "reports:view", "reports:export"

// Transactions
"transaction:view", "transaction:create", "transaction:edit",
"transaction:delete", "transaction:approve"

// Invoices
"invoice:view", "invoice:create", "invoice:edit",
"invoice:delete", "invoice:send", "invoice:void"

// Customers & Vendors
"party:view", "party:create", "party:edit", "party:delete"

// Team Management
"team:view", "team:invite", "team:edit", "team:remove", "role:manage"

// Settings
"settings:view", "settings:edit", "tenant:billing"
```

## Microservices

### Service Responsibilities

| Service            | Port | Responsibilities                                       |
|-------------------|------|--------------------------------------------------------|
| auth-service      | 8081 | User registration, login, OTP, JWT, password reset     |
| customer-service  | 8082 | Customer/Vendor (Party) management, ledger             |
| tenant-service    | 8083 | Multi-tenancy, team management, RBAC, invitations      |
| bookkeeping-service| 8084| Transactions, accounts, chart of accounts, journal     |
| invoice-service   | 8085 | Invoice generation, PDF, e-invoice, payment tracking   |
| report-service    | 8086 | Dashboard, P&L, Balance Sheet, GST reports, aging      |
| tax-service       | 8087 | GST calculations, HSN/SAC codes, tax filing            |
| product-service   | 8088 | Products, services, inventory, pricing                 |
| notification-service| 8089| SMS, email, push notifications, reminders             |
| storage-service   | 8090 | File uploads, document storage, S3 integration         |

### Inter-Service Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COMMUNICATION PATTERNS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Synchronous (HTTP/gRPC):                                                    │
│  • Auth validation                                                           │
│  • User/tenant lookup                                                        │
│  • Real-time data queries                                                    │
│                                                                               │
│  Asynchronous (NATS):                                                        │
│  • Invoice created → Send email notification                                 │
│  • Transaction recorded → Update reports cache                               │
│  • Payment received → Update customer ledger                                 │
│  • GST filed → Send confirmation SMS                                         │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

```sql
-- Tenants (Businesses)
tenants (
    id, name, slug, legal_name, gstin, pan, tan, cin,
    email, phone, website, address_*,
    financial_year_start, currency, date_format,
    invoice_prefix, invoice_next_number, invoice_terms,
    bank_name, bank_account_number, bank_ifsc,
    plan, max_users, status, logo_url,
    created_at, updated_at, deleted_at
)

-- Users
users (
    id, email, phone, password_hash, first_name, last_name,
    is_email_verified, is_phone_verified,
    created_at, updated_at, deleted_at
)

-- Tenant Members (User-Tenant-Role mapping)
tenant_members (
    id, tenant_id, user_id, role_id,
    email, phone, first_name, last_name,
    status, invited_by, invited_at, joined_at, last_active_at,
    created_at, updated_at, deleted_at
)

-- Roles & Permissions
roles (id, tenant_id, name, description, is_system, is_default, created_at)
role_permissions (id, role_id, permission, constraints, created_at)

-- Parties (Customers/Vendors)
parties (
    id, tenant_id, type, name, gstin, pan,
    email, phone, address_*,
    credit_limit, credit_period, opening_balance,
    created_at, updated_at, deleted_at
)

-- Accounts (Chart of Accounts)
accounts (
    id, tenant_id, code, name, type, parent_id,
    is_system, opening_balance, current_balance,
    created_at, updated_at, deleted_at
)

-- Transactions
transactions (
    id, tenant_id, date, type, reference_number,
    party_id, description, total_amount, tax_amount,
    status, created_by, approved_by, approved_at,
    created_at, updated_at, deleted_at
)

-- Transaction Lines (Double-entry)
transaction_lines (
    id, transaction_id, account_id,
    debit_amount, credit_amount, description,
    created_at
)

-- Invoices
invoices (
    id, tenant_id, invoice_number, type,
    party_id, invoice_date, due_date,
    subtotal, discount_amount, tax_amount, total_amount,
    balance_due, status, notes, terms,
    created_at, updated_at, deleted_at
)

-- Audit Logs
audit_logs (
    id, tenant_id, user_id,
    action, resource, resource_id,
    old_value, new_value,
    ip_address, user_agent, request_id,
    status, error_message, created_at
)
```

## Security

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  OTP-Based (Primary for Indian users):                                       │
│  1. User enters phone number                                                 │
│  2. Server sends OTP via SMS                                                 │
│  3. User enters OTP                                                          │
│  4. Server validates OTP, issues JWT                                         │
│                                                                               │
│  Email/Password (Secondary):                                                 │
│  1. User enters email + password                                             │
│  2. Server validates credentials                                             │
│  3. Server issues JWT                                                        │
│                                                                               │
│  JWT Structure:                                                              │
│  {                                                                           │
│    "sub": "user-uuid",                                                       │
│    "email": "user@example.com",                                              │
│    "phone": "+91xxxxxxxxxx",                                                 │
│    "iat": 1234567890,                                                        │
│    "exp": 1234567890                                                         │
│  }                                                                           │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Security Measures

| Layer          | Measure                                              |
|----------------|------------------------------------------------------|
| Transport      | TLS 1.3, HTTPS only, HSTS                           |
| API            | Rate limiting, request validation, CORS             |
| Authentication | JWT with short expiry, refresh tokens, OTP          |
| Authorization  | RBAC, permission checks, tenant isolation           |
| Database       | Parameterized queries, row-level security           |
| Audit          | Comprehensive logging, immutable audit trail        |
| Secrets        | Environment variables, secret management (Vault)    |

## Deployment

### Production Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION DEPLOYMENT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         CloudFlare (CDN)                                │ │
│  │  • DDoS Protection • SSL • Caching • WAF                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    Kubernetes Cluster                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Ingress Controller (NGINX/Traefik)                             │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                         │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │ │
│  │  │ auth (3) │ │tenant (2)│ │ book (3) │ │invoice(2)│ │report (2)│   │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    Managed Services                                     │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│  │  │ RDS Postgres│ │  ElastiCache│ │  Amazon MQ  │ │     S3      │     │ │
│  │  │  (Primary)  │ │   (Redis)   │ │   (NATS)    │ │  (Storage)  │     │ │
│  │  │  (Read Rep) │ │             │ │             │ │             │     │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer           | Technology                              |
|-----------------|----------------------------------------|
| Web Frontend    | Next.js 15, React 19, TailwindCSS      |
| Mobile App      | React Native, Expo, NativeWind         |
| API Gateway     | NGINX / Kong / Traefik                 |
| Backend         | Go 1.25, Gin Framework                 |
| Database        | PostgreSQL 16                          |
| Cache           | Redis 7                                |
| Message Queue   | NATS                                   |
| Container       | Docker, Kubernetes                     |
| CI/CD           | GitHub Actions                         |
| Monitoring      | Prometheus, Grafana, Loki              |
| Cloud           | AWS / GCP / DigitalOcean               |
