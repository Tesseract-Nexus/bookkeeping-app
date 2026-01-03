# RBAC & Security

## Role-Based Access Control (RBAC)

### Role Hierarchy

BookKeep uses a hierarchical role system designed for simplicity while maintaining proper access control.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLATFORM LEVEL                                │
├─────────────────────────────────────────────────────────────────┤
│  Super Admin (Priority: 100)                                     │
│  └── Full platform access, tenant management                     │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    TENANT LEVEL                                  │
├─────────────────────────────────────────────────────────────────┤
│  Owner (Priority: 100)                                           │
│  └── Full business access, billing, user management              │
│                                                                  │
│  Admin (Priority: 90)                                            │
│  └── All features except billing and owner settings              │
│                                                                  │
│  Manager (Priority: 70)                                          │
│  └── Day-to-day operations, reports, staff management            │
│                                                                  │
│  Accountant (Priority: 60)                                       │
│  └── Full bookkeeping access, no user management                 │
│                                                                  │
│  Staff (Priority: 40)                                            │
│  └── Sales, purchases, basic transactions                        │
│                                                                  │
│  Viewer (Priority: 10)                                           │
│  └── Read-only access to reports and data                        │
└─────────────────────────────────────────────────────────────────┘
```

### Role Definitions

#### Owner
The business owner with complete control.

```go
Role: "owner"
Priority: 100
Permissions: [
    "*:*"  // All permissions
]
```

**Access**:
- All features and data
- Subscription and billing management
- Add/remove users
- Business settings
- Data export/delete

#### Admin
Trusted administrator with full operational access.

```go
Role: "admin"
Priority: 90
Permissions: [
    "transaction:*",
    "invoice:*",
    "customer:*",
    "vendor:*",
    "report:*",
    "user:*",
    "settings:read",
    "settings:update",
    "store:*",
    "inventory:*"
]
```

**Access**:
- All operational features
- User management
- Settings (except billing)
- All reports

**Restrictions**:
- Cannot change subscription
- Cannot delete business account
- Cannot access billing details

#### Manager
Store or operations manager.

```go
Role: "manager"
Priority: 70
Permissions: [
    "transaction:*",
    "invoice:*",
    "customer:*",
    "vendor:*",
    "report:read",
    "user:read",
    "user:create_staff",
    "store:read",
    "inventory:*"
]
```

**Access**:
- All transactions
- Customer/vendor management
- View reports
- Create staff users
- Inventory management

**Restrictions**:
- Cannot access billing
- Cannot modify business settings
- Cannot create admin users

#### Accountant
Financial/bookkeeping specialist.

```go
Role: "accountant"
Priority: 60
Permissions: [
    "transaction:*",
    "invoice:*",
    "customer:*",
    "vendor:*",
    "report:*",
    "banking:*",
    "tax:*",
    "store:read"
]
```

**Access**:
- All bookkeeping functions
- All reports
- Bank reconciliation
- Tax/GST management

**Restrictions**:
- No user management
- No business settings
- Read-only store access

#### Staff
Front-line staff for daily operations.

```go
Role: "staff"
Priority: 40
Permissions: [
    "transaction:create",
    "transaction:read",
    "invoice:create",
    "invoice:read",
    "customer:read",
    "customer:create",
    "vendor:read",
    "store:read",
    "inventory:read"
]
```

**Access**:
- Create transactions/invoices
- View customers
- Create new customers
- View inventory

**Restrictions**:
- Cannot edit/delete transactions
- Cannot access reports
- Cannot see financial summaries
- No settings access

#### Viewer
Read-only access for stakeholders.

```go
Role: "viewer"
Priority: 10
Permissions: [
    "transaction:read",
    "invoice:read",
    "customer:read",
    "vendor:read",
    "report:read",
    "store:read"
]
```

**Access**:
- View all data
- View reports

**Restrictions**:
- Cannot create or modify anything

---

### Permission Model

#### Permission Format
```
resource:action
```

#### Resources
```go
resources := []string{
    "transaction",  // Income, expense, journal entries
    "invoice",      // Sales and purchase invoices
    "customer",     // Customer/party management
    "vendor",       // Vendor/supplier management
    "report",       // All reports
    "user",         // User management
    "settings",     // Business settings
    "store",        // Store management
    "inventory",    // Inventory/stock
    "banking",      // Bank accounts, reconciliation
    "tax",          // GST, TDS management
    "document",     // File uploads
    "billing",      // Subscription, payments
}
```

#### Actions
```go
actions := []string{
    "create",       // Create new records
    "read",         // View records
    "update",       // Modify existing records
    "delete",       // Delete records
    "*",            // All actions
}
```

#### Permission Examples
```go
"transaction:create"    // Can create transactions
"invoice:*"             // All invoice operations
"report:read"           // Can view reports
"user:create_staff"     // Can create staff users only
"*:*"                   // Full access (owner only)
```

---

### Multi-Tenancy Security

#### Tenant Isolation

```go
// Every database query includes tenant_id
type Transaction struct {
    ID        uuid.UUID `json:"id"`
    TenantID  uuid.UUID `json:"tenant_id"`  // Required
    StoreID   uuid.UUID `json:"store_id"`   // Optional multi-store
    // ... other fields
}

// Middleware extracts tenant from JWT
func TenantMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        claims := c.MustGet("claims").(*JWTClaims)
        c.Set("tenant_id", claims.TenantID)
        c.Next()
    }
}

// Repository enforces tenant isolation
func (r *TransactionRepo) GetAll(ctx context.Context, tenantID uuid.UUID) ([]Transaction, error) {
    return r.db.Where("tenant_id = ?", tenantID).Find(&[]Transaction{})
}
```

#### Store-Level Access (Multi-store)

```go
// Users can be assigned to specific stores
type UserStoreAccess struct {
    UserID   uuid.UUID
    StoreID  uuid.UUID
    Role     string  // Role can vary per store
}

// Check store access
func HasStoreAccess(userID, storeID uuid.UUID) bool {
    // Check if user has access to this store
}
```

---

## Authentication

### Authentication Methods

#### 1. Phone + OTP (Primary for India)
```
1. User enters phone number
2. System sends OTP via SMS
3. User enters OTP
4. System issues JWT tokens
```

#### 2. Email + Password
```
1. User enters email and password
2. System verifies credentials
3. Optional: 2FA verification
4. System issues JWT tokens
```

#### 3. Social Login
- Google OAuth
- Apple Sign-In (for iOS)

### JWT Token Structure

```go
type JWTClaims struct {
    UserID      uuid.UUID   `json:"user_id"`
    Email       string      `json:"email"`
    Phone       string      `json:"phone"`
    TenantID    uuid.UUID   `json:"tenant_id"`
    StoreIDs    []uuid.UUID `json:"store_ids"`
    Role        string      `json:"role"`
    Permissions []string    `json:"permissions"`
    SessionID   uuid.UUID   `json:"session_id"`
    jwt.StandardClaims
}
```

### Token Configuration

```go
AccessTokenExpiry  = 15 * time.Minute   // Short-lived
RefreshTokenExpiry = 7 * 24 * time.Hour // 7 days
```

### Token Refresh Flow

```
1. Access token expires
2. Client sends refresh token to /auth/refresh
3. Server validates refresh token
4. Server issues new access token
5. Optionally rotate refresh token
```

### Multi-Factor Authentication (MFA)

#### TOTP (Time-based One-Time Password)
```
1. User enables 2FA in settings
2. System generates secret key
3. User scans QR code with authenticator app
4. User enters verification code
5. System stores encrypted secret
6. On future logins, system requests TOTP after password
```

#### SMS OTP (Backup)
```
1. If TOTP unavailable, user requests SMS OTP
2. System sends OTP to registered phone
3. User enters OTP to complete login
```

---

## Data Security

### Encryption

#### At Rest
```
- Database: PostgreSQL with TDE (Transparent Data Encryption)
- File Storage: AES-256 encryption for documents
- Backups: Encrypted with separate key
```

#### In Transit
```
- TLS 1.3 for all connections
- mTLS for service-to-service communication
- Certificate pinning in mobile apps
```

#### Sensitive Data Encryption
```go
// Fields encrypted at application level
type Customer struct {
    ID        uuid.UUID
    Name      string
    Phone     string     // Encrypted
    Email     string     // Encrypted
    GSTIN     string     // Encrypted
    BankDetails string   // Encrypted
}

// Encryption using AES-256-GCM
func Encrypt(plaintext string, key []byte) (string, error)
func Decrypt(ciphertext string, key []byte) (string, error)
```

### Data Masking

```go
// Mask sensitive data in logs and responses
func MaskPhone(phone string) string {
    // "9876543210" → "98****3210"
}

func MaskEmail(email string) string {
    // "user@example.com" → "us**@example.com"
}

func MaskGSTIN(gstin string) string {
    // "27AABCU9603R1ZM" → "27****9603****"
}
```

### Audit Logging

```go
type AuditLog struct {
    ID          uuid.UUID
    TenantID    uuid.UUID
    UserID      uuid.UUID
    Action      string    // create, update, delete, view
    Resource    string    // transaction, invoice, etc.
    ResourceID  uuid.UUID
    OldValue    JSONB     // Previous state (for updates)
    NewValue    JSONB     // New state
    IPAddress   string
    UserAgent   string
    Timestamp   time.Time
}

// Events logged:
// - All CRUD operations
// - Login/logout
// - Permission changes
// - Settings changes
// - Export operations
// - Failed access attempts
```

---

## API Security

### Rate Limiting

```go
// Per-tenant limits
RateLimits := map[string]RateLimit{
    "starter":    {RequestsPerMinute: 100},
    "growth":     {RequestsPerMinute: 500},
    "business":   {RequestsPerMinute: 2000},
    "enterprise": {RequestsPerMinute: 10000},
}

// Per-endpoint limits (to prevent abuse)
EndpointLimits := map[string]int{
    "POST /auth/login":     10,   // per minute
    "POST /auth/otp":       5,    // per minute
    "POST /invoices":       100,  // per minute
    "GET /reports/*":       50,   // per minute
}
```

### Input Validation

```go
// All inputs validated and sanitized
type CreateInvoiceRequest struct {
    CustomerID uuid.UUID `json:"customer_id" validate:"required,uuid"`
    InvoiceDate string   `json:"invoice_date" validate:"required,date"`
    Items []InvoiceItem  `json:"items" validate:"required,min=1,max=100"`
    Notes string         `json:"notes" validate:"max=1000"`
}

// SQL injection prevention via parameterized queries
// XSS prevention via output encoding
// CSRF protection via tokens
```

### CORS Configuration

```go
CORSConfig := cors.Config{
    AllowOrigins: []string{
        "https://*.bookkeep.app",
        "https://bookkeep.app",
    },
    AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders: []string{"Authorization", "Content-Type", "X-Tenant-ID"},
    AllowCredentials: true,
    MaxAge: 12 * time.Hour,
}
```

### Security Headers

```go
// Applied to all responses
SecurityHeaders := map[string]string{
    "X-Content-Type-Options":    "nosniff",
    "X-Frame-Options":           "DENY",
    "X-XSS-Protection":          "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy":   "default-src 'self'",
    "Referrer-Policy":           "strict-origin-when-cross-origin",
}
```

---

## Session Management

### Session Security

```go
type Session struct {
    ID           uuid.UUID
    UserID       uuid.UUID
    TenantID     uuid.UUID
    DeviceInfo   string
    IPAddress    string
    RefreshToken string    // Hashed
    CreatedAt    time.Time
    LastActive   time.Time
    ExpiresAt    time.Time
    IsRevoked    bool
}
```

### Session Controls
- Maximum active sessions per user: 5
- Session timeout after inactivity: 30 days
- Force logout from all devices
- Session list with device info
- Revoke individual sessions

### Device Trust

```go
type TrustedDevice struct {
    ID          uuid.UUID
    UserID      uuid.UUID
    DeviceID    string    // Fingerprint
    DeviceName  string    // "iPhone 15 Pro"
    LastUsed    time.Time
    IsTrusted   bool
}

// Skip 2FA for trusted devices
// Alert user on new device login
```

---

## Compliance

### Data Privacy

#### GDPR Compliance (for future EU expansion)
- Right to access: Export all user data
- Right to deletion: Complete data deletion
- Data portability: Export in standard formats
- Consent management: Track consent for data processing

#### India's Digital Personal Data Protection Act
- Data localization: India data stored in India
- Consent mechanism: Clear consent for data collection
- Data retention: Define retention periods
- Breach notification: 72-hour breach reporting

### Financial Compliance

#### Data Retention
```
- Financial transactions: 8 years (as per Income Tax Act)
- Invoices: 8 years
- Audit logs: 5 years
- User data: Until account deletion + 90 days
```

#### Backup Requirements
```
- Daily backups: Retained for 30 days
- Weekly backups: Retained for 1 year
- Monthly backups: Retained for 7 years
- Point-in-time recovery: Up to 7 days
```

---

## Security Best Practices Checklist

### Development
- [ ] No secrets in code (use environment variables)
- [ ] Dependency vulnerability scanning
- [ ] Static code analysis (SAST)
- [ ] Input validation on all endpoints
- [ ] Parameterized database queries
- [ ] Output encoding for XSS prevention

### Deployment
- [ ] HTTPS everywhere (HSTS enabled)
- [ ] WAF configured
- [ ] DDoS protection enabled
- [ ] Regular security patches
- [ ] Minimal container privileges
- [ ] Network segmentation

### Monitoring
- [ ] Failed login alerting
- [ ] Anomaly detection
- [ ] Rate limit breach alerts
- [ ] Error rate monitoring
- [ ] Security log aggregation

### Incident Response
- [ ] Incident response plan documented
- [ ] Security contact established
- [ ] Breach notification process
- [ ] Regular security drills
