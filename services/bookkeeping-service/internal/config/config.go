package config

import (
	sharedConfig "github.com/tesseract-nexus/bookkeeping-app/go-shared/config"
)

// Config holds bookkeeping service configuration
type Config struct {
	*sharedConfig.Config
}

// Load loads bookkeeping service configuration
func Load() (*Config, error) {
	cfg, err := sharedConfig.Load("bookkeeping-service")
	if err != nil {
		return nil, err
	}

	// Override default database name
	if cfg.Database.DBName == "bookkeeping-service_db" {
		cfg.Database.DBName = "bookkeep_core"
	}

	return &Config{Config: cfg}, nil
}
