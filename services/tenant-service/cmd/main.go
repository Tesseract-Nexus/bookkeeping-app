package main

import (
	"log"
	"os"

	"github.com/bookkeep/go-shared/config"
	"github.com/bookkeep/go-shared/database"
	"github.com/bookkeep/go-shared/middleware"
	"github.com/bookkeep/tenant-service/internal/handlers"
	"github.com/bookkeep/tenant-service/internal/models"
	"github.com/bookkeep/tenant-service/internal/repository"
	"github.com/bookkeep/tenant-service/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func main() {
	// Load configuration
	cfg, err := config.Load("tenant-service")
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
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

	// Auto-migrate models
	if err := db.AutoMigrate(
		&models.Tenant{},
		&models.TenantMember{},
		&models.TenantInvitation{},
		&models.Role{},
		&models.RolePermission{},
		&models.AuditLog{},
	); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Initialize default roles
	initializeDefaultRoles(db)

	// Initialize repositories
	tenantRepo := repository.NewTenantRepository(db)
	roleRepo := repository.NewRoleRepository(db)

	// Initialize services
	tenantService := services.NewTenantService(tenantRepo, roleRepo)

	// Initialize handlers
	tenantHandler := handlers.NewTenantHandler(tenantService, roleRepo)

	// Setup Gin router
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Apply global middleware
	r.Use(middleware.CORS())
	r.Use(middleware.RequestIDMiddleware())
	r.Use(middleware.LoggerMiddleware())
	r.Use(middleware.RecoveryMiddleware())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "tenant-service"})
	})

	// JWT config for auth middleware
	jwtConfig := middleware.JWTConfig{
		Secret:    cfg.JWT.Secret,
		Issuer:    cfg.JWT.Issuer,
		SkipPaths: cfg.JWT.SkipPaths,
	}

	// Public routes
	api := r.Group("/api/v1")
	{
		// Get all permissions (public reference)
		api.GET("/permissions", tenantHandler.GetAllPermissions)

		// Accept invitation (authenticated but no tenant required)
		api.POST("/invitations/:token/accept", middleware.AuthMiddleware(jwtConfig), tenantHandler.AcceptInvitation)
	}

	// Authenticated routes
	auth := api.Group("")
	auth.Use(middleware.AuthMiddleware(jwtConfig))
	{
		// User's tenants
		auth.GET("/tenants/me", tenantHandler.GetMyTenants)

		// Create new tenant
		auth.POST("/tenants", tenantHandler.CreateTenant)
	}

	// Tenant-scoped routes (requires tenant membership)
	tenant := api.Group("/tenants/:tenant_id")
	tenant.Use(middleware.AuthMiddleware(jwtConfig))
	tenant.Use(TenantMiddleware(tenantRepo))
	{
		// Tenant management
		tenant.GET("", RequirePermission(tenantService, models.PermTenantView), tenantHandler.GetTenant)
		tenant.PUT("", RequirePermission(tenantService, models.PermTenantEdit), tenantHandler.UpdateTenant)
		tenant.DELETE("", RequirePermission(tenantService, models.PermTenantDelete), tenantHandler.DeleteTenant)

		// My permissions
		tenant.GET("/permissions/me", tenantHandler.GetMyPermissions)

		// Team management
		tenant.GET("/members", RequirePermission(tenantService, models.PermTeamView), tenantHandler.ListMembers)
		tenant.PUT("/members/:member_id", RequirePermission(tenantService, models.PermTeamEdit), tenantHandler.UpdateMember)
		tenant.DELETE("/members/:member_id", RequirePermission(tenantService, models.PermTeamRemove), tenantHandler.RemoveMember)

		// Invitations
		tenant.GET("/invitations", RequirePermission(tenantService, models.PermTeamView), tenantHandler.ListInvitations)
		tenant.POST("/invitations", RequirePermission(tenantService, models.PermTeamInvite), tenantHandler.InviteMember)
		tenant.DELETE("/invitations/:invitation_id", RequirePermission(tenantService, models.PermTeamInvite), tenantHandler.CancelInvitation)

		// Roles
		tenant.GET("/roles", RequirePermission(tenantService, models.PermTeamView), tenantHandler.ListRoles)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	log.Printf("Tenant service starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// TenantMiddleware validates tenant access and sets tenant context
func TenantMiddleware(tenantRepo repository.TenantRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantIDStr := c.Param("tenant_id")
		userIDVal, _ := c.Get("user_id")

		tenantID, err := parseUUID(tenantIDStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid tenant ID"})
			c.Abort()
			return
		}

		userID, ok := userIDVal.(string)
		if !ok {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		userUUID, err := parseUUID(userID)
		if err != nil {
			c.JSON(401, gin.H{"error": "Invalid user ID"})
			c.Abort()
			return
		}

		// Check if user is a member of this tenant
		member, err := tenantRepo.GetMember(c.Request.Context(), tenantID, userUUID)
		if err != nil {
			c.JSON(403, gin.H{"error": "Access denied to this tenant"})
			c.Abort()
			return
		}

		if member.Status != "active" {
			c.JSON(403, gin.H{"error": "Your access to this tenant has been suspended"})
			c.Abort()
			return
		}

		// Set context
		c.Set("tenant_id", tenantID)
		c.Set("member", member)
		c.Set("role", member.Role)

		c.Next()
	}
}

// RequirePermission middleware checks if user has the required permission
func RequirePermission(tenantService services.TenantService, permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantIDVal, _ := c.Get("tenant_id")
		userIDVal, _ := c.Get("user_id")

		tenantID, ok := tenantIDVal.(uuid.UUID)
		if !ok {
			c.JSON(400, gin.H{"error": "Invalid tenant context"})
			c.Abort()
			return
		}

		userID, err := parseUUID(userIDVal.(string))
		if err != nil {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		hasPermission, err := tenantService.CheckPermission(c.Request.Context(), tenantID, userID, permission)
		if err != nil || !hasPermission {
			c.JSON(403, gin.H{"error": "You don't have permission to perform this action"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}

func initializeDefaultRoles(db interface{}) {
	// This is a simplified version - in production, you'd check if roles exist first
	// and only create missing ones
	log.Println("Initializing default roles...")

	// The actual implementation would:
	// 1. Check if system roles exist
	// 2. Create missing roles
	// 3. Set permissions for each role
}
