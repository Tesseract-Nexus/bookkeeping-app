# Development Testing Guide

## Test Credentials

Use the following credentials for development and testing:

| Field    | Value            |
|----------|------------------|
| Email    | `test@bookkeep.in` |
| Password | `Test@123456`    |

## Local Development Access

### Port Forwarding (Kubernetes)

To access the application locally when running in Kubernetes:

```bash
# Web Application (Frontend)
kubectl port-forward -n devtest svc/bka-web-bookkeeping-web 3000:3000

# Auth Service (API)
kubectl port-forward -n devtest svc/bka-auth-service-bookkeeping-auth-service 8081:8080

# Core Service (Bookkeeping API)
kubectl port-forward -n devtest svc/bka-core-service-bookkeeping-core-service 8084:8080

# Customer Service
kubectl port-forward -n devtest svc/bka-customer-service-bookkeeping-customer-service 8082:8080

# Invoice Service
kubectl port-forward -n devtest svc/bka-invoice-service-bookkeeping-invoice-service 8085:8080

# Report Service
kubectl port-forward -n devtest svc/bka-report-service-bookkeeping-report-service 8086:8080

# Tax Service
kubectl port-forward -n devtest svc/bka-tax-service-bookkeeping-tax-service 8087:8080
```

### Access URLs

| Service          | Local URL                  |
|------------------|----------------------------|
| Web App          | http://localhost:3000      |
| Auth API         | http://localhost:8081      |
| Core API         | http://localhost:8084      |
| Customer API     | http://localhost:8082      |
| Invoice API      | http://localhost:8085      |
| Report API       | http://localhost:8086      |
| Tax API          | http://localhost:8087      |

## API Authentication

### Login Request

```bash
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@bookkeep.in",
    "password": "Test@123456"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "access_token": "<JWT_TOKEN>",
    "refresh_token": "<REFRESH_TOKEN>",
    "expires_in": 900,
    "user": {
      "id": "<USER_ID>",
      "email": "test@bookkeep.in",
      "is_active": true
    }
  }
}
```

### Using the Token

Include the access token in subsequent API requests:

```bash
curl -X GET http://localhost:8084/api/v1/accounts \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-Tenant-ID: <TENANT_ID>"
```

## Creating Additional Test Users

```bash
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123",
    "name": "New User",
    "phone": "+919876543210"
  }'
```

## Docker Compose (Local Development)

For local development without Kubernetes:

```bash
# Start all services
make dev

# Or using docker-compose directly
docker-compose -f docker/docker-compose.yml up -d
```

### Local Docker URLs

| Service          | URL                        |
|------------------|----------------------------|
| Web App          | http://localhost:3000      |
| Auth Service     | http://localhost:8081      |
| Customer Service | http://localhost:8082      |
| Tenant Service   | http://localhost:8083      |
| Core Service     | http://localhost:8084      |
| Invoice Service  | http://localhost:8085      |
| Report Service   | http://localhost:8086      |
| Tax Service      | http://localhost:8087      |
| PostgreSQL       | localhost:5432             |
| Redis            | localhost:6379             |
| NATS             | localhost:4222             |
| MinIO            | http://localhost:9000      |

## Troubleshooting

### Check Service Health

```bash
# Kubernetes
kubectl get pods -n devtest | grep bka

# Check logs
kubectl logs -n devtest deployment/bka-auth-service-bookkeeping-auth-service --tail=50
```

### Common Issues

1. **JWT_SECRET not set**: Services require `JWT_SECRET` environment variable in production mode (`GIN_MODE=release`).

2. **Database connection failed**: Ensure PostgreSQL is running and credentials are correct.

3. **CORS errors**: In production, only allowed origins are permitted. For local development, `localhost:3000` and `localhost:3001` are allowed.

### Stop Port Forwarding

```bash
pkill -f "kubectl port-forward"
```
