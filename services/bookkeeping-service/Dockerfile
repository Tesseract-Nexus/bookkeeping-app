# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files from service directory
COPY services/bookkeeping-service/go.mod services/bookkeeping-service/go.sum* ./services/bookkeeping-service/
COPY packages/go-shared/ ./packages/go-shared/

# Download dependencies
WORKDIR /app/services/bookkeeping-service
RUN go mod download

# Copy source code
COPY services/bookkeeping-service/ .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /bookkeeping-service ./cmd/main.go

# Final stage
FROM alpine:3.19

WORKDIR /app

# Install CA certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

# Copy binary from builder
COPY --from=builder /bookkeeping-service .

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Set timezone
ENV TZ=Asia/Kolkata

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./bookkeeping-service"]
