.PHONY: help dev build test lint clean docker-up docker-down migrate-up migrate-down

# Colors for terminal output
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
WHITE  := $(shell tput -Txterm setaf 7)
RESET  := $(shell tput -Txterm sgr0)

## Help
help: ## Show this help
	@echo ''
	@echo 'Usage:'
	@echo '  ${YELLOW}make${RESET} ${GREEN}<target>${RESET}'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  ${YELLOW}%-15s${RESET} ${GREEN}%s${RESET}\n", $$1, $$2}' $(MAKEFILE_LIST)

## Development
dev: docker-up ## Start all services in development mode
	@echo "Starting development servers..."
	pnpm run dev

build: ## Build all packages and services
	@echo "Building all packages..."
	pnpm run build
	@echo "Building Go services..."
	@for service in auth-service bookkeeping-service invoice-service customer-service tax-service report-service; do \
		echo "Building $$service..."; \
		cd services/$$service && go build -o bin/$$service ./cmd/main.go && cd ../..; \
	done

test: ## Run all tests
	@echo "Running frontend tests..."
	pnpm run test
	@echo "Running Go service tests..."
	@for service in auth-service bookkeeping-service invoice-service customer-service tax-service report-service; do \
		echo "Testing $$service..."; \
		cd services/$$service && go test -v ./... && cd ../..; \
	done

lint: ## Run linters
	pnpm run lint
	@for service in auth-service bookkeeping-service invoice-service customer-service tax-service report-service; do \
		cd services/$$service && golangci-lint run && cd ../..; \
	done

## Docker
docker-up: ## Start Docker containers
	@echo "Starting Docker containers..."
	docker-compose -f docker/docker-compose.yml up -d
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@echo "Docker containers started!"

docker-down: ## Stop Docker containers
	@echo "Stopping Docker containers..."
	docker-compose -f docker/docker-compose.yml down

docker-logs: ## View Docker logs
	docker-compose -f docker/docker-compose.yml logs -f

docker-clean: ## Remove Docker volumes and containers
	docker-compose -f docker/docker-compose.yml down -v

## Database
migrate-up: ## Run database migrations
	@echo "Running migrations..."
	@for service in auth-service tenant-service bookkeeping-service invoice-service customer-service tax-service; do \
		echo "Migrating $$service..."; \
		cd services/$$service && go run cmd/migrate/main.go up && cd ../..; \
	done

migrate-down: ## Rollback database migrations
	@echo "Rolling back migrations..."
	@for service in auth-service tenant-service bookkeeping-service invoice-service customer-service tax-service; do \
		echo "Rolling back $$service..."; \
		cd services/$$service && go run cmd/migrate/main.go down && cd ../..; \
	done

migrate-create: ## Create a new migration (usage: make migrate-create name=create_users service=auth-service)
	@if [ -z "$(name)" ] || [ -z "$(service)" ]; then \
		echo "Usage: make migrate-create name=migration_name service=service-name"; \
		exit 1; \
	fi
	@echo "Creating migration $(name) for $(service)..."
	@mkdir -p services/$(service)/migrations
	@touch services/$(service)/migrations/$$(date +%Y%m%d%H%M%S)_$(name).up.sql
	@touch services/$(service)/migrations/$$(date +%Y%m%d%H%M%S)_$(name).down.sql
	@echo "Created migration files"

## Seed Data
seed: ## Seed database with initial data
	@echo "Seeding database..."
	@for service in tax-service; do \
		echo "Seeding $$service..."; \
		cd services/$$service && go run cmd/seed/main.go && cd ../..; \
	done

## Clean
clean: ## Clean build artifacts
	@echo "Cleaning..."
	rm -rf apps/web/.next
	rm -rf apps/web/node_modules
	rm -rf apps/mobile/node_modules
	rm -rf node_modules
	@for service in auth-service bookkeeping-service invoice-service customer-service tax-service report-service; do \
		rm -rf services/$$service/bin; \
	done

## Generate
generate-api: ## Generate API client from OpenAPI spec
	@echo "Generating API client..."
	pnpm --filter @bookkeep/api-client run generate

generate-docs: ## Generate API documentation
	@echo "Generating API docs..."
	@for service in auth-service bookkeeping-service invoice-service customer-service tax-service report-service; do \
		cd services/$$service && swag init -g cmd/main.go -o docs && cd ../..; \
	done

## Services (individual)
run-auth: ## Run auth service
	cd services/auth-service && go run cmd/main.go

run-bookkeeping: ## Run bookkeeping service
	cd services/bookkeeping-service && go run cmd/main.go

run-invoice: ## Run invoice service
	cd services/invoice-service && go run cmd/main.go

run-customer: ## Run customer service
	cd services/customer-service && go run cmd/main.go

run-tax: ## Run tax service
	cd services/tax-service && go run cmd/main.go

run-report: ## Run report service
	cd services/report-service && go run cmd/main.go

run-web: ## Run web app
	pnpm --filter @bookkeep/web run dev

run-mobile: ## Run mobile app
	pnpm --filter @bookkeep/mobile run start
