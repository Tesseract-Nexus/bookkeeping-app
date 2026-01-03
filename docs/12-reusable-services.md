# Reusable Services from Tesseract Hub

This document outlines the services from the `tesseract-hub` repository that can be reused for the Bookkeeping application, avoiding duplication of effort.

## Infrastructure Services (Fully Reusable)

These services are already deployed in the Kubernetes cluster and can be used directly:

### 1. NATS Messaging (nats.nats.svc.cluster.local:4222)
- **Purpose**: Event-driven messaging between microservices
- **Usage in Bookkeeping**:
  - Invoice created/updated/deleted events
  - Payment received events
  - GST filing status updates
  - Notification triggers
- **No changes needed** - use existing NATS deployment

### 2. Redis (redis.database.svc.cluster.local:6379)
- **Purpose**: Caching, session storage, rate limiting
- **Usage in Bookkeeping**:
  - Session management for auth
  - Cache frequently accessed data (customers, products)
  - Rate limiting API requests
  - Temporary storage for report generation
- **Recommendation**: Create a separate Redis instance (`bookkeeping-redis`) for isolation

### 3. MinIO (minio.storage.svc.cluster.local:9000)
- **Purpose**: S3-compatible object storage
- **Usage in Bookkeeping**:
  - Invoice PDFs storage
  - E-Invoice JSON documents
  - Report exports (Excel, CSV)
  - Document attachments
- **No changes needed** - use existing MinIO with dedicated bucket

## Shared Go Packages (Can Be Imported)

Located in `tesseract-hub/packages/go-shared/`:

### 1. Database Package (`database/gorm.go`)
```go
import "github.com/tesseract-hub/go-shared/database"

db, err := database.ConnectGORM(config)
```
- GORM connection with connection pooling
- Health check functions
- Transaction helpers

### 2. Middleware Package (`middleware/`)
```go
import "github.com/tesseract-hub/go-shared/middleware"

router.Use(middleware.AuthMiddleware(jwtConfig))
router.Use(middleware.RequireRole("admin"))
```
- JWT authentication
- Role-based access control
- CORS handling
- Request ID injection
- Error handling

### 3. Auth Package (`auth/jwt.go`)
```go
import "github.com/tesseract-hub/go-shared/auth"

token, err := auth.GenerateToken(claims, config)
claims, err := auth.ValidateToken(tokenString, config)
```
- JWT token generation
- Token validation
- Claims parsing

### 4. Repository Package (`repository/`)
```go
import "github.com/tesseract-hub/go-shared/repository"

repo := repository.NewTenantRepository[Invoice](db)
invoices, err := repo.FindByTenantID(ctx, tenantID, query)
```
- Base repository with CRUD operations
- Tenant-aware queries
- Query builder for filtering/pagination

### 5. Logger Package (`logger/logger.go`)
```go
import "github.com/tesseract-hub/go-shared/logger"

log := logger.New("invoice-service")
log.Info("Invoice created", zap.String("id", invoice.ID))
```
- Structured logging with Zap
- Request context logging
- Log levels configuration

## Services That Can Be Extended

### 1. Document Service
**Location**: `tesseract-hub/services/document-service/`

**Current Capabilities**:
- PDF generation
- Image processing
- File upload/download

**For Bookkeeping**:
- Extend to generate GST-compliant invoice PDFs
- Add E-Invoice QR code generation
- Export reports to Excel/CSV

**Recommendation**: Fork and extend rather than modify

### 2. Notification Service
**Location**: `tesseract-hub/services/notification-service/`

**Current Capabilities**:
- Email sending
- Push notifications
- SMS (Twilio integration)

**For Bookkeeping**:
- Invoice email notifications
- Payment reminders
- GST due date alerts
- WhatsApp integration for invoices

**Recommendation**: Use as-is, add bookkeeping-specific templates

### 3. Location Service
**Location**: `tesseract-hub/services/location-service/`

**Current Capabilities**:
- Country/state data
- Currency information
- Timezone management

**For Bookkeeping**:
- State codes for GST
- Currency formatting (INR)
- Tax rate by state

**Recommendation**: Extend to include GST state codes and HSN data

## Services NOT Reusable (Need Custom Implementation)

These services are too specific to e-commerce and need custom implementations:

### 1. Orders Service
- E-commerce specific order workflow
- Shopping cart logic
- **Bookkeeping Alternative**: Invoice Service (already created)

### 2. Products Service
- E-commerce product catalog
- Variants and inventory
- **Bookkeeping Alternative**: Simplified product/item management within invoice

### 3. Coupons Service
- Promotional discounts
- Usage tracking
- **Not needed for Bookkeeping**

### 4. Reviews Service
- Product reviews
- Rating system
- **Not needed for Bookkeeping**

### 5. Cart Service
- Shopping cart management
- **Not needed for Bookkeeping**

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     KUBERNETES CLUSTER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 SHARED INFRASTRUCTURE                    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  NATS (nats.nats.svc)          Redis (redis.database)   │   │
│  │  MinIO (minio.storage)         PostgreSQL (shared)       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                   │
│                             │ Uses                              │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TESSERACT-HUB SERVICES                      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Location Service     Notification Service               │   │
│  │  Document Service     Auth Service (patterns)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                   │
│                             │ Extends/References                │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              BOOKKEEPING SERVICES (New)                  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Auth Service         Core Service                       │   │
│  │  Invoice Service      Customer Service                   │   │
│  │  Tax Service          Report Service                     │   │
│  │  Bookkeeping Web      Mobile App                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Go Module Setup

To use shared packages from tesseract-hub, add to `go.mod`:

```go
module github.com/tesseract-nexus/bookkeeping-app/auth-service

go 1.23

require (
    github.com/tesseract-hub/go-shared v0.0.0
    // other dependencies
)

// For local development
replace github.com/tesseract-hub/go-shared => ../../../tesseract-hub/packages/go-shared
```

## Environment Variables

Services should use consistent environment variable naming:

```env
# Database (same pattern as tesseract-hub)
DB_HOST=bookkeeping-postgresql.bookkeeping.svc.cluster.local
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<from-secret>
DB_NAME=bookkeep_<service>
DB_SSLMODE=disable

# Redis (same pattern)
REDIS_HOST=bookkeeping-redis-master.bookkeeping.svc.cluster.local
REDIS_PORT=6379
REDIS_PASSWORD=<from-secret>

# NATS (shared instance)
NATS_URL=nats://nats.nats.svc.cluster.local:4222

# JWT (same pattern)
JWT_SECRET=<from-secret>
JWT_ISSUER=bookkeeping-auth
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
```

## Deployment Recommendations

1. **Separate Namespace**: Deploy all bookkeeping services in `bookkeeping` namespace
2. **Separate PostgreSQL**: Use `bookkeeping-postgresql` for data isolation
3. **Shared NATS**: Use existing NATS cluster with topic prefixes (`bookkeeping.`)
4. **Shared MinIO**: Use existing MinIO with dedicated bucket (`bookkeeping-*`)
5. **Separate Redis**: Consider separate Redis for session isolation
6. **Service Mesh**: Use Istio for inter-service communication (already in cluster)

## Summary

| Service/Package | Reusability | Action |
|----------------|-------------|--------|
| NATS | Fully reusable | Use as-is |
| Redis | Partially reusable | Create separate instance |
| MinIO | Fully reusable | Use with new bucket |
| go-shared/database | Fully reusable | Import package |
| go-shared/middleware | Fully reusable | Import package |
| go-shared/auth | Fully reusable | Import package |
| go-shared/repository | Fully reusable | Import package |
| go-shared/logger | Fully reusable | Import package |
| Document Service | Extend | Fork and customize |
| Notification Service | Extend | Add templates |
| Location Service | Extend | Add GST data |
| Orders/Products/etc | Not reusable | Create new services |
