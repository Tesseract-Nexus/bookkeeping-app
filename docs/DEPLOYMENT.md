# BookKeep Deployment Guide

## Prerequisites

- Docker & Docker Compose (v2.0+)
- Node.js 20+ and pnpm
- Go 1.23+
- PostgreSQL 16+
- Redis 7+
- Domain name with DNS access
- SSL certificates (or use Let's Encrypt)

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/bookkeep/bookkeeping-app.git
cd bookkeeping-app
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Download Go dependencies
cd services/auth-service && go mod download && cd ../..
cd services/tenant-service && go mod download && cd ../..
# ... repeat for other services
```

### 3. Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/bookkeep

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-256-bit-secret-key-here

# SMS (for OTP)
SMS_API_KEY=your-sms-provider-api-key
SMS_SENDER_ID=BOOKEP

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=bookkeep-uploads
AWS_REGION=ap-south-1

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 4. Start Development Services

```bash
# Start database and redis
docker-compose -f docker/docker-compose.dev.yml up -d

# Run database migrations
psql $DATABASE_URL < docker/init-db.sql

# Start backend services (in separate terminals)
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

---

## Production Deployment

### Option 1: Docker Compose (Single Server)

Best for: Small to medium deployments

#### 1. Prepare Server

```bash
# Ubuntu 22.04 LTS
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Clone & Configure

```bash
git clone https://github.com/bookkeep/bookkeeping-app.git
cd bookkeeping-app

# Create production environment file
cat > .env.prod << 'EOF'
# Database
POSTGRES_USER=bookkeep
POSTGRES_PASSWORD=secure-random-password
DATABASE_URL=postgresql://bookkeep:secure-random-password@postgres:5432/bookkeep

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=$(openssl rand -base64 32)

# Domain
ACME_EMAIL=admin@bookkeep.in
API_URL=https://api.bookkeep.in

# SMS
SMS_API_KEY=your-sms-api-key

# ... other variables
EOF
```

#### 3. Deploy

```bash
# Build and start
docker-compose -f docker/docker-compose.prod.yml --env-file .env.prod up -d --build

# Check logs
docker-compose -f docker/docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker/docker-compose.prod.yml up -d --scale auth-service=3 --scale bookkeeping-service=3
```

---

### Option 2: Kubernetes

Best for: Large scale, high availability

#### 1. Cluster Setup

```bash
# Using managed Kubernetes (EKS, GKE, or DigitalOcean)
# Or self-hosted with kubeadm

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

#### 2. Deploy Infrastructure

```bash
# Create namespace
kubectl create namespace bookkeep

# Deploy PostgreSQL (using operator)
helm repo add cnpg https://cloudnative-pg.github.io/charts
helm install postgres cnpg/cloudnative-pg -n bookkeep

# Deploy Redis
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install redis bitnami/redis -n bookkeep

# Deploy NATS
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm install nats nats/nats -n bookkeep
```

#### 3. Deploy Application

```bash
# Create secrets
kubectl create secret generic bookkeep-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=database-url=postgresql://... \
  --from-literal=redis-url=redis://... \
  -n bookkeep

# Apply Kubernetes manifests
kubectl apply -f k8s/ -n bookkeep

# Check deployment status
kubectl get pods -n bookkeep
kubectl get svc -n bookkeep
```

#### 4. Configure Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bookkeep-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.bookkeep.in
        - app.bookkeep.in
      secretName: bookkeep-tls
  rules:
    - host: api.bookkeep.in
      http:
        paths:
          - path: /api/v1/auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 8081
          - path: /api/v1/tenants
            pathType: Prefix
            backend:
              service:
                name: tenant-service
                port:
                  number: 8083
          # ... other services
    - host: app.bookkeep.in
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 3000
```

---

## Database Setup

### Initial Migration

```bash
# Run the init script
psql $DATABASE_URL < docker/init-db.sql

# Or using GORM auto-migration (development only)
# Services auto-migrate on startup when GORM_AUTO_MIGRATE=true
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL | gzip > /backups/bookkeep_$DATE.sql.gz

# Upload to S3
aws s3 cp /backups/bookkeep_$DATE.sql.gz s3://bookkeep-backups/

# Cleanup old backups (keep 30 days)
find /backups -type f -mtime +30 -delete
```

### Point-in-Time Recovery

```bash
# Enable WAL archiving in PostgreSQL
# postgresql.conf
archive_mode = on
archive_command = 'aws s3 cp %p s3://bookkeep-wal/%f'

# Restore to point in time
pg_restore --target-time='2024-01-15 14:30:00' ...
```

---

## SSL/TLS Setup

### Using Let's Encrypt (Recommended)

```yaml
# Traefik handles this automatically in docker-compose.prod.yml
# Just set ACME_EMAIL in your environment
```

### Manual Certificate

```bash
# If using your own certificates
mkdir -p /etc/ssl/bookkeep
cp your-cert.pem /etc/ssl/bookkeep/fullchain.pem
cp your-key.pem /etc/ssl/bookkeep/privkey.pem
```

---

## Monitoring & Logging

### Prometheus + Grafana

```bash
# Add to docker-compose.prod.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:latest
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=secure-password
```

### Loki for Logs

```yaml
loki:
  image: grafana/loki:latest
  ports:
    - "3100:3100"

promtail:
  image: grafana/promtail:latest
  volumes:
    - /var/log:/var/log
    - ./promtail.yml:/etc/promtail/config.yml
```

### Health Checks

```bash
# Check service health
curl -s https://api.bookkeep.in/health | jq .

# Expected response
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "nats": "connected"
  }
}
```

---

## Scaling Guidelines

### Horizontal Scaling

| Service | Min Replicas | Max Replicas | CPU Trigger | Memory Trigger |
|---------|--------------|--------------|-------------|----------------|
| auth-service | 2 | 5 | 70% | 80% |
| tenant-service | 2 | 4 | 70% | 80% |
| bookkeeping-service | 3 | 10 | 60% | 75% |
| invoice-service | 2 | 6 | 70% | 80% |
| report-service | 2 | 5 | 60% | 75% |
| web | 2 | 4 | 70% | 80% |

### Database Scaling

1. **Read Replicas**: Add PostgreSQL read replicas for report-heavy workloads
2. **Connection Pooling**: Use PgBouncer for connection management
3. **Partitioning**: Partition large tables (transactions, audit_logs) by date

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets in environment variables or secret manager
- [ ] Strong JWT secret (256-bit minimum)
- [ ] Database passwords are random and secure
- [ ] SSL/TLS enabled on all endpoints
- [ ] CORS configured for production domains only

### Post-Deployment

- [ ] Firewall rules restrict database access
- [ ] Rate limiting is active
- [ ] Audit logging is enabled
- [ ] Backup system is tested
- [ ] Monitoring alerts are configured
- [ ] Security headers are present

### Regular Maintenance

- [ ] Weekly: Review security logs
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] Annually: Penetration testing

---

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**2. Service Unhealthy**
```bash
# Check logs
docker-compose logs auth-service --tail=100

# Restart service
docker-compose restart auth-service
```

**3. Redis Connection Issues**
```bash
# Check Redis
redis-cli -u $REDIS_URL ping
```

**4. SSL Certificate Issues**
```bash
# Check certificate expiry
echo | openssl s_client -servername api.bookkeep.in -connect api.bookkeep.in:443 2>/dev/null | openssl x509 -noout -dates
```

### Support

- GitHub Issues: https://github.com/bookkeep/bookkeeping-app/issues
- Email: support@bookkeep.in
