# Features & Functionality

## Core Feature Set

### 1. Dashboard & Home

#### Quick Overview
- Today's summary (sales, expenses, profit)
- Outstanding receivables and payables
- Cash in hand / bank balance
- Recent transactions (last 5)
- Quick action buttons

#### Key Metrics (Mobile-First Cards)
```
┌─────────────────┐  ┌─────────────────┐
│   Today's Sale  │  │ Today's Expense │
│    ₹45,230      │  │    ₹12,450      │
│     ↑ 12%       │  │     ↓ 5%        │
└─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│  Cash in Hand   │  │  Bank Balance   │
│    ₹1,25,000    │  │   ₹3,45,000     │
└─────────────────┘  └─────────────────┘

┌─────────────────────────────────────┐
│  📊 Weekly Revenue Trend            │
│  [Mini chart visualization]         │
└─────────────────────────────────────┘
```

#### Smart Alerts
- Low cash alert
- Overdue invoices
- GST filing reminders
- Upcoming payments

---

### 2. Sales Management

#### Sales Invoice
- Create professional invoices in < 30 seconds
- Auto-fill customer details
- Product/service catalog with quick search
- Multiple GST rates support
- Auto-calculate taxes
- Add discounts (% or flat)
- Multiple payment modes
- Share via WhatsApp/Email/SMS

**Invoice Fields**:
```
- Invoice Number (auto-generated, customizable)
- Invoice Date
- Due Date
- Customer (with GSTIN)
- Billing/Shipping Address
- Line Items:
  - Product/Service
  - HSN/SAC Code
  - Quantity
  - Rate
  - Discount
  - GST Rate
  - Amount
- Subtotal
- Tax Breakdown (CGST, SGST, IGST)
- Total
- Notes/Terms
- Bank Details
- Signature (optional)
```

#### Quotation/Estimate
- Create quotes for potential sales
- Convert to invoice with one tap
- Track quote status (sent, viewed, accepted, rejected)
- Quote validity period

#### Delivery Challan
- For goods sent without invoice
- Track pending challans
- Convert to invoice

#### Sales Return (Credit Note)
- Record returns against invoices
- Adjust customer balance
- GST reversal handling

#### Cash Sales
- Quick cash sale (no customer required)
- Daily cash sales summary
- Cash register reconciliation

---

### 3. Purchase Management

#### Purchase Invoice
- Record supplier invoices
- Attach invoice image/PDF
- Auto-extract via OCR
- Track payment status
- GST input credit tracking

#### Purchase Order
- Create purchase orders
- Track PO status
- Convert to purchase invoice

#### Purchase Return (Debit Note)
- Record returns to suppliers
- GST adjustment

#### Expense Recording
- Quick expense entry
- Category-based tracking
- Receipt capture
- Recurring expenses

**Expense Categories**:
```
- Rent
- Utilities (Electricity, Water, Internet)
- Salaries
- Transportation
- Office Supplies
- Marketing
- Professional Services
- Bank Charges
- Insurance
- Maintenance
- Other
```

---

### 4. Inventory Management (Optional Module)

#### Product Catalog
- Add products with variants
- SKU management
- Purchase price / selling price
- GST rates (HSN code)
- Low stock alerts
- Product images

#### Stock Tracking
- Current stock levels
- Stock movement history
- Stock valuation (FIFO/Weighted Average)
- Stock adjustments

#### Stock Transfer (Multi-store)
- Transfer between stores
- Track in-transit stock
- Transfer history

---

### 5. Customer & Vendor Management

#### Customer (Party) Management
- Customer profile with contact info
- GSTIN validation
- Credit limit setting
- Customer-wise ledger
- Outstanding balance
- Payment history
- Transaction history

#### Vendor Management
- Supplier profiles
- TDS applicability
- Vendor-wise ledger
- Payable tracking

#### Smart Features
- Duplicate detection
- Bulk import (CSV/Excel)
- Contact sync from phone
- Quick search with filters

---

### 6. Banking & Cash

#### Bank Accounts
- Add multiple bank accounts
- Bank statement import
- Auto-reconciliation
- Transaction categorization

#### Cash Book
- Cash in/out entries
- Cash register management
- Daily cash balance
- Cash reconciliation

#### Bank Reconciliation
- Match bank transactions
- Identify discrepancies
- Auto-matching suggestions

---

### 7. GST Compliance (India)

#### GST Configuration
- GSTIN setup
- Tax rate configuration
- HSN/SAC code library
- Place of supply rules

#### E-Invoice
- Generate IRN (Invoice Reference Number)
- QR code on invoices
- Auto-upload to GST portal
- E-invoice cancellation

#### E-Way Bill
- Generate e-way bills
- Multi-vehicle support
- Extend validity
- Cancellation

#### GST Returns Preparation
- GSTR-1 data (sales)
- GSTR-3B summary
- GSTR-2A/2B reconciliation
- Input tax credit matching
- Export data for filing

#### TDS Management
- TDS deduction tracking
- TDS payment reminders
- Form 26AS reconciliation

---

### 8. Reports & Analytics

#### Financial Reports
- **Profit & Loss Statement**: Period-wise P&L
- **Balance Sheet**: Assets, liabilities, equity
- **Cash Flow Statement**: Cash movement analysis
- **Trial Balance**: Account-wise balances

#### Business Reports
- Sales report (daily/weekly/monthly)
- Purchase report
- Expense report by category
- Customer-wise sales
- Product-wise sales
- Outstanding receivables (aging)
- Outstanding payables (aging)

#### GST Reports
- GST summary
- GSTR-1 format
- GSTR-3B summary
- HSN-wise summary
- Tax liability report

#### Insights & Analytics
- Revenue trends
- Expense patterns
- Top customers
- Top products
- Profit margins
- YoY comparison

---

### 9. Settings & Configuration

#### Business Profile
- Business name & logo
- GSTIN & PAN
- Business address
- Contact information
- Financial year settings

#### Invoice Customization
- Invoice prefix/numbering
- Invoice template selection
- Custom fields
- Terms & conditions
- Bank details
- Digital signature

#### User Management
- Add team members
- Role assignment
- Permission control
- Activity logs

#### Preferences
- Currency format
- Date format
- Language preference
- Notification settings
- Theme (light/dark)

---

### 10. Offline & Sync

#### Offline Mode
- Create transactions offline
- View recent data
- Queue actions for sync
- Visual sync status indicator

#### Sync Management
- Auto-sync when online
- Manual sync trigger
- Conflict resolution
- Sync history

---

### 11. Import & Export

#### Import
- Tally import
- Excel/CSV import
- Bank statement import
- Customer/vendor bulk import

#### Export
- PDF export (invoices, reports)
- Excel export
- GST JSON export
- Data backup

---

### 12. Integrations

#### Payment Collection
- Razorpay payment links
- UPI QR code generation
- Payment status tracking

#### Communication
- WhatsApp Business integration
- SMS gateway
- Email service

#### Banking
- Bank feed integration
- Open banking APIs

#### E-commerce
- Shopify sync
- WooCommerce sync
- Custom API webhooks

---

## Feature Access by Plan

| Feature | Starter | Growth | Business | Enterprise |
|---------|---------|--------|----------|------------|
| Sales Invoices | 500/mo | 2000/mo | Unlimited | Unlimited |
| Purchase Recording | ✓ | ✓ | ✓ | ✓ |
| GST Compliance | ✓ | ✓ | ✓ | ✓ |
| E-Invoice | - | ✓ | ✓ | ✓ |
| E-Way Bill | - | ✓ | ✓ | ✓ |
| Multi-store | - | 3 stores | 10 stores | Unlimited |
| Team Members | 1 | 5 | 20 | Unlimited |
| Bank Integration | - | ✓ | ✓ | ✓ |
| Inventory | - | ✓ | ✓ | ✓ |
| Custom Reports | - | - | ✓ | ✓ |
| API Access | - | - | ✓ | ✓ |
| Priority Support | - | - | ✓ | ✓ |
| Dedicated Manager | - | - | - | ✓ |
| Custom Integration | - | - | - | ✓ |

---

## User Flows

### First-Time Setup Flow
```
1. Download App / Visit Website
2. Sign Up (Phone/Email)
3. OTP Verification
4. Business Setup Wizard:
   - Business Name
   - Business Type (Retail/Service/Wholesale)
   - GSTIN (optional)
   - Bank Details (optional)
5. Dashboard Tour (Optional)
6. Create First Invoice or Record First Sale
```

### Daily Usage Flow (Store Owner)
```
Morning:
1. Open app → See dashboard summary
2. Check yesterday's closing
3. View pending payments

During Business:
4. Record sales (cash/credit)
5. Create invoices
6. Record expenses
7. Accept payments

End of Day:
8. Cash reconciliation
9. Check today's P&L
10. Send payment reminders
```

### Monthly Flow
```
1. Review monthly P&L
2. Reconcile bank statements
3. Check GST liability
4. Prepare GSTR-1 data
5. File GST returns (via portal)
6. Follow up on overdue payments
7. Pay vendors
```
