package config

import (
	sharedConfig "github.com/tesseract-nexus/bookkeeping-app/go-shared/config"
)

// Config holds customer service configuration
type Config struct {
	*sharedConfig.Config
}

// Load loads customer service configuration
func Load() (*Config, error) {
	cfg, err := sharedConfig.Load("customer-service")
	if err != nil {
		return nil, err
	}

	// Override default database name
	if cfg.Database.DBName == "customer-service_db" {
		cfg.Database.DBName = "bookkeep_customer"
	}

	return &Config{Config: cfg}, nil
}
