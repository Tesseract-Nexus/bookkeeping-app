# API Design

## API Standards

### Base URL Structure
```
Production: https://api.bookkeep.app/v1
Staging:    https://api.staging.bookkeep.app/v1
```

### Versioning
- URL-based versioning: `/v1/`, `/v2/`
- Breaking changes require new version
- Deprecation notice 6 months before removal

### Authentication
All endpoints (except auth) require Bearer token:
```
Authorization: Bearer <access_token>
```

### Content Type
```
Content-Type: application/json
Accept: application/json
```

### Tenant Context
Multi-tenant context via header:
```
X-Tenant-ID: <tenant_uuid>
```
(Usually extracted from JWT claims)

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "request_id": "req_abc123"
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## API Endpoints

### Authentication Service

#### Register
```http
POST /v1/auth/register
```

Request:
```json
{
  "phone": "+919876543210",
  "email": "owner@store.com",
  "password": "SecurePass123!",
  "first_name": "Raj",
  "last_name": "Kumar",
  "business_name": "Raj Electronics",
  "business_type": "retail"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "tenant_id": "uuid",
    "verification_required": true,
    "verification_type": "phone"
  }
}
```

#### Login
```http
POST /v1/auth/login
```

Request (Phone + OTP):
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

Request (Email + Password):
```json
{
  "email": "owner@store.com",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "id": "uuid",
      "email": "owner@store.com",
      "phone": "+919876543210",
      "first_name": "Raj",
      "last_name": "Kumar"
    },
    "tenant": {
      "id": "uuid",
      "name": "Raj Electronics",
      "slug": "raj-electronics"
    }
  }
}
```

#### Request OTP
```http
POST /v1/auth/otp/request
```

Request:
```json
{
  "phone": "+919876543210",
  "purpose": "login"
}
```

#### Verify OTP
```http
POST /v1/auth/otp/verify
```

Request:
```json
{
  "phone": "+919876543210",
  "otp": "123456",
  "purpose": "login"
}
```

#### Refresh Token
```http
POST /v1/auth/refresh
```

Request:
```json
{
  "refresh_token": "eyJhbGc..."
}
```

#### Logout
```http
POST /v1/auth/logout
```

#### Get Profile
```http
GET /v1/auth/profile
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "owner@store.com",
      "phone": "+919876543210",
      "first_name": "Raj",
      "last_name": "Kumar",
      "avatar_url": "https://...",
      "is_email_verified": true,
      "is_phone_verified": true
    },
    "tenants": [
      {
        "id": "uuid",
        "name": "Raj Electronics",
        "slug": "raj-electronics",
        "role": "owner",
        "is_primary": true
      }
    ],
    "current_tenant": {
      "id": "uuid",
      "name": "Raj Electronics"
    },
    "permissions": ["*:*"]
  }
}
```

---

### Transactions Service

#### List Transactions
```http
GET /v1/transactions
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Page number (default: 1) |
| `per_page` | int | Items per page (default: 20, max: 100) |
| `type` | string | Filter by type: sale, purchase, expense, etc. |
| `from_date` | date | Start date (YYYY-MM-DD) |
| `to_date` | date | End date (YYYY-MM-DD) |
| `party_id` | uuid | Filter by customer/vendor |
| `store_id` | uuid | Filter by store |
| `search` | string | Search in description |
| `sort` | string | Sort field (default: -transaction_date) |

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "transaction_number": "TXN-2025-0001",
      "transaction_date": "2025-01-03",
      "transaction_type": "sale",
      "party": {
        "id": "uuid",
        "name": "Customer Name"
      },
      "description": "Sale of electronics",
      "total_amount": 15000.00,
      "payment_mode": "upi",
      "status": "posted"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 245
  }
}
```

#### Create Transaction
```http
POST /v1/transactions
```

Request:
```json
{
  "transaction_date": "2025-01-03",
  "transaction_type": "sale",
  "party_id": "uuid",
  "description": "Sale of electronics",
  "lines": [
    {
      "account_id": "uuid",
      "description": "TV Sale",
      "debit_amount": 0,
      "credit_amount": 15000.00,
      "tax_rate_id": "uuid"
    },
    {
      "account_id": "uuid",
      "description": "Cash received",
      "debit_amount": 15000.00,
      "credit_amount": 0
    }
  ],
  "payment_mode": "cash",
  "notes": "Customer paid in cash"
}
```

#### Quick Sale (Simplified)
```http
POST /v1/transactions/quick-sale
```

Request:
```json
{
  "date": "2025-01-03",
  "customer_id": "uuid",
  "items": [
    {
      "description": "Samsung TV 43\"",
      "quantity": 1,
      "rate": 35000,
      "tax_rate": 18
    }
  ],
  "payment_mode": "upi",
  "payment_reference": "UPI123456"
}
```

#### Get Transaction
```http
GET /v1/transactions/:id
```

#### Update Transaction
```http
PUT /v1/transactions/:id
```

#### Delete Transaction
```http
DELETE /v1/transactions/:id
```

#### Void Transaction
```http
POST /v1/transactions/:id/void
```

---

### Invoices Service

#### List Invoices
```http
GET /v1/invoices
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | sale, purchase |
| `status` | string | draft, sent, paid, overdue |
| `payment_status` | string | unpaid, partial, paid |
| `from_date` | date | Invoice date from |
| `to_date` | date | Invoice date to |
| `party_id` | uuid | Customer/vendor ID |
| `store_id` | uuid | Store ID |
| `search` | string | Search invoice number |

#### Create Invoice
```http
POST /v1/invoices
```

Request:
```json
{
  "invoice_type": "sale",
  "invoice_date": "2025-01-03",
  "due_date": "2025-02-02",
  "party_id": "uuid",
  "place_of_supply": "Maharashtra",
  "items": [
    {
      "description": "Samsung TV 43\" Smart LED",
      "hsn_code": "8528",
      "quantity": 1,
      "unit": "pcs",
      "rate": 35000.00,
      "discount_type": "percentage",
      "discount_value": 5,
      "tax_rate": 18
    }
  ],
  "discount_type": "flat",
  "discount_value": 500,
  "notes": "Thank you for your purchase!",
  "terms": "Payment due within 30 days"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_number": "INV-2025-0001",
    "invoice_date": "2025-01-03",
    "due_date": "2025-02-02",
    "party": {
      "id": "uuid",
      "name": "Customer Name",
      "gstin": "27AABCU9603R1ZM"
    },
    "items": [...],
    "subtotal": 35000.00,
    "discount_amount": 2250.00,
    "taxable_amount": 32750.00,
    "cgst_amount": 2947.50,
    "sgst_amount": 2947.50,
    "total_amount": 38645.00,
    "balance_amount": 38645.00,
    "payment_status": "unpaid",
    "status": "draft"
  }
}
```

#### Get Invoice
```http
GET /v1/invoices/:id
```

#### Update Invoice
```http
PUT /v1/invoices/:id
```

#### Send Invoice
```http
POST /v1/invoices/:id/send
```

Request:
```json
{
  "channels": ["email", "whatsapp"],
  "email": "customer@email.com",
  "phone": "+919876543210",
  "message": "Please find attached invoice"
}
```

#### Record Payment
```http
POST /v1/invoices/:id/payments
```

Request:
```json
{
  "payment_date": "2025-01-03",
  "amount": 20000.00,
  "payment_mode": "bank_transfer",
  "payment_reference": "NEFT123456",
  "bank_account_id": "uuid",
  "notes": "Partial payment received"
}
```

#### Generate E-Invoice
```http
POST /v1/invoices/:id/e-invoice
```

Response:
```json
{
  "success": true,
  "data": {
    "irn": "a1b2c3d4e5f6...",
    "ack_number": "123456789012",
    "ack_date": "2025-01-03T10:30:00Z",
    "signed_qr_code": "..."
  }
}
```

#### Generate E-Way Bill
```http
POST /v1/invoices/:id/eway-bill
```

Request:
```json
{
  "transporter_id": "12ABCDE1234F1Z5",
  "transporter_name": "Fast Logistics",
  "vehicle_number": "MH12AB1234",
  "vehicle_type": "regular",
  "transport_mode": "road",
  "distance": 150
}
```

#### Download PDF
```http
GET /v1/invoices/:id/pdf
```

#### Duplicate Invoice
```http
POST /v1/invoices/:id/duplicate
```

#### Convert Quotation to Invoice
```http
POST /v1/invoices/:id/convert
```

---

### Customers Service

#### List Customers
```http
GET /v1/customers
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | customer, vendor, both |
| `search` | string | Search name, phone, email |
| `has_balance` | bool | Filter by outstanding balance |
| `is_active` | bool | Filter by active status |

#### Create Customer
```http
POST /v1/customers
```

Request:
```json
{
  "name": "Sharma Electronics",
  "party_type": "customer",
  "email": "sharma@electronics.com",
  "phone": "+919876543210",
  "gstin": "27AABCS1429B1Z2",
  "billing_address_line1": "123 Market Street",
  "billing_city": "Mumbai",
  "billing_state": "Maharashtra",
  "billing_pincode": "400001",
  "credit_limit": 100000,
  "credit_period_days": 30
}
```

#### Get Customer
```http
GET /v1/customers/:id
```

#### Update Customer
```http
PUT /v1/customers/:id
```

#### Get Customer Ledger
```http
GET /v1/customers/:id/ledger
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `from_date` | date | Start date |
| `to_date` | date | End date |

Response:
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "uuid",
      "name": "Sharma Electronics"
    },
    "opening_balance": 5000.00,
    "entries": [
      {
        "date": "2025-01-01",
        "type": "invoice",
        "reference": "INV-2025-0001",
        "description": "Sale Invoice",
        "debit": 15000.00,
        "credit": 0,
        "balance": 20000.00
      },
      {
        "date": "2025-01-02",
        "type": "payment",
        "reference": "REC-2025-0001",
        "description": "Payment Received",
        "debit": 0,
        "credit": 10000.00,
        "balance": 10000.00
      }
    ],
    "closing_balance": 10000.00,
    "total_debit": 15000.00,
    "total_credit": 10000.00
  }
}
```

#### Get Customer Statement
```http
GET /v1/customers/:id/statement
```

#### Send Statement
```http
POST /v1/customers/:id/send-statement
```

---

### Reports Service

#### Profit & Loss
```http
GET /v1/reports/profit-loss
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `from_date` | date | Period start |
| `to_date` | date | Period end |
| `compare_with` | string | previous_period, previous_year |
| `store_id` | uuid | Filter by store |

Response:
```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2025-01-01",
      "to": "2025-01-31"
    },
    "revenue": {
      "sales": 500000.00,
      "other_income": 5000.00,
      "total": 505000.00
    },
    "expenses": {
      "cost_of_goods_sold": 300000.00,
      "operating_expenses": {
        "rent": 25000.00,
        "salaries": 50000.00,
        "utilities": 5000.00,
        "marketing": 10000.00,
        "other": 15000.00,
        "total": 105000.00
      },
      "total": 405000.00
    },
    "gross_profit": 200000.00,
    "gross_margin_percent": 39.6,
    "operating_profit": 100000.00,
    "net_profit": 100000.00,
    "net_margin_percent": 19.8
  }
}
```

#### Balance Sheet
```http
GET /v1/reports/balance-sheet
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `as_of` | date | Balance as of date |

#### Cash Flow
```http
GET /v1/reports/cash-flow
```

#### GST Summary
```http
GET /v1/reports/gst-summary
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `month` | int | Month (1-12) |
| `year` | int | Year |

Response:
```json
{
  "success": true,
  "data": {
    "period": "January 2025",
    "outward_supplies": {
      "taxable_value": 500000.00,
      "cgst": 45000.00,
      "sgst": 45000.00,
      "igst": 0,
      "cess": 0,
      "total_tax": 90000.00
    },
    "inward_supplies": {
      "taxable_value": 300000.00,
      "cgst": 27000.00,
      "sgst": 27000.00,
      "igst": 0,
      "cess": 0,
      "total_tax": 54000.00
    },
    "tax_liability": {
      "cgst": 18000.00,
      "sgst": 18000.00,
      "igst": 0,
      "total": 36000.00
    }
  }
}
```

#### GSTR-1 Data
```http
GET /v1/reports/gstr1
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `month` | int | Month |
| `year` | int | Year |
| `format` | string | json, excel |

#### Receivables Aging
```http
GET /v1/reports/receivables-aging
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "current": 100000.00,
      "1_30_days": 50000.00,
      "31_60_days": 25000.00,
      "61_90_days": 10000.00,
      "over_90_days": 5000.00,
      "total": 190000.00
    },
    "by_customer": [
      {
        "customer": {
          "id": "uuid",
          "name": "Sharma Electronics"
        },
        "current": 20000.00,
        "1_30_days": 10000.00,
        "31_60_days": 0,
        "61_90_days": 0,
        "over_90_days": 0,
        "total": 30000.00
      }
    ]
  }
}
```

#### Dashboard Summary
```http
GET /v1/reports/dashboard
```

Response:
```json
{
  "success": true,
  "data": {
    "today": {
      "sales": 45000.00,
      "expenses": 5000.00,
      "net": 40000.00,
      "invoices_created": 5,
      "payments_received": 3
    },
    "this_month": {
      "sales": 500000.00,
      "expenses": 150000.00,
      "net": 350000.00,
      "sales_change_percent": 12.5
    },
    "outstanding": {
      "receivables": 190000.00,
      "payables": 75000.00
    },
    "cash_position": {
      "cash_in_hand": 50000.00,
      "bank_balance": 250000.00,
      "total": 300000.00
    },
    "recent_transactions": [...],
    "overdue_invoices": [...]
  }
}
```

---

### Tax Service

#### Calculate Tax
```http
POST /v1/tax/calculate
```

Request:
```json
{
  "amount": 10000.00,
  "tax_rate": 18,
  "is_inclusive": false,
  "place_of_supply": "Maharashtra",
  "seller_state": "Maharashtra"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "taxable_amount": 10000.00,
    "is_interstate": false,
    "cgst_rate": 9,
    "cgst_amount": 900.00,
    "sgst_rate": 9,
    "sgst_amount": 900.00,
    "igst_rate": 0,
    "igst_amount": 0,
    "total_tax": 1800.00,
    "total_amount": 11800.00
  }
}
```

#### Search HSN Codes
```http
GET /v1/tax/hsn-codes
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search code or description |
| `type` | string | hsn, sac |

#### Validate GSTIN
```http
GET /v1/tax/validate-gstin/:gstin
```

Response:
```json
{
  "success": true,
  "data": {
    "gstin": "27AABCU9603R1ZM",
    "is_valid": true,
    "legal_name": "Business Legal Name",
    "trade_name": "Business Trade Name",
    "status": "Active",
    "state": "Maharashtra",
    "state_code": "27"
  }
}
```

---

### Settings Service

#### Get Business Settings
```http
GET /v1/settings
```

#### Update Business Settings
```http
PUT /v1/settings
```

Request:
```json
{
  "business": {
    "name": "Raj Electronics",
    "gstin": "27AABCU9603R1ZM",
    "pan": "AABCU9603R"
  },
  "invoice": {
    "sale_prefix": "INV",
    "default_due_days": 30,
    "show_hsn": true
  },
  "notifications": {
    "email_on_payment": true,
    "sms_on_invoice": true
  }
}
```

#### Get Invoice Templates
```http
GET /v1/settings/invoice-templates
```

---

### Sync Service (Mobile)

#### Push Changes
```http
POST /v1/sync/push
```

Request:
```json
{
  "device_id": "device_uuid",
  "last_sync_at": "2025-01-03T10:00:00Z",
  "changes": [
    {
      "entity": "transaction",
      "action": "create",
      "data": {...},
      "local_id": "local_uuid",
      "timestamp": "2025-01-03T10:05:00Z"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "synced": [
      {
        "local_id": "local_uuid",
        "server_id": "server_uuid",
        "status": "created"
      }
    ],
    "conflicts": [],
    "errors": []
  }
}
```

#### Pull Changes
```http
GET /v1/sync/pull
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| `since` | timestamp | Last sync timestamp |
| `entities` | string | Comma-separated entity types |

Response:
```json
{
  "success": true,
  "data": {
    "changes": [
      {
        "entity": "customer",
        "action": "update",
        "data": {...},
        "timestamp": "2025-01-03T10:10:00Z"
      }
    ],
    "deleted": [
      {
        "entity": "transaction",
        "id": "uuid"
      }
    ],
    "sync_token": "abc123"
  }
}
```

---

## Webhooks

### Webhook Events
```
invoice.created
invoice.paid
invoice.overdue
payment.received
customer.created
gst.return_due
```

### Webhook Payload
```json
{
  "event": "invoice.paid",
  "timestamp": "2025-01-03T10:30:00Z",
  "data": {
    "invoice_id": "uuid",
    "invoice_number": "INV-2025-0001",
    "amount_paid": 38645.00,
    "payment_mode": "bank_transfer"
  },
  "tenant_id": "uuid"
}
```

### Webhook Security
- Signature header: `X-BookKeep-Signature`
- HMAC-SHA256 signature of payload
- Timestamp validation (5-minute window)

---

## Rate Limits

| Plan | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Starter | 100 | 5,000 |
| Growth | 500 | 25,000 |
| Business | 2,000 | 100,000 |
| Enterprise | Custom | Custom |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704292800
```

---

## SDK Support

### Official SDKs
- JavaScript/TypeScript
- Python
- Go

### Example (JavaScript)
```javascript
import { BookKeepClient } from '@bookkeep/sdk';

const client = new BookKeepClient({
  apiKey: 'your_api_key',
  tenantId: 'your_tenant_id'
});

// Create invoice
const invoice = await client.invoices.create({
  partyId: 'customer_uuid',
  invoiceDate: '2025-01-03',
  items: [...]
});

// List transactions
const transactions = await client.transactions.list({
  fromDate: '2025-01-01',
  type: 'sale'
});
```
