package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	requests map[string]*clientRate
	mu       sync.RWMutex
	config   RateLimitConfig
}

type clientRate struct {
	count     int
	lastReset time.Time
}

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	RequestsPerMinute int
	BurstSize         int
	CleanupInterval   time.Duration
}

// DefaultRateLimitConfig returns sensible defaults
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		RequestsPerMinute: 100,
		BurstSize:         20,
		CleanupInterval:   5 * time.Minute,
	}
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(config RateLimitConfig) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string]*clientRate),
		config:   config,
	}

	// Start cleanup goroutine
	go rl.cleanup()

	return rl
}

// Middleware returns a gin middleware for rate limiting
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		rl.mu.Lock()
		client, exists := rl.requests[clientIP]

		now := time.Now()
		windowStart := now.Add(-time.Minute)

		if !exists || client.lastReset.Before(windowStart) {
			// New client or window expired
			rl.requests[clientIP] = &clientRate{
				count:     1,
				lastReset: now,
			}
			rl.mu.Unlock()
		} else {
			// Existing client within window
			client.count++
			remaining := rl.config.RequestsPerMinute - client.count
			rl.mu.Unlock()

			// Set rate limit headers
			c.Header("X-RateLimit-Limit", strconv.Itoa(rl.config.RequestsPerMinute))
			c.Header("X-RateLimit-Remaining", strconv.Itoa(max(0, remaining)))
			c.Header("X-RateLimit-Reset", strconv.FormatInt(client.lastReset.Add(time.Minute).Unix(), 10))

			if remaining < 0 {
				c.Header("Retry-After", "60")
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"error":   "rate_limit_exceeded",
					"message": "Too many requests. Please try again later.",
				})
				return
			}
		}

		c.Next()
	}
}

// cleanup removes old entries periodically
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.config.CleanupInterval)
	for range ticker.C {
		rl.mu.Lock()
		threshold := time.Now().Add(-2 * time.Minute)
		for ip, client := range rl.requests {
			if client.lastReset.Before(threshold) {
				delete(rl.requests, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimitByKey creates a rate limiter keyed by a custom function
func RateLimitByKey(keyFunc func(*gin.Context) string, requestsPerMinute int) gin.HandlerFunc {
	limiter := NewRateLimiter(RateLimitConfig{
		RequestsPerMinute: requestsPerMinute,
		CleanupInterval:   5 * time.Minute,
	})

	return func(c *gin.Context) {
		key := keyFunc(c)
		if key == "" {
			c.Next()
			return
		}

		limiter.mu.Lock()
		client, exists := limiter.requests[key]
		now := time.Now()
		windowStart := now.Add(-time.Minute)

		if !exists || client.lastReset.Before(windowStart) {
			limiter.requests[key] = &clientRate{
				count:     1,
				lastReset: now,
			}
			limiter.mu.Unlock()
		} else {
			client.count++
			remaining := requestsPerMinute - client.count
			limiter.mu.Unlock()

			c.Header("X-RateLimit-Limit", strconv.Itoa(requestsPerMinute))
			c.Header("X-RateLimit-Remaining", strconv.Itoa(max(0, remaining)))

			if remaining < 0 {
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"error":   "rate_limit_exceeded",
					"message": "Too many requests. Please try again later.",
				})
				return
			}
		}

		c.Next()
	}
}

// OTPRateLimit specifically for OTP requests (stricter limits)
func OTPRateLimit() gin.HandlerFunc {
	return RateLimitByKey(func(c *gin.Context) string {
		// Key by phone number if available
		var req struct {
			Phone string `json:"phone"`
		}
		if err := c.ShouldBindJSON(&req); err == nil && req.Phone != "" {
			return "otp:" + req.Phone
		}
		return "otp:" + c.ClientIP()
	}, 5) // 5 OTP requests per minute per phone
}

// AuthRateLimit for authentication endpoints
func AuthRateLimit() gin.HandlerFunc {
	return RateLimitByKey(func(c *gin.Context) string {
		return "auth:" + c.ClientIP()
	}, 10) // 10 auth requests per minute
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
