package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	goredis "github.com/tesseract-nexus/bookkeeping-app/go-shared/redis"
)

// Cache provides a high-level caching interface
type Cache struct {
	redis *goredis.Client
}

// New creates a new Cache instance
func New(redis *goredis.Client) *Cache {
	return &Cache{redis: redis}
}

// Common TTL values
const (
	TTLShort     = 1 * time.Minute
	TTLMedium    = 5 * time.Minute
	TTLLong      = 30 * time.Minute
	TTLVeryLong  = 24 * time.Hour
	TTLPermanent = 0 // No expiration
)

// Get retrieves a cached value
func (c *Cache) Get(ctx context.Context, key string, dest interface{}) error {
	return c.redis.Get(ctx, key, dest)
}

// Set stores a value in cache
func (c *Cache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	return c.redis.Set(ctx, key, value, ttl)
}

// Delete removes a cached value
func (c *Cache) Delete(ctx context.Context, keys ...string) error {
	return c.redis.Delete(ctx, keys...)
}

// GetOrSet gets a cached value or sets it using the provided function
func (c *Cache) GetOrSet(ctx context.Context, key string, dest interface{}, ttl time.Duration, fn func() (interface{}, error)) error {
	err := c.redis.Get(ctx, key, dest)
	if err == nil {
		return nil // Cache hit
	}

	if err != goredis.ErrNotFound {
		return err // Actual error
	}

	// Cache miss - fetch and store
	value, err := fn()
	if err != nil {
		return err
	}

	// Store in cache
	if err := c.redis.Set(ctx, key, value, ttl); err != nil {
		// Log but don't fail - we have the data
		fmt.Printf("Failed to cache value: %v\n", err)
	}

	// Copy to dest
	data, _ := json.Marshal(value)
	return json.Unmarshal(data, dest)
}

// Invalidate removes cached items matching a pattern
func (c *Cache) Invalidate(ctx context.Context, pattern string) error {
	// This is a simplified implementation
	// In production, you'd use SCAN to find matching keys
	return c.redis.Delete(ctx, pattern)
}

// Dashboard cache helpers
type DashboardCacheKey struct {
	TenantID  string
	StartDate string
	EndDate   string
}

func (k DashboardCacheKey) String() string {
	return fmt.Sprintf("dashboard:%s:%s:%s", k.TenantID, k.StartDate, k.EndDate)
}

// CacheDashboard caches dashboard data
func (c *Cache) CacheDashboard(ctx context.Context, key DashboardCacheKey, data interface{}) error {
	return c.Set(ctx, key.String(), data, TTLShort)
}

// GetDashboard retrieves cached dashboard data
func (c *Cache) GetDashboard(ctx context.Context, key DashboardCacheKey, dest interface{}) error {
	return c.Get(ctx, key.String(), dest)
}

// InvalidateDashboard invalidates dashboard cache for a tenant
func (c *Cache) InvalidateDashboard(ctx context.Context, tenantID string) error {
	pattern := fmt.Sprintf("dashboard:%s:*", tenantID)
	return c.Invalidate(ctx, pattern)
}

// Invoice cache helpers
func (c *Cache) CacheInvoice(ctx context.Context, tenantID, invoiceID string, data interface{}) error {
	key := goredis.BuildTenantKey(goredis.InvoiceKeyPrefix, tenantID, invoiceID)
	return c.Set(ctx, key, data, TTLMedium)
}

func (c *Cache) GetInvoice(ctx context.Context, tenantID, invoiceID string, dest interface{}) error {
	key := goredis.BuildTenantKey(goredis.InvoiceKeyPrefix, tenantID, invoiceID)
	return c.Get(ctx, key, dest)
}

func (c *Cache) InvalidateInvoice(ctx context.Context, tenantID, invoiceID string) error {
	key := goredis.BuildTenantKey(goredis.InvoiceKeyPrefix, tenantID, invoiceID)
	return c.Delete(ctx, key)
}

// Customer cache helpers
func (c *Cache) CacheCustomer(ctx context.Context, tenantID, customerID string, data interface{}) error {
	key := goredis.BuildTenantKey(goredis.CustomerKeyPrefix, tenantID, customerID)
	return c.Set(ctx, key, data, TTLMedium)
}

func (c *Cache) GetCustomer(ctx context.Context, tenantID, customerID string, dest interface{}) error {
	key := goredis.BuildTenantKey(goredis.CustomerKeyPrefix, tenantID, customerID)
	return c.Get(ctx, key, dest)
}

func (c *Cache) InvalidateCustomer(ctx context.Context, tenantID, customerID string) error {
	key := goredis.BuildTenantKey(goredis.CustomerKeyPrefix, tenantID, customerID)
	return c.Delete(ctx, key)
}

// Session cache helpers
func (c *Cache) CacheSession(ctx context.Context, sessionID string, data interface{}, ttl time.Duration) error {
	key := goredis.BuildKey(goredis.SessionKeyPrefix, sessionID)
	return c.Set(ctx, key, data, ttl)
}

func (c *Cache) GetSession(ctx context.Context, sessionID string, dest interface{}) error {
	key := goredis.BuildKey(goredis.SessionKeyPrefix, sessionID)
	return c.Get(ctx, key, dest)
}

func (c *Cache) InvalidateSession(ctx context.Context, sessionID string) error {
	key := goredis.BuildKey(goredis.SessionKeyPrefix, sessionID)
	return c.Delete(ctx, key)
}

// Token blacklist helpers
func (c *Cache) BlacklistToken(ctx context.Context, tokenID string, ttl time.Duration) error {
	key := goredis.BuildKey(goredis.TokenBlacklistKey, tokenID)
	return c.redis.SetString(ctx, key, "1", ttl)
}

func (c *Cache) IsTokenBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	key := goredis.BuildKey(goredis.TokenBlacklistKey, tokenID)
	return c.redis.Exists(ctx, key)
}

// Rate limiting helpers
type RateLimitResult struct {
	Allowed   bool
	Remaining int64
	ResetAt   time.Time
}

func (c *Cache) CheckRateLimit(ctx context.Context, key string, limit int64, window time.Duration) (*RateLimitResult, error) {
	fullKey := goredis.BuildKey(goredis.RateLimitKeyPrefix, key)

	// Increment counter
	count, err := c.redis.Incr(ctx, fullKey)
	if err != nil {
		return nil, err
	}

	// Set TTL on first request
	if count == 1 {
		if err := c.redis.Expire(ctx, fullKey, window); err != nil {
			return nil, err
		}
	}

	// Get TTL for reset time
	ttl, err := c.redis.TTL(ctx, fullKey)
	if err != nil {
		ttl = window
	}

	return &RateLimitResult{
		Allowed:   count <= limit,
		Remaining: max(0, limit-count),
		ResetAt:   time.Now().Add(ttl),
	}, nil
}

func max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
