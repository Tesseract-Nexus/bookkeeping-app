package config

import (
	"time"

	sharedConfig "github.com/tesseract-nexus/bookkeeping-app/go-shared/config"
)

// Config holds auth service configuration
type Config struct {
	*sharedConfig.Config
}

// Load loads auth service configuration
func Load() (*Config, error) {
	cfg, err := sharedConfig.Load("auth-service")
	if err != nil {
		return nil, err
	}

	// Override default database name
	if cfg.Database.DBName == "auth-service_db" {
		cfg.Database.DBName = "bookkeep_auth"
	}

	// Set auth-specific defaults
	if cfg.JWT.AccessTokenTTL == 0 {
		cfg.JWT.AccessTokenTTL = 15 * time.Minute
	}
	if cfg.JWT.RefreshTokenTTL == 0 {
		cfg.JWT.RefreshTokenTTL = 7 * 24 * time.Hour
	}

	return &Config{Config: cfg}, nil
}
