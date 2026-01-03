# Security Documentation

## Overview

This document outlines the security measures, best practices, and implementation guidelines for the BookKeep application.

## Authentication

### OTP-Based Authentication

Primary authentication method for Indian users using mobile phone OTP.

```go
// OTP Flow
1. POST /api/v1/auth/request-otp { "phone": "+91XXXXXXXXXX" }
2. Server generates 6-digit OTP with 5-minute expiry
3. OTP sent via SMS gateway (MSG91/Twilio)
4. POST /api/v1/auth/verify-otp { "phone": "+91XXXXXXXXXX", "otp": "123456" }
5. Server validates OTP and issues JWT tokens
```

### OTP Security Measures

```go
type OTPConfig struct {
    Length      int           // 6 digits
    Expiry      time.Duration // 5 minutes
    MaxAttempts int           // 3 attempts
    Cooldown    time.Duration // 1 minute between requests
    RateLimit   int           // 5 requests per hour per phone
}
```

### Password Requirements

For email/password authentication:

```go
type PasswordPolicy struct {
    MinLength        int  // 8 characters minimum
    RequireUppercase bool // At least one uppercase
    RequireLowercase bool // At least one lowercase
    RequireNumber    bool // At least one number
    RequireSpecial   bool // At least one special character
    MaxAge           int  // 90 days before expiry warning
}
```

### JWT Token Structure

```go
type Claims struct {
    UserID    uuid.UUID `json:"sub"`
    Email     string    `json:"email"`
    Phone     string    `json:"phone"`
    FirstName string    `json:"first_name"`
    LastName  string    `json:"last_name"`
    IssuedAt  int64     `json:"iat"`
    ExpiresAt int64     `json:"exp"`
}

// Token Configuration
type TokenConfig struct {
    AccessTokenExpiry  time.Duration // 15 minutes
    RefreshTokenExpiry time.Duration // 7 days
    SigningMethod      string        // HS256 or RS256
}
```

### Token Refresh Flow

```
1. Access token expires
2. Client sends refresh token to /api/v1/auth/refresh
3. Server validates refresh token
4. Server issues new access token
5. Optionally rotates refresh token
```

## Authorization (RBAC)

### Permission Check Middleware

```go
func RequirePermission(permission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        tenantID := c.GetString("tenant_id")
        userID := c.GetString("user_id")

        // Get user's role and permissions
        member, err := getMember(tenantID, userID)
        if err != nil {
            c.AbortWithStatus(403)
            return
        }

        // Check permission
        if !member.Role.HasPermission(permission) {
            c.AbortWithStatusJSON(403, gin.H{
                "error": "Insufficient permissions"
            })
            return
        }

        c.Next()
    }
}
```

### Multi-Tenant Isolation

```go
// Every query MUST include tenant_id filter
func (r *Repository) GetTransactions(ctx context.Context, tenantID uuid.UUID) ([]Transaction, error) {
    var transactions []Transaction
    err := r.db.WithContext(ctx).
        Where("tenant_id = ?", tenantID).  // REQUIRED
        Order("date DESC").
        Find(&transactions).Error
    return transactions, err
}
```

## Input Validation

### Request Validation

```go
type CreateInvoiceRequest struct {
    PartyID     uuid.UUID `json:"party_id" binding:"required,uuid"`
    InvoiceDate string    `json:"invoice_date" binding:"required,datetime=2006-01-02"`
    DueDate     string    `json:"due_date" binding:"required,datetime=2006-01-02,gtfield=InvoiceDate"`
    Items       []Item    `json:"items" binding:"required,min=1,dive"`
}

type Item struct {
    Description string  `json:"description" binding:"required,max=500"`
    Quantity    float64 `json:"quantity" binding:"required,gt=0"`
    Rate        float64 `json:"rate" binding:"required,gte=0"`
    HSNCode     string  `json:"hsn_code" binding:"omitempty,len=8"`
    TaxRate     float64 `json:"tax_rate" binding:"gte=0,lte=28"`
}
```

### SQL Injection Prevention

```go
// GOOD - Using parameterized queries
db.Where("email = ?", email).First(&user)

// GOOD - Using GORM's built-in methods
db.First(&user, id)

// BAD - Never concatenate user input
db.Raw("SELECT * FROM users WHERE email = '" + email + "'") // VULNERABLE!
```

### XSS Prevention

```go
// Sanitize HTML input
import "github.com/microcosm-cc/bluemonday"

func SanitizeHTML(input string) string {
    p := bluemonday.UGCPolicy()
    return p.Sanitize(input)
}

// Escape output in templates
// Next.js automatically escapes - but be careful with dangerouslySetInnerHTML
```

## Rate Limiting

### Implementation

```go
type RateLimiter struct {
    requests map[string]*RateLimit
    mu       sync.RWMutex
}

type RateLimitConfig struct {
    // API endpoints
    General    Rate // 100 requests per minute
    Auth       Rate // 10 requests per minute
    OTP        Rate // 5 requests per hour per phone

    // By client type
    Anonymous  Rate // 20 requests per minute
    Authenticated Rate // 200 requests per minute
}

type Rate struct {
    Limit  int
    Window time.Duration
}
```

### Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Audit Logging

### Audit Log Schema

```go
type AuditLog struct {
    ID          uuid.UUID  `json:"id"`
    TenantID    uuid.UUID  `json:"tenant_id"`
    UserID      uuid.UUID  `json:"user_id"`
    Action      string     `json:"action"`      // e.g., "invoice:create"
    Resource    string     `json:"resource"`    // e.g., "invoice"
    ResourceID  *uuid.UUID `json:"resource_id"`
    OldValue    *JSON      `json:"old_value"`   // Previous state
    NewValue    *JSON      `json:"new_value"`   // New state
    IPAddress   string     `json:"ip_address"`
    UserAgent   string     `json:"user_agent"`
    RequestID   string     `json:"request_id"`
    Status      string     `json:"status"`      // success, failed, denied
    CreatedAt   time.Time  `json:"created_at"`
}
```

### Audited Actions

```go
// All these actions are logged
const (
    ActionLogin           = "auth:login"
    ActionLogout          = "auth:logout"
    ActionPasswordChange  = "auth:password_change"

    ActionInvoiceCreate   = "invoice:create"
    ActionInvoiceUpdate   = "invoice:update"
    ActionInvoiceDelete   = "invoice:delete"
    ActionInvoiceSend     = "invoice:send"

    ActionTransactionCreate = "transaction:create"
    ActionTransactionApprove = "transaction:approve"
    ActionTransactionVoid   = "transaction:void"

    ActionMemberInvite    = "member:invite"
    ActionMemberRemove    = "member:remove"
    ActionRoleChange      = "member:role_change"

    ActionSettingsChange  = "settings:change"
    ActionExportData      = "data:export"
)
```

## Encryption

### Data at Rest

```yaml
# PostgreSQL encryption
# Enable at database level or use column-level encryption

# Sensitive columns to encrypt:
- bank_account_number
- password_hash (already hashed, but extra layer)
- api_keys
- tokens
```

### Data in Transit

```yaml
# TLS Configuration
tls_version: "1.3"
cipher_suites:
  - TLS_AES_128_GCM_SHA256
  - TLS_AES_256_GCM_SHA384
  - TLS_CHACHA20_POLY1305_SHA256
```

### Password Hashing

```go
import "golang.org/x/crypto/bcrypt"

const bcryptCost = 12

func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
    return string(bytes), err
}

func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

## API Security Headers

```go
func SecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Prevent clickjacking
        c.Header("X-Frame-Options", "DENY")

        // XSS protection
        c.Header("X-XSS-Protection", "1; mode=block")

        // Content type sniffing
        c.Header("X-Content-Type-Options", "nosniff")

        // HSTS
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

        // CSP
        c.Header("Content-Security-Policy", "default-src 'self'")

        // Referrer
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

        c.Next()
    }
}
```

## CORS Configuration

```go
func CORSMiddleware() gin.HandlerFunc {
    return cors.New(cors.Config{
        AllowOrigins:     []string{"https://app.bookkeep.in"},
        AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Tenant-ID"},
        ExposeHeaders:    []string{"X-RateLimit-Limit", "X-RateLimit-Remaining"},
        AllowCredentials: true,
        MaxAge:           12 * time.Hour,
    })
}
```

## Secrets Management

### Environment Variables

```bash
# Required secrets (NEVER commit to git)
DATABASE_URL=postgresql://...
JWT_SECRET=your-256-bit-secret
REDIS_URL=redis://...
SMS_API_KEY=your-sms-api-key
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Production Secret Management

```yaml
# Use one of:
- AWS Secrets Manager
- HashiCorp Vault
- GCP Secret Manager
- Kubernetes Secrets (with encryption)
```

## Vulnerability Scanning

### Dependencies

```bash
# Go dependencies
go list -m all | nancy sleuth

# Node.js dependencies
npm audit
pnpm audit

# Docker images
trivy image bookkeep/auth-service:latest
```

### Static Analysis

```bash
# Go security linting
gosec ./...

# Code quality
golangci-lint run
```

## Incident Response

### Security Incident Levels

| Level    | Description                    | Response Time | Example                    |
|----------|--------------------------------|---------------|----------------------------|
| Critical | Active breach, data exposure   | Immediate     | SQL injection exploited    |
| High     | Vulnerability, no exploitation | 4 hours       | Authentication bypass      |
| Medium   | Security weakness              | 24 hours      | Missing rate limiting      |
| Low      | Best practice violation        | 1 week        | Verbose error messages     |

### Response Steps

1. **Identify**: Detect and confirm the incident
2. **Contain**: Limit damage (block IPs, revoke tokens)
3. **Eradicate**: Remove the threat
4. **Recover**: Restore normal operations
5. **Learn**: Post-incident review, update procedures

## Compliance

### Data Privacy (GDPR, India DPDP)

```go
// Right to be forgotten
func (s *Service) DeleteUserData(ctx context.Context, userID uuid.UUID) error {
    // 1. Delete/anonymize personal data
    // 2. Retain required financial records (7 years in India)
    // 3. Log the deletion request
}

// Data export
func (s *Service) ExportUserData(ctx context.Context, userID uuid.UUID) ([]byte, error) {
    // Export all user data in portable format
}
```

### Financial Compliance (India)

- Maintain audit trails for 7+ years
- GST invoice requirements
- E-invoice compliance (for applicable turnover)
- Secure storage of financial records
