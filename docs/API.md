# BookKeep API Documentation

## Base URL

```
Production: https://api.bookkeep.in/api/v1
Development: http://localhost:8080/api/v1
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Multi-Tenant Context

For tenant-scoped endpoints, include the tenant ID:

```
X-Tenant-ID: <tenant_uuid>
```

Or use path-based routing: `/api/v1/tenants/{tenant_id}/...`

---

## Auth Service

### Request OTP

```http
POST /auth/request-otp
```

**Request Body:**
```json
{
  "phone": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### Verify OTP

```http
POST /auth/verify-otp
```

**Request Body:**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "phone": "+919876543210",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

### Register

```http
POST /auth/register
```

**Request Body:**
```json
{
  "phone": "+919876543210",
  "email": "john@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "business_name": "John's Store"
}
```

### Login with Email

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### Refresh Token

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

---

## Tenant Service

### Create Tenant

```http
POST /tenants
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "My Business",
  "legal_name": "My Business Pvt Ltd",
  "gstin": "27AABCU9603R1ZM",
  "pan": "AABCU9603R",
  "email": "business@example.com",
  "phone": "+919876543210",
  "address_line1": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "state_code": "27",
  "pin_code": "400001"
}
```

### Get My Tenants

```http
GET /tenants/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tenant-uuid",
      "tenant": {
        "id": "tenant-uuid",
        "name": "My Business",
        "slug": "my-business-abc123"
      },
      "role": {
        "id": "role-uuid",
        "name": "Owner"
      },
      "status": "active"
    }
  ]
}
```

### Get Tenant Details

```http
GET /tenants/{tenant_id}
Authorization: Bearer <token>
```

### Update Tenant

```http
PUT /tenants/{tenant_id}
Authorization: Bearer <token>
```

**Required Permission:** `tenant:edit`

### List Team Members

```http
GET /tenants/{tenant_id}/members
Authorization: Bearer <token>
```

**Required Permission:** `team:view`

### Invite Member

```http
POST /tenants/{tenant_id}/invitations
Authorization: Bearer <token>
```

**Required Permission:** `team:invite`

**Request Body:**
```json
{
  "email": "staff@example.com",
  "phone": "+919876543211",
  "role_id": "role-uuid",
  "message": "Welcome to the team!"
}
```

### Accept Invitation

```http
POST /invitations/{token}/accept
Authorization: Bearer <token>
```

### Update Member Role

```http
PUT /tenants/{tenant_id}/members/{member_id}
Authorization: Bearer <token>
```

**Required Permission:** `team:edit`

**Request Body:**
```json
{
  "role_id": "new-role-uuid",
  "status": "active"
}
```

### Remove Member

```http
DELETE /tenants/{tenant_id}/members/{member_id}
Authorization: Bearer <token>
```

**Required Permission:** `team:remove`

### List Roles

```http
GET /tenants/{tenant_id}/roles
Authorization: Bearer <token>
```

### Get My Permissions

```http
GET /tenants/{tenant_id}/permissions/me
Authorization: Bearer <token>
```

---

## Customer Service

### List Customers

```http
GET /customers
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Query Parameters:**
- `search`: Search by name, email, phone
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset
- `is_active`: Filter by active status

### Create Customer

```http
POST /customers
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Required Permission:** `party:create`

**Request Body:**
```json
{
  "name": "Customer Name",
  "gstin": "27AABCU9603R1ZM",
  "email": "customer@example.com",
  "phone": "+919876543210",
  "address_line1": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "state_code": "27",
  "pin_code": "400001",
  "credit_limit": 50000,
  "credit_period": 30
}
```

### Get Customer

```http
GET /customers/{id}
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

### Update Customer

```http
PUT /customers/{id}
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Required Permission:** `party:edit`

### Delete Customer

```http
DELETE /customers/{id}
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Required Permission:** `party:delete`

### Get Customer Ledger

```http
GET /customers/{id}/ledger
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Query Parameters:**
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

---

## Bookkeeping Service

### List Accounts

```http
GET /accounts
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Query Parameters:**
- `type`: Filter by account type (asset, liability, equity, income, expense)
- `is_active`: Filter by active status

### Create Account

```http
POST /accounts
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Request Body:**
```json
{
  "code": "1001",
  "name": "Cash in Hand",
  "type": "asset",
  "sub_type": "current_asset",
  "opening_balance": 10000
}
```

### List Transactions

```http
GET /transactions
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Query Parameters:**
- `type`: sale, purchase, expense, payment, receipt
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `party_id`: Filter by party
- `limit`: Number of results
- `offset`: Pagination offset

### Quick Sale

```http
POST /transactions/quick-sale
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Required Permission:** `transaction:create`

**Request Body:**
```json
{
  "amount": 1000,
  "description": "Cash sale",
  "payment_mode": "cash",
  "party_name": "Walk-in Customer",
  "date": "2024-01-15"
}
```

### Quick Expense

```http
POST /transactions/quick-expense
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Required Permission:** `transaction:create`

**Request Body:**
```json
{
  "amount": 500,
  "description": "Office supplies",
  "payment_mode": "cash",
  "category": "office_expenses",
  "date": "2024-01-15"
}
```

### Create Transaction

```http
POST /transactions
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Required Permission:** `transaction:create`

**Request Body:**
```json
{
  "type": "sale",
  "date": "2024-01-15",
  "party_id": "party-uuid",
  "description": "Sales invoice #INV-001",
  "lines": [
    {
      "account_id": "account-uuid",
      "debit_amount": 1180,
      "credit_amount": 0,
      "description": "Cash received"
    },
    {
      "account_id": "sales-account-uuid",
      "debit_amount": 0,
      "credit_amount": 1000,
      "description": "Sales"
    },
    {
      "account_id": "gst-account-uuid",
      "debit_amount": 0,
      "credit_amount": 180,
      "description": "GST 18%"
    }
  ]
}
```

---

## Invoice Service

### List Invoices

```http
GET /invoices
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Query Parameters:**
- `type`: sales, purchase, credit_note, debit_note
- `status`: draft, sent, paid, partially_paid, overdue, cancelled
- `party_id`: Filter by party
- `start_date`: Filter by invoice date
- `end_date`: Filter by invoice date
- `limit`: Number of results
- `offset`: Pagination offset

### Create Invoice

```http
POST /invoices
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Required Permission:** `invoice:create`

**Request Body:**
```json
{
  "type": "sales",
  "party_id": "party-uuid",
  "invoice_date": "2024-01-15",
  "due_date": "2024-02-14",
  "place_of_supply": "Maharashtra",
  "items": [
    {
      "description": "Product A",
      "hsn_sac_code": "84713010",
      "quantity": 2,
      "unit": "nos",
      "rate": 5000,
      "cgst_rate": 9,
      "sgst_rate": 9
    }
  ],
  "notes": "Thank you for your business",
  "terms": "Payment due within 30 days"
}
```

### Get Invoice

```http
GET /invoices/{id}
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

### Update Invoice

```http
PUT /invoices/{id}
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Required Permission:** `invoice:edit`
**Note:** Only draft invoices can be edited

### Send Invoice

```http
POST /invoices/{id}/send
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Required Permission:** `invoice:send`

**Request Body:**
```json
{
  "email": "customer@example.com",
  "message": "Please find attached invoice"
}
```

### Record Payment

```http
POST /invoices/{id}/payments
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Request Body:**
```json
{
  "amount": 5000,
  "date": "2024-01-20",
  "payment_mode": "bank",
  "reference": "NEFT-123456"
}
```

### Download Invoice PDF

```http
GET /invoices/{id}/pdf
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

---

## Report Service

### Dashboard

```http
GET /reports/dashboard
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "sales": 15000,
      "expenses": 2500,
      "transactions_count": 12
    },
    "this_month": {
      "sales": 250000,
      "expenses": 75000,
      "sales_change_percent": 12.5
    },
    "outstanding": {
      "receivables": 125000,
      "payables": 45000
    },
    "cash_position": {
      "cash_in_hand": 50000,
      "bank_balance": 175000,
      "total": 225000
    },
    "recent_transactions": [...]
  }
}
```

### Profit & Loss

```http
GET /reports/profit-loss
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Query Parameters:**
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

### Balance Sheet

```http
GET /reports/balance-sheet
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Query Parameters:**
- `as_of_date`: Date for balance sheet (YYYY-MM-DD)

### GST Report

```http
GET /reports/gst
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Query Parameters:**
- `report_type`: gstr1, gstr3b
- `month`: Month (1-12)
- `year`: Year (YYYY)

### Aging Report

```http
GET /reports/aging
Authorization: Bearer <token>
X-Tenant-ID: <tenant_id>
```

**Query Parameters:**
- `type`: receivables, payables
- `as_of_date`: Date for aging calculation

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| General API | 100 | 1 minute |
| Auth endpoints | 10 | 1 minute |
| OTP requests | 5 | 1 hour per phone |
| Report generation | 20 | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Pagination

List endpoints support pagination via query parameters:

```
?limit=20&offset=0
```

**Response includes:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

## Webhooks (Coming Soon)

Subscribe to events:
- `invoice.created`
- `invoice.paid`
- `transaction.created`
- `payment.received`
