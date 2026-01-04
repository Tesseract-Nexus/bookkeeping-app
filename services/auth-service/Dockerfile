# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install git and ca-certificates (for go mod download)
RUN apk add --no-cache git ca-certificates

# Copy go mod files from service directory
COPY services/auth-service/go.mod services/auth-service/go.sum* ./services/auth-service/
COPY packages/go-shared/ ./packages/go-shared/

# Download dependencies
WORKDIR /app/services/auth-service
RUN go mod download

# Copy source code
COPY services/auth-service/ .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /auth-service ./cmd

# Final stage
FROM alpine:3.19

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

# Copy the binary
COPY --from=builder /auth-service .

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./auth-service"]
