# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────┬─────────────────┬─────────────────────────────────────┤
│   Mobile App    │    Web App      │    Progressive Web App (PWA)        │
│  (React Native) │   (Next.js)     │         (Next.js)                   │
└────────┬────────┴────────┬────────┴──────────────┬──────────────────────┘
         │                 │                       │
         └─────────────────┼───────────────────────┘
                          │
                    ┌─────▼─────┐
                    │    CDN    │  (Static assets, edge caching)
                    └─────┬─────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────┐
│                        API GATEWAY                                       │
│  (Rate Limiting, Auth Verification, Request Routing, Load Balancing)    │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────┐
│                     BACKEND SERVICES (Go Microservices)                  │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│   Auth       │  Bookkeeping │   Invoice    │   Reports    │   Sync      │
│   Service    │   Service    │   Service    │   Service    │   Service   │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────────┤
│   Store      │   Tax/GST    │   Payment    │   Customer   │   Audit     │
│   Service    │   Service    │   Service    │   Service    │   Service   │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────────┤
│   Settings   │  Notification│   Document   │   Analytics  │   Tenant    │
│   Service    │   Service    │   Service    │   Service    │   Service   │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴──────┬──────┘
       │              │              │              │              │
       └──────────────┼──────────────┼──────────────┼──────────────┘
                      │              │              │
        ┌─────────────▼──────────────▼──────────────▼─────────────┐
        │                    MESSAGE BROKER (NATS)                 │
        │            (Event-driven async communication)            │
        └─────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                          DATA LAYER                                      │
├────────────────────┬────────────────────┬───────────────────────────────┤
│    PostgreSQL      │       Redis        │        Object Storage         │
│   (Primary DB)     │   (Cache/Session)  │     (S3/GCS - Documents)      │
└────────────────────┴────────────────────┴───────────────────────────────┘
```

## Microservices Architecture

### Core Services

#### 1. Auth Service
**Purpose**: Authentication, authorization, session management

**Responsibilities**:
- User registration and login
- JWT token issuance and refresh
- Password management
- 2FA/MFA implementation
- OAuth2/OIDC integration
- Session management

**Port**: 3080

```go
// Key endpoints
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/verify-otp
GET    /api/v1/auth/profile
```

#### 2. Tenant Service
**Purpose**: Multi-tenant management and onboarding

**Responsibilities**:
- Business/tenant registration
- Subscription management
- Plan upgrades/downgrades
- Tenant settings and configuration

**Port**: 8086

```go
// Key endpoints
POST   /api/v1/tenants
GET    /api/v1/tenants/:id
PUT    /api/v1/tenants/:id
GET    /api/v1/tenants/:id/subscription
POST   /api/v1/tenants/:id/subscription/upgrade
```

#### 3. Bookkeeping Service
**Purpose**: Core bookkeeping functionality

**Responsibilities**:
- Transaction recording (income/expense)
- Account management
- Ledger entries
- Bank reconciliation
- Cash flow tracking

**Port**: 3100

```go
// Key endpoints
POST   /api/v1/transactions
GET    /api/v1/transactions
GET    /api/v1/transactions/:id
PUT    /api/v1/transactions/:id
DELETE /api/v1/transactions/:id
GET    /api/v1/accounts
POST   /api/v1/accounts
GET    /api/v1/ledger
POST   /api/v1/reconciliation
```

#### 4. Invoice Service
**Purpose**: Invoice generation and management

**Responsibilities**:
- Invoice creation (sale/purchase)
- Quotation/estimate management
- Credit/debit notes
- Payment tracking
- E-invoice generation (GST compliant)

**Port**: 3101

```go
// Key endpoints
POST   /api/v1/invoices
GET    /api/v1/invoices
GET    /api/v1/invoices/:id
PUT    /api/v1/invoices/:id
POST   /api/v1/invoices/:id/send
POST   /api/v1/invoices/:id/payment
GET    /api/v1/quotations
POST   /api/v1/quotations
POST   /api/v1/quotations/:id/convert
```

#### 5. Tax/GST Service
**Purpose**: Tax calculations and compliance

**Responsibilities**:
- GST calculation
- HSN/SAC code management
- Tax rate configuration
- GST return data preparation
- E-way bill generation
- TDS management

**Port**: 3102

```go
// Key endpoints
GET    /api/v1/tax/calculate
GET    /api/v1/tax/hsn-codes
GET    /api/v1/tax/rates
GET    /api/v1/gst/returns/gstr1
GET    /api/v1/gst/returns/gstr3b
POST   /api/v1/gst/eway-bill
GET    /api/v1/tds/summary
```

#### 6. Reports Service
**Purpose**: Financial reporting and analytics

**Responsibilities**:
- Profit & Loss statements
- Balance sheets
- Cash flow statements
- GST reports
- Custom report generation
- Export to PDF/Excel

**Port**: 3103

```go
// Key endpoints
GET    /api/v1/reports/profit-loss
GET    /api/v1/reports/balance-sheet
GET    /api/v1/reports/cash-flow
GET    /api/v1/reports/gst-summary
GET    /api/v1/reports/receivables
GET    /api/v1/reports/payables
POST   /api/v1/reports/export
```

#### 7. Customer Service
**Purpose**: Customer/party management

**Responsibilities**:
- Customer CRUD
- Vendor/supplier management
- Contact management
- Customer ledger
- Credit limit management

**Port**: 3104

```go
// Key endpoints
POST   /api/v1/customers
GET    /api/v1/customers
GET    /api/v1/customers/:id
PUT    /api/v1/customers/:id
GET    /api/v1/customers/:id/ledger
GET    /api/v1/vendors
POST   /api/v1/vendors
```

#### 8. Store Service
**Purpose**: Multi-store management

**Responsibilities**:
- Store creation and configuration
- Store-specific settings
- Inter-store transfers
- Store-wise reporting

**Port**: 3105

```go
// Key endpoints
POST   /api/v1/stores
GET    /api/v1/stores
GET    /api/v1/stores/:id
PUT    /api/v1/stores/:id
POST   /api/v1/stores/transfer
GET    /api/v1/stores/:id/summary
```

#### 9. Payment Service
**Purpose**: Payment processing and integration

**Responsibilities**:
- Payment gateway integration
- Payment collection links
- Payment reminders
- Refund processing
- Payment reconciliation

**Port**: 3106

```go
// Key endpoints
POST   /api/v1/payments
GET    /api/v1/payments
POST   /api/v1/payments/link
POST   /api/v1/payments/refund
GET    /api/v1/payments/reconcile
```

#### 10. Notification Service
**Purpose**: Multi-channel notifications

**Responsibilities**:
- Email notifications
- SMS notifications
- WhatsApp messages
- Push notifications
- In-app notifications

**Port**: 3107

```go
// Key endpoints
POST   /api/v1/notifications/send
GET    /api/v1/notifications
PUT    /api/v1/notifications/:id/read
POST   /api/v1/notifications/preferences
```

#### 11. Document Service
**Purpose**: File storage and management

**Responsibilities**:
- Receipt/document uploads
- OCR processing
- Document categorization
- Secure file storage

**Port**: 3108

```go
// Key endpoints
POST   /api/v1/documents/upload
GET    /api/v1/documents
GET    /api/v1/documents/:id
DELETE /api/v1/documents/:id
POST   /api/v1/documents/ocr
```

#### 12. Sync Service
**Purpose**: Offline-first data synchronization

**Responsibilities**:
- Conflict resolution
- Delta sync
- Queue management
- Data integrity verification

**Port**: 3109

```go
// Key endpoints
POST   /api/v1/sync/push
GET    /api/v1/sync/pull
GET    /api/v1/sync/status
POST   /api/v1/sync/resolve-conflict
```

## Communication Patterns

### Synchronous (HTTP/REST)
- Client → API Gateway → Service
- Service → Service (for real-time needs)

### Asynchronous (NATS)
- Event publishing for cross-service updates
- Audit trail logging
- Notification triggers
- Analytics event streaming

### Event Types
```go
// Transaction events
transaction.created
transaction.updated
transaction.deleted

// Invoice events
invoice.created
invoice.sent
invoice.paid
invoice.overdue

// Customer events
customer.created
customer.updated
customer.credit_limit_exceeded

// Tax events
gst.return_due
gst.eway_bill_generated
tds.payment_due

// System events
sync.completed
sync.conflict_detected
```

## Data Flow Examples

### Recording a Sale Transaction

```
1. Mobile App → API Gateway
2. API Gateway → Auth verification
3. API Gateway → Bookkeeping Service
4. Bookkeeping Service:
   - Validates transaction
   - Calculates tax (calls Tax Service)
   - Records entry
   - Publishes "transaction.created" event
5. Event subscribers:
   - Analytics Service (updates dashboards)
   - Audit Service (logs activity)
   - Notification Service (sends confirmation)
   - Sync Service (marks for sync)
6. Response → Mobile App
```

### Generating Invoice

```
1. Web/Mobile App → API Gateway
2. API Gateway → Invoice Service
3. Invoice Service:
   - Creates invoice record
   - Calls Tax Service for GST calculation
   - Calls Document Service for PDF generation
   - Publishes "invoice.created" event
4. Event subscribers:
   - Bookkeeping Service (creates receivable)
   - Notification Service (sends to customer)
   - Analytics Service (updates revenue)
5. Response with invoice data → App
```

## Infrastructure Components

### API Gateway
- **Technology**: Kong / Nginx / Istio
- **Features**:
  - Rate limiting (per tenant, per user)
  - Request/response transformation
  - Authentication verification
  - Load balancing
  - Circuit breaker

### Message Broker (NATS)
- **Features**:
  - JetStream for persistence
  - At-least-once delivery
  - Consumer groups for scaling
  - Dead letter queues

### Cache Layer (Redis)
- **Usage**:
  - Session storage
  - API response caching
  - Rate limit counters
  - Real-time data (dashboard metrics)
  - Distributed locks

### Database (PostgreSQL)
- **Features**:
  - Row-level security for multi-tenancy
  - JSONB for flexible schemas
  - Full-text search
  - Automatic partitioning for large tables
  - Read replicas for reporting

## Scalability Considerations

### Horizontal Scaling
- Stateless services allow easy horizontal scaling
- Kubernetes HPA for auto-scaling based on metrics
- Database connection pooling via PgBouncer

### Performance Optimizations
- Redis caching for frequently accessed data
- CDN for static assets
- Database query optimization with proper indexing
- Async processing for heavy operations

### High Availability
- Multiple replicas per service (minimum 2)
- Database replication (primary + replica)
- Multi-AZ deployment
- Automated failover

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WAF (Web Application Firewall)           │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                        DDoS Protection                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                     API Gateway (TLS Termination)               │
│                  JWT Validation, Rate Limiting                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                     Service Mesh (mTLS)                         │
│              Service-to-Service Authentication                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                        Data Encryption                          │
│                   (At rest + In transit)                        │
└─────────────────────────────────────────────────────────────────┘
```
