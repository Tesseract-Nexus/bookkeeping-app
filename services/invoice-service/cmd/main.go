package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/config"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/database"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/middleware"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/handlers"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/services"
)

func main() {
	// Load configuration
	cfg, err := config.Load("invoice-service")
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Override default database name
	if cfg.Database.DBName == "invoice-service_db" {
		cfg.Database.DBName = "bookkeep_invoice"
	}

	// Set Gin mode
	gin.SetMode(cfg.App.Environment)

	// Connect to database
	dbConfig := database.Config{
		Host:            cfg.Database.Host,
		Port:            cfg.Database.Port,
		User:            cfg.Database.User,
		Password:        cfg.Database.Password,
		DBName:          cfg.Database.DBName,
		SSLMode:         cfg.Database.SSLMode,
		MaxOpenConns:    cfg.Database.MaxOpenConns,
		MaxIdleConns:    cfg.Database.MaxIdleConns,
		ConnMaxLifetime: cfg.Database.ConnMaxLifetime,
		ConnMaxIdleTime: cfg.Database.ConnMaxIdleTime,
	}

	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migrations
	if err := db.AutoMigrate(
		&models.Invoice{},
		&models.InvoiceItem{},
		&models.Payment{},
		&models.Bill{},
		&models.BillItem{},
		&models.BillPayment{},
		&models.Product{},
		&models.CreditNote{},
		&models.CreditNoteItem{},
		&models.CreditNoteApplication{},
		&models.RecurringInvoice{},
		&models.RecurringInvoiceItem{},
		&models.GeneratedInvoice{},
	); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	invoiceRepo := repository.NewInvoiceRepository(db)
	paymentRepo := repository.NewPaymentRepository(db)
	billRepo := repository.NewBillRepository(db)
	billPaymentRepo := repository.NewBillPaymentRepository(db)
	productRepo := repository.NewProductRepository(db)
	recurringInvoiceRepo := repository.NewRecurringInvoiceRepository(db)

	// Initialize services
	invoiceService := services.NewInvoiceService(invoiceRepo, paymentRepo)
	billService := services.NewBillService(billRepo, billPaymentRepo)
	productService := services.NewProductService(productRepo)
	recurringInvoiceService := services.NewRecurringInvoiceService(recurringInvoiceRepo, invoiceRepo, invoiceService)

	// Initialize handlers
	invoiceHandler := handlers.NewInvoiceHandler(invoiceService)
	billHandler := handlers.NewBillHandler(billService)
	productHandler := handlers.NewProductHandler(productService)
	recurringInvoiceHandler := handlers.NewRecurringInvoiceHandler(recurringInvoiceService)
	healthHandler := handlers.NewHealthHandler(db)

	// Setup router
	router := gin.New()

	// Allowed CORS origins
	allowedOrigins := []string{
		"https://app.bookkeep.in",
		"https://www.bookkeep.in",
		"https://bookkeep.in",
	}
	if !cfg.IsProduction() {
		allowedOrigins = append(allowedOrigins,
			"http://localhost:3000",
			"http://localhost:3001",
			"exp://localhost:19000",
		)
	}

	// Apply middleware
	router.Use(gin.Recovery())
	router.Use(middleware.RequestIDMiddleware())
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.CORSMiddleware(allowedOrigins))

	// Health endpoints (no auth required)
	router.GET("/health", healthHandler.Health)
	router.GET("/ready", healthHandler.Ready)

	// Protected endpoints
	jwtConfig := middleware.JWTConfig{
		Secret:    cfg.JWT.Secret,
		Issuer:    cfg.JWT.Issuer,
		SkipPaths: []string{"/health", "/ready"},
	}

	api := router.Group("/api/v1")
	api.Use(middleware.AuthMiddleware(jwtConfig))
	api.Use(middleware.TenantMiddleware())
	{
		// Invoice endpoints
		invoices := api.Group("/invoices")
		{
			invoices.GET("", invoiceHandler.List)
			invoices.POST("", invoiceHandler.Create)
			invoices.GET("/:id", invoiceHandler.Get)
			invoices.PUT("/:id", invoiceHandler.Update)
			invoices.DELETE("/:id", invoiceHandler.Delete)
			invoices.POST("/:id/send", invoiceHandler.Send)
			invoices.POST("/:id/payments", invoiceHandler.RecordPayment)
			invoices.GET("/:id/pdf", invoiceHandler.GeneratePDF)
		}

		// E-Invoice endpoints (GST)
		einvoice := api.Group("/einvoice")
		{
			einvoice.POST("/:id/generate", invoiceHandler.GenerateEInvoice)
			einvoice.GET("/:id/status", invoiceHandler.GetEInvoiceStatus)
			einvoice.POST("/:id/cancel", invoiceHandler.CancelEInvoice)
		}

		// Bill endpoints
		bills := api.Group("/bills")
		{
			bills.GET("", billHandler.List)
			bills.POST("", billHandler.Create)
			bills.GET("/overdue", billHandler.GetOverdue)
			bills.GET("/payables-summary", billHandler.GetPayablesSummary)
			bills.GET("/:id", billHandler.Get)
			bills.PUT("/:id", billHandler.Update)
			bills.DELETE("/:id", billHandler.Delete)
			bills.POST("/:id/approve", billHandler.Approve)
			bills.POST("/:id/payments", billHandler.RecordPayment)
		}

		// Product/Service catalog endpoints
		products := api.Group("/products")
		{
			products.GET("", productHandler.List)
			products.POST("", productHandler.Create)
			products.GET("/categories", productHandler.GetCategories)
			products.GET("/units", productHandler.GetUnitsOfMeasure)
			products.POST("/import", productHandler.Import)
			products.GET("/:id", productHandler.Get)
			products.PUT("/:id", productHandler.Update)
			products.DELETE("/:id", productHandler.Delete)
			products.POST("/:id/stock", productHandler.UpdateStock)
		}

		// Recurring Invoice endpoints
		recurring := api.Group("/recurring-invoices")
		{
			recurring.GET("", recurringInvoiceHandler.List)
			recurring.POST("", recurringInvoiceHandler.Create)
			recurring.GET("/:id", recurringInvoiceHandler.Get)
			recurring.PUT("/:id", recurringInvoiceHandler.Update)
			recurring.DELETE("/:id", recurringInvoiceHandler.Delete)
			recurring.POST("/:id/pause", recurringInvoiceHandler.Pause)
			recurring.POST("/:id/resume", recurringInvoiceHandler.Resume)
			recurring.POST("/:id/generate", recurringInvoiceHandler.GenerateNow)
			recurring.GET("/:id/history", recurringInvoiceHandler.GetHistory)
		}
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:         cfg.GetServerAddress(),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Invoice service starting on %s", cfg.GetServerAddress())
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	if err := database.Close(db); err != nil {
		log.Printf("Error closing database: %v", err)
	}

	log.Println("Server exited properly")
}
