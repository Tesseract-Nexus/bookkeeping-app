# BookKeep - Multi-Tenant Bookkeeping SaaS Platform

A production-ready, mobile-first bookkeeping platform for small and medium businesses in India. Features GST compliance, invoicing, expense tracking, multi-tenant RBAC, and comprehensive financial reporting.

## Features

- **Multi-Tenant Architecture**: Secure tenant isolation with role-based access control
- **Team Management**: Owner, Admin, Accountant, Staff, and Viewer roles
- **GST Compliance**: GSTIN validation, HSN codes, e-invoice ready
- **Double-Entry Bookkeeping**: Complete chart of accounts and transaction management
- **Invoicing**: Create, send, and track invoices with PDF generation
- **Financial Reports**: Dashboard, P&L, Balance Sheet, GST reports, Aging reports
- **Mobile App**: React Native/Expo app with offline support
- **Security**: Rate limiting, audit logging, JWT authentication, OTP login

## Quick Start

### Prerequisites

- Node.js 20+
- Go 1.25+
- Docker & Docker Compose
- pnpm 9+

### Setup

```bash
# Clone repository
git clone <repo-url>
cd bookkeeping-app

# Install dependencies
pnpm install

# Start infrastructure
docker-compose -f docker/docker-compose.dev.yml up -d

# Run database migrations
psql $DATABASE_URL < docker/init-db.sql

# Start development servers (in separate terminals)
cd services/auth-service && go run cmd/main.go
cd services/tenant-service && go run cmd/main.go
cd services/customer-service && go run cmd/main.go
cd services/bookkeeping-service && go run cmd/main.go
cd services/invoice-service && go run cmd/main.go
cd services/report-service && go run cmd/main.go

# Start web app
cd apps/web && pnpm dev

# Start mobile app
cd apps/mobile && pnpm start
```

### Development URLs

| Service | Port | Description |
|---------|------|-------------|
| Web App | 3000 | Next.js web application |
| Auth Service | 8081 | Authentication, OTP, JWT |
| Customer Service | 8082 | Customers & Vendors |
| Tenant Service | 8083 | Multi-tenancy & RBAC |
| Bookkeeping Service | 8084 | Transactions & Accounts |
| Invoice Service | 8085 | Invoices & Payments |
| Report Service | 8086 | Dashboard & Reports |

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/architecture/ARCHITECTURE.md) | System architecture & multi-tenancy |
| [Security](./docs/architecture/SECURITY.md) | Security measures & RBAC |
| [API Reference](./docs/API.md) | Complete API documentation |
| [Deployment](./docs/DEPLOYMENT.md) | Production deployment guide |

## Project Structure

```
bookkeeping-app/
├── apps/
│   ├── web/                        # Next.js 15 web application
│   │   ├── app/                    # App router pages
│   │   └── src/                    # Components, hooks, utils
│   └── mobile/                     # React Native/Expo app
│       ├── app/                    # Expo Router screens
│       └── src/                    # Components, stores, lib
├── services/
│   ├── auth-service/               # Authentication (Go/Gin)
│   ├── tenant-service/             # Multi-tenancy & RBAC (Go/Gin)
│   ├── customer-service/           # Customer/Vendor management (Go/Gin)
│   ├── bookkeeping-service/        # Transactions & Accounts (Go/Gin)
│   ├── invoice-service/            # Invoicing (Go/Gin)
│   ├── report-service/             # Reports & Analytics (Go/Gin)
│   └── tax-service/                # GST & Tax calculations (Go/Gin)
├── packages/
│   ├── api-client/                 # TypeScript API client
│   ├── go-shared/                  # Shared Go packages
│   └── ui/                         # Shared UI components
├── docker/
│   ├── docker-compose.dev.yml      # Development environment
│   ├── docker-compose.prod.yml     # Production deployment
│   └── init-db.sql                 # Database schema & migrations
└── docs/                           # Documentation
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Web Frontend | Next.js 15, React 19, TypeScript, TailwindCSS |
| Mobile App | React Native, Expo, NativeWind |
| Backend | Go 1.25, Gin Framework, GORM |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Message Queue | NATS |
| Authentication | JWT + OTP (SMS) |
| Containerization | Docker, Kubernetes |

## RBAC Permissions

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| Owner | Full access | All permissions including billing & deletion |
| Admin | Team & settings management | All except billing & tenant deletion |
| Accountant | Financial operations | Transactions, invoices, reports, GST |
| Staff | Basic operations | Create transactions & invoices |
| Viewer | Read-only | View transactions, invoices, reports |

## API Highlights

```bash
# Request OTP
curl -X POST https://api.bookkeep.in/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Quick Sale
curl -X POST https://api.bookkeep.in/api/v1/transactions/quick-sale \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: <tenant-id>" \
  -d '{"amount": 1000, "description": "Cash sale", "payment_mode": "cash"}'

# Create Invoice
curl -X POST https://api.bookkeep.in/api/v1/invoices \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: <tenant-id>" \
  -d '{"party_id": "uuid", "items": [...]}'
```

## Production Deployment

### Docker Compose

```bash
# Configure environment
cp .env.example .env.prod
nano .env.prod

# Deploy
docker-compose -f docker/docker-compose.prod.yml --env-file .env.prod up -d
```

### Kubernetes

```bash
# Create secrets
kubectl create secret generic bookkeep-secrets --from-env-file=.env.prod

# Deploy
kubectl apply -f k8s/
```

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

## Security Features

- **Rate Limiting**: 100 req/min general, 10 req/min auth, 5 OTP/hour per phone
- **Audit Logging**: All actions logged with user, IP, timestamp
- **RBAC**: Fine-grained permissions for every action
- **Tenant Isolation**: Row-level security in database
- **Security Headers**: HSTS, CSP, XSS protection, etc.
- **Input Validation**: Request validation with sanitization

## Testing

```bash
# Run Go tests
cd services/auth-service && go test ./...

# Run frontend tests
cd apps/web && pnpm test

# Run mobile tests
cd apps/mobile && pnpm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

Proprietary - All rights reserved

## Support

- GitHub Issues: https://github.com/bookkeep/bookkeeping-app/issues
- Email: support@bookkeep.in
