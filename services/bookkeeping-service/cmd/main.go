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
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/config"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/handlers"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/bookkeeping-service/internal/services"
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
		&models.Account{},
		&models.BankAccount{},
		&models.FinancialYear{},
		&models.Transaction{},
		&models.TransactionLine{},
		&models.BankTransaction{},
		&models.RecurringJournal{},
		&models.RecurringJournalLine{},
		&models.GeneratedJournal{},
	); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	accountRepo := repository.NewAccountRepository(db)
	transactionRepo := repository.NewTransactionRepository(db)
	bankRepo := repository.NewBankRepository(db)
	recurringJournalRepo := repository.NewRecurringJournalRepository(db)

	// Initialize services
	accountService := services.NewAccountService(accountRepo)
	transactionService := services.NewTransactionService(transactionRepo, accountRepo)
	bankService := services.NewBankService(bankRepo, transactionRepo)
	recurringJournalService := services.NewRecurringJournalService(recurringJournalRepo, transactionService)

	// Initialize handlers
	accountHandler := handlers.NewAccountHandler(accountService)
	transactionHandler := handlers.NewTransactionHandler(transactionService)
	bankHandler := handlers.NewBankHandler(bankService)
	recurringJournalHandler := handlers.NewRecurringJournalHandler(recurringJournalService)
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
		// Accounts / Chart of Accounts
		accounts := api.Group("/accounts")
		{
			accounts.GET("", accountHandler.ListAccounts)
			accounts.POST("", accountHandler.CreateAccount)
			accounts.GET("/chart", accountHandler.GetChartOfAccounts)
			accounts.GET("/type/:type", accountHandler.GetAccountsByType)
			accounts.POST("/initialize", accountHandler.InitializeAccounts)
			accounts.GET("/:id", accountHandler.GetAccount)
			accounts.PUT("/:id", accountHandler.UpdateAccount)
			accounts.DELETE("/:id", accountHandler.DeleteAccount)
		}

		// Transactions
		transactions := api.Group("/transactions")
		{
			transactions.GET("", transactionHandler.ListTransactions)
			transactions.POST("", transactionHandler.CreateTransaction)
			transactions.POST("/quick-sale", transactionHandler.CreateQuickSale)
			transactions.POST("/quick-expense", transactionHandler.CreateQuickExpense)
			transactions.GET("/daily-summary", transactionHandler.GetDailySummary)
			transactions.GET("/:id", transactionHandler.GetTransaction)
			transactions.POST("/:id/void", transactionHandler.VoidTransaction)
		}

		// Bank Accounts & Reconciliation
		bank := api.Group("/bank")
		{
			bank.GET("/accounts", bankHandler.ListBankAccounts)
			bank.POST("/accounts", bankHandler.CreateBankAccount)
			bank.GET("/accounts/:id", bankHandler.GetBankAccount)
			bank.PUT("/accounts/:id", bankHandler.UpdateBankAccount)
			bank.DELETE("/accounts/:id", bankHandler.DeleteBankAccount)
			bank.POST("/accounts/:id/import", bankHandler.ImportStatement)
			bank.GET("/accounts/:id/transactions", bankHandler.GetBankTransactions)
			bank.GET("/accounts/:id/unreconciled", bankHandler.GetUnreconciledTransactions)
			bank.POST("/accounts/:id/auto-reconcile", bankHandler.AutoReconcile)
			bank.GET("/accounts/:id/reconciliation-summary", bankHandler.GetReconciliationSummary)
			bank.POST("/transactions/:tx_id/reconcile", bankHandler.ReconcileTransaction)
			bank.POST("/transactions/:tx_id/unreconcile", bankHandler.UnreconcileTransaction)
			bank.GET("/transactions/:tx_id/suggest-matches", bankHandler.SuggestMatches)
		}

		// Recurring Journal Entries
		recurring := api.Group("/recurring-journals")
		{
			recurring.GET("", recurringJournalHandler.List)
			recurring.POST("", recurringJournalHandler.Create)
			recurring.GET("/:id", recurringJournalHandler.Get)
			recurring.PUT("/:id", recurringJournalHandler.Update)
			recurring.DELETE("/:id", recurringJournalHandler.Delete)
			recurring.POST("/:id/pause", recurringJournalHandler.Pause)
			recurring.POST("/:id/resume", recurringJournalHandler.Resume)
			recurring.POST("/:id/generate", recurringJournalHandler.GenerateNow)
			recurring.GET("/:id/history", recurringJournalHandler.GetHistory)
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
		log.Printf("Bookkeeping service starting on %s", cfg.GetServerAddress())
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
