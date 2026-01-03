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
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/config"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/handlers"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/services"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Connect to database
	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("Connected to database")

	// Run database migrations
	if err := db.AutoMigrate(
		&models.TaxJurisdiction{},
		&models.TaxRate{},
		&models.ProductTaxCategory{},
		&models.TaxNexus{},
		&models.TDSRate{},
		&models.TDSDeduction{},
		&models.TCSRate{},
		&models.TCSCollection{},
		&models.InputTaxCredit{},
		&models.ITCReconciliation{},
		&models.GSTRFiling{},
		&models.TaxCalculationCache{},
	); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Database migrations completed")

	// Initialize repository
	taxRepo := repository.NewTaxRepository(db)

	// Initialize services
	cacheTTL := time.Duration(cfg.CacheTTLMinutes) * time.Minute
	taxCalculator := services.NewTaxCalculator(taxRepo, cacheTTL)

	// Initialize handlers
	taxHandler := handlers.NewTaxHandler(taxCalculator, taxRepo)
	healthHandler := handlers.NewHealthHandler(db)

	// Setup router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-ID")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Health checks
	router.GET("/health", healthHandler.Health)
	router.GET("/livez", healthHandler.Liveness)
	router.GET("/readyz", healthHandler.Readiness)

	// API routes
	v1 := router.Group("/api/v1")
	{
		// GST Tax calculation
		tax := v1.Group("/tax")
		{
			tax.POST("/calculate", taxHandler.CalculateTax)
		}

		// TDS endpoints
		tds := v1.Group("/tds")
		{
			tds.POST("/calculate", taxHandler.CalculateTDS)
			tds.GET("/rates", taxHandler.ListTDSRates)
			tds.POST("/deductions", taxHandler.CreateTDSDeduction)
			tds.GET("/deductions", taxHandler.ListTDSDeductions)
		}

		// TCS endpoints
		tcs := v1.Group("/tcs")
		{
			tcs.POST("/calculate", taxHandler.CalculateTCS)
			tcs.GET("/collections", taxHandler.ListTCSCollections)
		}

		// ITC endpoints
		itc := v1.Group("/itc")
		{
			itc.POST("", taxHandler.RecordITC)
			itc.GET("", taxHandler.ListITC)
			itc.GET("/summary", taxHandler.GetITCSummary)
		}

		// GSTR endpoints
		gstr := v1.Group("/gstr")
		{
			gstr.GET("/filings", taxHandler.ListGSTRFilings)
			gstr.GET("/filings/:type/:period", taxHandler.GetGSTRFiling)
		}

		// Jurisdiction management
		jurisdictions := v1.Group("/jurisdictions")
		{
			jurisdictions.GET("", taxHandler.ListJurisdictions)
			jurisdictions.GET("/:id", taxHandler.GetJurisdiction)
			jurisdictions.POST("", taxHandler.CreateJurisdiction)
		}

		// Product categories (HSN/SAC)
		categories := v1.Group("/categories")
		{
			categories.GET("", taxHandler.ListProductCategories)
			categories.POST("", taxHandler.CreateProductCategory)
		}
	}

	// Create server
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	// Graceful shutdown
	go func() {
		log.Printf("Tax Service starting on port %s (env: %s)", cfg.Port, cfg.Environment)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
