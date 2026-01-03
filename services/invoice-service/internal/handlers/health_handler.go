package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/database"
	"gorm.io/gorm"
)

// HealthHandler handles health check endpoints
type HealthHandler struct {
	db *gorm.DB
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(db *gorm.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

// Health returns service health status
func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "invoice-service",
	})
}

// Ready returns service readiness status
func (h *HealthHandler) Ready(c *gin.Context) {
	if err := database.HealthCheck(h.db); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "not ready",
			"service": "invoice-service",
			"error":   "database connection failed",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "ready",
		"service": "invoice-service",
	})
}
