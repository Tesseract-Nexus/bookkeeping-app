# DevOps & Deployment

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │  Cloudflare │    │  Cloudflare │    │  Cloudflare │                      │
│  │     CDN     │    │     WAF     │    │   DDoS      │                      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                      │
│         └──────────────────┼──────────────────┘                              │
│                            │                                                 │
│                    ┌───────▼───────┐                                        │
│                    │  Load Balancer │                                        │
│                    │   (L7/HTTPS)   │                                        │
│                    └───────┬───────┘                                        │
│                            │                                                 │
│  ┌─────────────────────────▼─────────────────────────┐                      │
│  │              Kubernetes Cluster                    │                      │
│  │  ┌─────────────────────────────────────────────┐  │                      │
│  │  │           Ingress Controller                 │  │                      │
│  │  └─────────────────────┬───────────────────────┘  │                      │
│  │                        │                          │                      │
│  │  ┌──────┬──────┬──────┬──────┬──────┬──────┐    │                      │
│  │  │ Auth │ Book │ Inv  │ Tax  │ Cust │ ...  │    │  Services             │
│  │  │ Svc  │ Svc  │ Svc  │ Svc  │ Svc  │      │    │  (2+ replicas each)   │
│  │  └──────┴──────┴──────┴──────┴──────┴──────┘    │                      │
│  │                                                  │                      │
│  │  ┌─────────────────────────────────────────────┐ │                      │
│  │  │           NATS (Message Broker)              │ │                      │
│  │  └─────────────────────────────────────────────┘ │                      │
│  └──────────────────────────────────────────────────┘                      │
│                            │                                                 │
│  ┌─────────────────────────▼─────────────────────────┐                      │
│  │                  Data Layer                        │                      │
│  │  ┌─────────────┐  ┌──────────┐  ┌──────────────┐  │                      │
│  │  │ PostgreSQL  │  │  Redis   │  │ Object Store │  │                      │
│  │  │  (RDS/HA)   │  │ Cluster  │  │   (S3/GCS)   │  │                      │
│  │  └─────────────┘  └──────────┘  └──────────────┘  │                      │
│  └───────────────────────────────────────────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Cloud Provider Strategy

### Primary: AWS (Mumbai Region - ap-south-1)

| Service | AWS Component | Purpose |
|---------|---------------|---------|
| Kubernetes | EKS | Container orchestration |
| Database | RDS PostgreSQL | Primary datastore |
| Cache | ElastiCache Redis | Caching & sessions |
| Storage | S3 | Document storage |
| CDN | CloudFront | Static assets |
| DNS | Route 53 | DNS management |
| Secrets | Secrets Manager | Credential storage |
| Monitoring | CloudWatch | Logs & metrics |

### Alternative: GCP (Mumbai - asia-south1)

For multi-cloud or specific requirements.

### Data Residency

All India user data stored in ap-south-1 (Mumbai) region to comply with data localization requirements.

---

## Kubernetes Architecture

### Namespace Structure

```yaml
# Namespace organization
namespaces:
  - bookkeep-production    # Production workloads
  - bookkeep-staging       # Staging environment
  - bookkeep-system        # Infrastructure (ingress, cert-manager)
  - bookkeep-monitoring    # Prometheus, Grafana
  - bookkeep-nats          # Message broker
```

### Service Deployment

```yaml
# Example: Bookkeeping Service Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bookkeeping-service
  namespace: bookkeep-production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bookkeeping-service
  template:
    metadata:
      labels:
        app: bookkeeping-service
    spec:
      containers:
        - name: bookkeeping-service
          image: bookkeep/bookkeeping-service:v1.0.0
          ports:
            - containerPort: 3100
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: bookkeeping-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: bookkeeping-secrets
                  key: redis-url
          livenessProbe:
            httpGet:
              path: /health
              port: 3100
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3100
            initialDelaySeconds: 5
            periodSeconds: 5
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: bookkeeping-service
                topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: bookkeeping-service
  namespace: bookkeep-production
spec:
  selector:
    app: bookkeeping-service
  ports:
    - port: 80
      targetPort: 3100
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bookkeeping-service-hpa
  namespace: bookkeep-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bookkeeping-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bookkeep-ingress
  namespace: bookkeep-production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
    - hosts:
        - api.bookkeep.app
        - "*.bookkeep.app"
      secretName: bookkeep-tls
  rules:
    - host: api.bookkeep.app
      http:
        paths:
          - path: /v1/auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 80
          - path: /v1/transactions
            pathType: Prefix
            backend:
              service:
                name: bookkeeping-service
                port:
                  number: 80
          - path: /v1/invoices
            pathType: Prefix
            backend:
              service:
                name: invoice-service
                port:
                  number: 80
          # ... other services
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/bookkeep

jobs:
  # Run tests
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.25'

      - name: Run tests
        run: |
          go test -v -race -coverprofile=coverage.out ./...

      - name: Upload coverage
        uses: codecov/codecov-action@v4

  # Build and push Docker images
  build:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          - auth-service
          - bookkeeping-service
          - invoice-service
          - tax-service
          - customer-service
          - report-service
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./services/${{ matrix.service }}
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}/${{ matrix.service }}:${{ github.sha }}
            ${{ env.IMAGE_PREFIX }}/${{ matrix.service }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Deploy to staging
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name bookkeep-staging

      - name: Deploy to staging
        run: |
          kubectl set image deployment/auth-service \
            auth-service=${{ env.IMAGE_PREFIX }}/auth-service:${{ github.sha }} \
            -n bookkeep-staging
          # ... repeat for other services

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/auth-service -n bookkeep-staging

  # Deploy to production
  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name bookkeep-production

      - name: Deploy with canary
        run: |
          # Update canary deployment (10% traffic)
          kubectl set image deployment/auth-service-canary \
            auth-service=${{ env.IMAGE_PREFIX }}/auth-service:${{ github.sha }} \
            -n bookkeep-production

      - name: Verify canary health
        run: |
          sleep 300  # Wait 5 minutes
          # Check error rates, latency
          ./scripts/verify-canary.sh

      - name: Promote to production
        run: |
          kubectl set image deployment/auth-service \
            auth-service=${{ env.IMAGE_PREFIX }}/auth-service:${{ github.sha }} \
            -n bookkeep-production
```

### Database Migrations

```yaml
# Migration job
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-{{ .Release.Revision }}
  namespace: bookkeep-production
  annotations:
    helm.sh/hook: pre-upgrade
    helm.sh/hook-weight: "-5"
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: bookkeep/migration:latest
          command: ["./migrate", "up"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: bookkeeping-secrets
                  key: database-url
      restartPolicy: Never
  backoffLimit: 3
```

---

## Monitoring & Observability

### Prometheus + Grafana Stack

```yaml
# Prometheus configuration
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: bookkeep-services
  namespace: bookkeep-monitoring
spec:
  selector:
    matchLabels:
      monitoring: enabled
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
```

### Key Metrics

```go
// Custom metrics in Go services
var (
    requestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "bookkeep_requests_total",
            Help: "Total number of requests",
        },
        []string{"service", "method", "path", "status"},
    )

    requestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "bookkeep_request_duration_seconds",
            Help:    "Request duration in seconds",
            Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5},
        },
        []string{"service", "method", "path"},
    )

    invoicesCreated = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "bookkeep_invoices_created_total",
            Help: "Total invoices created",
        },
        []string{"tenant_id", "type"},
    )

    syncQueueSize = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "bookkeep_sync_queue_size",
            Help: "Current sync queue size",
        },
        []string{"tenant_id"},
    )
)
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "BookKeep Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(bookkeep_requests_total[5m])) by (service)"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(bookkeep_requests_total{status=~\"5..\"}[5m])) / sum(rate(bookkeep_requests_total[5m])) * 100"
          }
        ],
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "color": "green", "value": 0 },
            { "color": "yellow", "value": 1 },
            { "color": "red", "value": 5 }
          ]
        }
      },
      {
        "title": "P99 Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(bookkeep_request_duration_seconds_bucket[5m])) by (le, service))"
          }
        ]
      }
    ]
  }
}
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: bookkeep-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(bookkeep_requests_total{status=~"5.."}[5m]))
          / sum(rate(bookkeep_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: Error rate is {{ $value | humanizePercentage }}

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, sum(rate(bookkeep_request_duration_seconds_bucket[5m])) by (le)) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High latency detected
          description: P99 latency is {{ $value }}s

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: Pod crash looping
          description: Pod {{ $labels.pod }} is crash looping

      - alert: DatabaseConnectionPoolExhausted
        expr: bookkeep_db_connections_active / bookkeep_db_connections_max > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Database connection pool nearly exhausted
```

### Distributed Tracing

```go
// OpenTelemetry setup
func initTracer() *sdktrace.TracerProvider {
    exporter, _ := otlptracehttp.New(
        context.Background(),
        otlptracehttp.WithEndpoint("otel-collector:4318"),
    )

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("bookkeeping-service"),
            semconv.ServiceVersionKey.String("1.0.0"),
        )),
    )

    otel.SetTracerProvider(tp)
    return tp
}

// Usage in handlers
func CreateInvoice(c *gin.Context) {
    ctx, span := tracer.Start(c.Request.Context(), "CreateInvoice")
    defer span.End()

    span.SetAttributes(
        attribute.String("tenant_id", getTenantID(c)),
        attribute.String("invoice_type", "sale"),
    )

    // ... handler logic
}
```

---

## Logging

### Structured Logging

```go
// Using logrus with JSON format
import (
    log "github.com/sirupsen/logrus"
)

func init() {
    log.SetFormatter(&log.JSONFormatter{})
    log.SetLevel(log.InfoLevel)
}

func LogRequest(c *gin.Context) {
    log.WithFields(log.Fields{
        "request_id": c.GetString("request_id"),
        "tenant_id":  c.GetString("tenant_id"),
        "user_id":    c.GetString("user_id"),
        "method":     c.Request.Method,
        "path":       c.Request.URL.Path,
        "status":     c.Writer.Status(),
        "latency_ms": latency.Milliseconds(),
        "ip":         c.ClientIP(),
    }).Info("Request processed")
}
```

### Log Aggregation

```yaml
# Fluentd configuration for log shipping
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: bookkeep-system
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/bookkeep-*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      <parse>
        @type json
      </parse>
    </source>

    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.bookkeep-monitoring.svc
      port 9200
      logstash_format true
      logstash_prefix bookkeep
    </match>
```

---

## Backup & Recovery

### Database Backups

```yaml
# Backup CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-backup
  namespace: bookkeep-production
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:15-alpine
              command:
                - /bin/sh
                - -c
                - |
                  pg_dump $DATABASE_URL | gzip > /backup/bookkeep-$(date +%Y%m%d).sql.gz
                  aws s3 cp /backup/bookkeep-$(date +%Y%m%d).sql.gz s3://bookkeep-backups/daily/
              env:
                - name: DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: bookkeeping-secrets
                      key: database-url
              volumeMounts:
                - name: backup-volume
                  mountPath: /backup
          volumes:
            - name: backup-volume
              emptyDir: {}
          restartPolicy: OnFailure
```

### Disaster Recovery

```
Recovery Time Objective (RTO): 4 hours
Recovery Point Objective (RPO): 1 hour

Backup Schedule:
├── Continuous: PostgreSQL WAL archiving to S3
├── Hourly: Redis RDB snapshots
├── Daily: Full database dump
├── Weekly: Full system backup
└── Monthly: Archive to cold storage

Recovery Procedures:
1. Database: Point-in-time recovery from WAL
2. Files: Restore from S3
3. Full cluster: Restore from infrastructure-as-code
```

---

## Security Hardening

### Pod Security

```yaml
# Pod Security Policy
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
        readOnlyRootFilesystem: true
```

### Network Policies

```yaml
# Restrict traffic between services
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: bookkeeping-service-policy
  namespace: bookkeep-production
spec:
  podSelector:
    matchLabels:
      app: bookkeeping-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: ingress-nginx
      ports:
        - port: 3100
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - port: 6379
    - to:
        - podSelector:
            matchLabels:
              app: nats
      ports:
        - port: 4222
```

### Secrets Management

```yaml
# Sealed Secrets for GitOps
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: bookkeeping-secrets
  namespace: bookkeep-production
spec:
  encryptedData:
    database-url: AgBy8hL1e...
    redis-url: AgBy8hL1e...
    jwt-secret: AgBy8hL1e...
```

---

## Environment Matrix

| Environment | Purpose | Cluster | Database | Scaling |
|------------|---------|---------|----------|---------|
| Development | Local dev | minikube/Docker | Local PG | Single |
| Staging | QA/Testing | EKS (t3.medium x2) | RDS (db.t3.small) | 1-2 replicas |
| Production | Live | EKS (t3.large x5) | RDS (db.r5.large, Multi-AZ) | 2-10 replicas |
