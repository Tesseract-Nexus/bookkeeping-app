package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// SecurityHeaders adds security headers to all responses
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")

		// XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")

		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// HSTS - enforce HTTPS (1 year)
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

		// Content Security Policy
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'")

		// Referrer Policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions Policy (formerly Feature-Policy)
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Remove server identification
		c.Header("Server", "")

		c.Next()
	}
}

// CORS configures Cross-Origin Resource Sharing
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Allow specific origins in production
		allowedOrigins := map[string]bool{
			"https://app.bookkeep.in":     true,
			"https://www.bookkeep.in":     true,
			"https://bookkeep.in":         true,
			"http://localhost:3000":       true, // Development
			"http://localhost:3001":       true, // Development
			"exp://localhost:19000":       true, // Expo development
		}

		if allowedOrigins[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID, X-Tenant-ID")
		c.Header("Access-Control-Expose-Headers", "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "43200") // 12 hours

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// ValidateContentType ensures correct content type for POST/PUT/PATCH
func ValidateContentType() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			contentType := c.Request.Header.Get("Content-Type")
			if !strings.HasPrefix(contentType, "application/json") &&
				!strings.HasPrefix(contentType, "multipart/form-data") {
				c.AbortWithStatusJSON(http.StatusUnsupportedMediaType, gin.H{
					"error":   "unsupported_media_type",
					"message": "Content-Type must be application/json or multipart/form-data",
				})
				return
			}
		}
		c.Next()
	}
}

// RequestSizeLimit limits the size of request bodies
func RequestSizeLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// NoCache adds headers to prevent caching of sensitive data
func NoCache() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}

// SecureRedirect ensures HTTPS in production
func SecureRedirect() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Header.Get("X-Forwarded-Proto") == "http" {
			httpsURL := "https://" + c.Request.Host + c.Request.RequestURI
			c.Redirect(http.StatusMovedPermanently, httpsURL)
			c.Abort()
			return
		}
		c.Next()
	}
}

// SanitizeRequest removes potentially dangerous characters from query params
func SanitizeRequest() gin.HandlerFunc {
	dangerousPatterns := []string{
		"<script", "</script>", "javascript:", "onerror=", "onload=",
		"eval(", "document.", "window.", "alert(",
	}

	return func(c *gin.Context) {
		// Check query parameters
		for key, values := range c.Request.URL.Query() {
			for _, value := range values {
				valueLower := strings.ToLower(value)
				for _, pattern := range dangerousPatterns {
					if strings.Contains(valueLower, pattern) {
						c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
							"error":   "invalid_input",
							"message": "Request contains potentially dangerous content",
						})
						return
					}
				}
			}
			// Also check keys
			keyLower := strings.ToLower(key)
			for _, pattern := range dangerousPatterns {
				if strings.Contains(keyLower, pattern) {
					c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
						"error":   "invalid_input",
						"message": "Request contains potentially dangerous content",
					})
					return
				}
			}
		}

		c.Next()
	}
}
