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
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/config"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/handlers"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/services"
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
		&models.User{},
		&models.Session{},
		&models.Role{},
		&models.Permission{},
	); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	sessionRepo := repository.NewSessionRepository(db)
	roleRepo := repository.NewRoleRepository(db)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, sessionRepo, roleRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	healthHandler := handlers.NewHealthHandler(db)

	// Setup router
	router := gin.New()

	// Allowed CORS origins
	allowedOrigins := []string{
		"https://app.bookkeep.in",
		"https://www.bookkeep.in",
		"https://bookkeep.in",
	}
	// Add development origins in non-production mode
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

	// Initialize rate limiters
	authRateLimiter := middleware.NewRateLimiter(middleware.RateLimitConfig{
		RequestsPerMinute: 10,
		BurstSize:         5,
		CleanupInterval:   5 * time.Minute,
	})
	otpRateLimiter := middleware.NewRateLimiter(middleware.RateLimitConfig{
		RequestsPerMinute: 5,
		BurstSize:         2,
		CleanupInterval:   5 * time.Minute,
	})

	// Auth endpoints (public) with rate limiting
	auth := router.Group("/api/v1/auth")
	auth.Use(authRateLimiter.Middleware())
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/forgot-password", authHandler.ForgotPassword)
		auth.POST("/reset-password", authHandler.ResetPassword)
		auth.POST("/verify-email", authHandler.VerifyEmail)
	}

	// OTP endpoints with stricter rate limiting
	otp := router.Group("/api/v1/auth/otp")
	otp.Use(otpRateLimiter.Middleware())
	{
		otp.POST("/request", authHandler.RequestOTP)
		otp.POST("/verify", authHandler.VerifyOTP)
	}

	// Protected auth endpoints
	jwtConfig := middleware.JWTConfig{
		Secret:    cfg.JWT.Secret,
		Issuer:    cfg.JWT.Issuer,
		SkipPaths: []string{"/health", "/ready", "/api/v1/auth"},
	}

	protected := router.Group("/api/v1")
	protected.Use(middleware.AuthMiddleware(jwtConfig))
	{
		protected.GET("/me", authHandler.GetCurrentUser)
		protected.PUT("/me", authHandler.UpdateProfile)
		protected.POST("/logout", authHandler.Logout)
		protected.POST("/change-password", authHandler.ChangePassword)
	}

	// Admin endpoints
	admin := router.Group("/api/v1/admin")
	admin.Use(middleware.AuthMiddleware(jwtConfig))
	admin.Use(middleware.RequireRole("admin"))
	{
		admin.GET("/users", authHandler.ListUsers)
		admin.GET("/users/:id", authHandler.GetUser)
		admin.PUT("/users/:id/roles", authHandler.UpdateUserRoles)
		admin.DELETE("/users/:id", authHandler.DeleteUser)
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
		log.Printf("Auth service starting on %s", cfg.GetServerAddress())
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
