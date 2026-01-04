package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestIDMiddleware adds a unique request ID to each request
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// CORSMiddleware handles CORS headers
// Note: Wildcard "*" origins are only allowed in development mode for security
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	// Build a map for O(1) origin lookup
	originMap := make(map[string]bool)
	allowWildcard := false
	for _, origin := range allowedOrigins {
		if origin == "*" {
			allowWildcard = true
		} else {
			originMap[origin] = true
		}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			c.Next()
			return
		}

		// Check if origin is allowed
		allowed := originMap[origin] || allowWildcard

		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID, X-Tenant-ID")
			c.Header("Access-Control-Expose-Headers", "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID")
			c.Header("Access-Control-Max-Age", "86400")
		}

		if c.Request.Method == "OPTIONS" {
			if allowed {
				c.AbortWithStatus(http.StatusNoContent)
			} else {
				c.AbortWithStatus(http.StatusForbidden)
			}
			return
		}

		c.Next()
	}
}

// TenantMiddleware extracts tenant ID from header or JWT
func TenantMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// First try to get from header
		tenantID := c.GetHeader("X-Tenant-ID")

		// If not in header, check if it was set by auth middleware
		if tenantID == "" {
			if tid, exists := c.Get("tenant_id"); exists {
				tenantID = tid.(string)
			}
		}

		if tenantID != "" {
			c.Set("tenant_id", tenantID)
		}

		c.Next()
	}
}

// LoggerMiddleware logs request details
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		endTime := time.Now()
		latency := endTime.Sub(startTime)

		if query != "" {
			path = path + "?" + query
		}

		requestID, _ := c.Get("request_id")
		tenantID, _ := c.Get("tenant_id")

		// Log in structured format
		gin.DefaultWriter.Write([]byte(
			time.Now().Format(time.RFC3339) + " | " +
				c.Request.Method + " | " +
				path + " | " +
				string(rune(c.Writer.Status())) + " | " +
				latency.String() + " | " +
				c.ClientIP() + " | " +
				"request_id=" + requestID.(string) + " | " +
				"tenant_id=" + tenantID.(string) + "\n",
		))
	}
}

// RecoveryMiddleware recovers from panics
func RecoveryMiddleware() gin.HandlerFunc {
	return gin.Recovery()
}

// SkipPathsMiddleware skips middleware for specified paths
func SkipPathsMiddleware(skipPaths []string, middleware gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		for _, skipPath := range skipPaths {
			if strings.HasPrefix(path, skipPath) {
				c.Next()
				return
			}
		}
		middleware(c)
	}
}
