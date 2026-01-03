# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install git for private dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum* ./
COPY packages/go-shared /packages/go-shared

# Download dependencies
RUN go mod download

# Copy source code
COPY services/tenant-service .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# Final stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 8083

# Run binary
CMD ["./main"]
