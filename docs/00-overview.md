# BookKeep - Global Bookkeeping SaaS Platform

## Vision

A world-class, mobile-first bookkeeping platform designed for store owners globally, starting with India. Built to handle tax compliance, invoicing, expense tracking, and financial reporting with an intuitive user experience that requires zero accounting knowledge.

## Target Users

**Primary**: Store owners (retail, wholesale, service-based businesses)
- Small to medium business owners
- Single-store and multi-store operators
- Users with limited accounting knowledge
- Mobile-first users who need on-the-go access

## Core Value Proposition

1. **Simplicity First**: No accounting degree required - designed for non-accountants
2. **Mobile Native**: Full functionality on mobile devices
3. **Compliance Built-in**: Automatic GST/tax compliance for India (extensible globally)
4. **Real-time Insights**: Instant financial health visibility
5. **Multi-store Support**: Manage multiple stores from one account

## Tech Stack Overview

| Layer | Technology |
|-------|------------|
| **Frontend Web** | Next.js 16+, React 19, TypeScript 5.x, Tailwind CSS 4.x |
| **Frontend Mobile** | React Native / Expo |
| **Backend Services** | Go 1.25+, Gin Framework |
| **Database** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **Message Broker** | NATS |
| **Authentication** | JWT + OAuth2/OIDC |
| **Infrastructure** | Docker, Kubernetes |
| **Monitoring** | Prometheus, OpenTelemetry |

## Documentation Index

| Document | Description |
|----------|-------------|
| [01-architecture.md](./01-architecture.md) | System architecture and design |
| [02-features.md](./02-features.md) | Core features and functionality |
| [03-rbac-security.md](./03-rbac-security.md) | Role-based access control and security |
| [04-database-schema.md](./04-database-schema.md) | Database design and models |
| [05-api-design.md](./05-api-design.md) | API structure and endpoints |
| [06-ui-ux-design.md](./06-ui-ux-design.md) | UI/UX design system and guidelines |
| [07-india-compliance.md](./07-india-compliance.md) | India GST and tax compliance (Updated Jan 2026) |
| [08-mobile-strategy.md](./08-mobile-strategy.md) | Mobile-first development strategy |
| [09-devops-deployment.md](./09-devops-deployment.md) | DevOps and deployment guide |
| [10-roadmap.md](./10-roadmap.md) | Feature roadmap and phases |
| **[11-mvp-developer-guide.md](./11-mvp-developer-guide.md)** | **MVP Implementation Guide for Developers** |

## Key Principles

### 1. Mobile-First Design
Every feature is designed for mobile first, then adapted for web. The mobile experience should be equal to or better than web.

### 2. Progressive Disclosure
Show only essential information initially. Advanced features reveal themselves as users need them.

### 3. Zero-Learning Curve
Users should be productive within 5 minutes. Natural language, familiar patterns, no jargon.

### 4. Offline Capable
Core features work offline. Sync happens automatically when connected.

### 5. Compliance by Default
Tax calculations, invoice formats, and reports automatically comply with local regulations.

## SaaS Model

### Tenant Isolation
- Each business (tenant) has completely isolated data
- Subdomain-based access: `{business-name}.bookkeep.app`
- Row-level security at database level

### Subscription Tiers

| Tier | Stores | Users | Features |
|------|--------|-------|----------|
| **Starter** | 1 | 1 | Core bookkeeping, 500 invoices/month |
| **Growth** | 3 | 5 | All features, 2000 invoices/month |
| **Business** | 10 | 20 | Unlimited, priority support, API access |
| **Enterprise** | Unlimited | Unlimited | Custom integrations, dedicated support |

## Integration Philosophy

Built to integrate with:
- **Payment Gateways**: Razorpay, PayTM, PhonePe, Stripe
- **Banking**: Open Banking APIs, bank statement imports
- **E-commerce**: Shopify, WooCommerce, custom stores
- **Tax Portals**: GST Portal, TDS Portal
- **Communication**: WhatsApp Business, SMS, Email
