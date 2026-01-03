package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AuditLogger interface for audit log storage
type AuditLogger interface {
	Log(entry AuditEntry) error
}

// AuditEntry represents an audit log entry
type AuditEntry struct {
	ID          string                 `json:"id"`
	TenantID    string                 `json:"tenant_id,omitempty"`
	UserID      string                 `json:"user_id,omitempty"`
	Action      string                 `json:"action"`
	Resource    string                 `json:"resource"`
	ResourceID  string                 `json:"resource_id,omitempty"`
	Method      string                 `json:"method"`
	Path        string                 `json:"path"`
	StatusCode  int                    `json:"status_code"`
	Duration    int64                  `json:"duration_ms"`
	IPAddress   string                 `json:"ip_address"`
	UserAgent   string                 `json:"user_agent"`
	RequestID   string                 `json:"request_id"`
	RequestBody map[string]interface{} `json:"request_body,omitempty"`
	Error       string                 `json:"error,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
}

// AuditConfig configures audit logging
type AuditConfig struct {
	Logger           AuditLogger
	SkipPaths        []string
	LogRequestBody   bool
	SensitiveFields  []string
	MaxBodyLogSize   int
}

// DefaultAuditConfig returns sensible defaults
func DefaultAuditConfig() AuditConfig {
	return AuditConfig{
		SkipPaths:      []string{"/health", "/metrics", "/favicon.ico"},
		LogRequestBody: true,
		SensitiveFields: []string{
			"password", "token", "secret", "api_key", "otp",
			"credit_card", "bank_account", "ssn", "pan",
		},
		MaxBodyLogSize: 10000, // 10KB max
	}
}

// Audit creates an audit logging middleware
func Audit(config AuditConfig) gin.HandlerFunc {
	skipPaths := make(map[string]bool)
	for _, path := range config.SkipPaths {
		skipPaths[path] = true
	}

	return func(c *gin.Context) {
		// Skip certain paths
		if skipPaths[c.Request.URL.Path] {
			c.Next()
			return
		}

		start := time.Now()

		// Read request body if configured
		var requestBody map[string]interface{}
		if config.LogRequestBody && c.Request.Body != nil {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			// Restore body for handlers
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

			// Parse JSON body
			if len(bodyBytes) > 0 && len(bodyBytes) <= config.MaxBodyLogSize {
				json.Unmarshal(bodyBytes, &requestBody)
				// Redact sensitive fields
				requestBody = redactSensitive(requestBody, config.SensitiveFields)
			}
		}

		// Process request
		c.Next()

		// Build audit entry
		entry := AuditEntry{
			ID:          uuid.New().String(),
			Method:      c.Request.Method,
			Path:        c.Request.URL.Path,
			StatusCode:  c.Writer.Status(),
			Duration:    time.Since(start).Milliseconds(),
			IPAddress:   c.ClientIP(),
			UserAgent:   c.Request.UserAgent(),
			RequestID:   c.GetString("request_id"),
			RequestBody: requestBody,
			CreatedAt:   time.Now().UTC(),
		}

		// Add user context if available
		if userID, exists := c.Get("user_id"); exists {
			entry.UserID = userID.(string)
		}
		if tenantID, exists := c.Get("tenant_id"); exists {
			if id, ok := tenantID.(uuid.UUID); ok {
				entry.TenantID = id.String()
			} else if str, ok := tenantID.(string); ok {
				entry.TenantID = str
			}
		}

		// Determine action from method and path
		entry.Action = determineAction(c.Request.Method, c.Request.URL.Path)
		entry.Resource = determineResource(c.Request.URL.Path)

		// Get resource ID from path if available
		if id := c.Param("id"); id != "" {
			entry.ResourceID = id
		}

		// Add error if present
		if len(c.Errors) > 0 {
			entry.Error = c.Errors.Last().Error()
		}

		// Log asynchronously
		if config.Logger != nil {
			go config.Logger.Log(entry)
		}
	}
}

// redactSensitive removes sensitive data from the request body
func redactSensitive(data map[string]interface{}, sensitiveFields []string) map[string]interface{} {
	if data == nil {
		return nil
	}

	result := make(map[string]interface{})
	for key, value := range data {
		// Check if this field is sensitive
		isSensitive := false
		for _, sensitive := range sensitiveFields {
			if key == sensitive {
				isSensitive = true
				break
			}
		}

		if isSensitive {
			result[key] = "[REDACTED]"
		} else if nested, ok := value.(map[string]interface{}); ok {
			result[key] = redactSensitive(nested, sensitiveFields)
		} else {
			result[key] = value
		}
	}
	return result
}

// determineAction maps HTTP method to action verb
func determineAction(method, path string) string {
	switch method {
	case "GET":
		return "view"
	case "POST":
		return "create"
	case "PUT", "PATCH":
		return "update"
	case "DELETE":
		return "delete"
	default:
		return method
	}
}

// determineResource extracts resource name from path
func determineResource(path string) string {
	// Extract first path segment after /api/v1/
	// e.g., /api/v1/invoices/123 -> invoices
	parts := bytes.Split([]byte(path), []byte("/"))
	for i, part := range parts {
		if string(part) == "v1" && i+1 < len(parts) {
			return string(parts[i+1])
		}
	}
	return "unknown"
}

// PostgresAuditLogger implements AuditLogger for PostgreSQL
type PostgresAuditLogger struct {
	db interface{} // Would be *gorm.DB in actual implementation
}

// NewPostgresAuditLogger creates a new PostgreSQL audit logger
func NewPostgresAuditLogger(db interface{}) *PostgresAuditLogger {
	return &PostgresAuditLogger{db: db}
}

// Log writes an audit entry to the database
func (l *PostgresAuditLogger) Log(entry AuditEntry) error {
	// In actual implementation:
	// return l.db.Create(&entry).Error
	return nil
}

// ConsoleAuditLogger implements AuditLogger for console output (development)
type ConsoleAuditLogger struct{}

// Log prints audit entry to console
func (l *ConsoleAuditLogger) Log(entry AuditEntry) error {
	data, _ := json.MarshalIndent(entry, "", "  ")
	println(string(data))
	return nil
}
