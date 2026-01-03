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
	); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	invoiceRepo := repository.NewInvoiceRepository(db)
	paymentRepo := repository.NewPaymentRepository(db)

	// Initialize services
	invoiceService := services.NewInvoiceService(invoiceRepo, paymentRepo)

	// Initialize handlers
	invoiceHandler := handlers.NewInvoiceHandler(invoiceService)
	healthHandler := handlers.NewHealthHandler(db)

	// Setup router
	router := gin.New()

	// Apply middleware
	router.Use(gin.Recovery())
	router.Use(middleware.RequestIDMiddleware())
	router.Use(middleware.CORSMiddleware([]string{"*"}))

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
