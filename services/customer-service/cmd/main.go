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
	"github.com/tesseract-nexus/bookkeeping-app/customer-service/internal/config"
	"github.com/tesseract-nexus/bookkeeping-app/customer-service/internal/handlers"
	"github.com/tesseract-nexus/bookkeeping-app/customer-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/customer-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/customer-service/internal/services"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/database"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/middleware"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
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
		&models.Party{},
		&models.PartyContact{},
		&models.PartyBankDetail{},
	); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	partyRepo := repository.NewPartyRepository(db)

	// Initialize services
	partyService := services.NewPartyService(partyRepo)

	// Initialize handlers
	partyHandler := handlers.NewPartyHandler(partyService)
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
	{
		// Customers (parties with type=customer)
		customers := api.Group("/customers")
		{
			customers.GET("", partyHandler.ListParties)
			customers.POST("", partyHandler.CreateParty)
			customers.GET("/:id", partyHandler.GetParty)
			customers.PUT("/:id", partyHandler.UpdateParty)
			customers.DELETE("/:id", partyHandler.DeleteParty)
			customers.GET("/:id/ledger", partyHandler.GetPartyLedger)
			customers.POST("/:id/contacts", partyHandler.AddContact)
			customers.POST("/:id/bank-details", partyHandler.AddBankDetail)
		}

		// Vendors (parties with type=vendor)
		vendors := api.Group("/vendors")
		{
			vendors.GET("", partyHandler.ListParties)
			vendors.POST("", partyHandler.CreateParty)
			vendors.GET("/:id", partyHandler.GetParty)
			vendors.PUT("/:id", partyHandler.UpdateParty)
			vendors.DELETE("/:id", partyHandler.DeleteParty)
			vendors.GET("/:id/ledger", partyHandler.GetPartyLedger)
		}

		// General parties endpoint
		parties := api.Group("/parties")
		{
			parties.GET("", partyHandler.ListParties)
			parties.POST("", partyHandler.CreateParty)
			parties.GET("/:id", partyHandler.GetParty)
			parties.PUT("/:id", partyHandler.UpdateParty)
			parties.DELETE("/:id", partyHandler.DeleteParty)
		}

		// GSTIN validation
		api.GET("/validate-gstin/:gstin", partyHandler.ValidateGSTIN)
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
		log.Printf("Customer service starting on %s", cfg.GetServerAddress())
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	// Close database connection
	if err := database.Close(db); err != nil {
		log.Printf("Error closing database: %v", err)
	}

	log.Println("Server exited properly")
}
