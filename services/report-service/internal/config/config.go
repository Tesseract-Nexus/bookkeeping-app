package config

import (
	sharedConfig "github.com/tesseract-nexus/bookkeeping-app/go-shared/config"
)

// Config holds report service configuration
type Config struct {
	*sharedConfig.Config
}

// Load loads report service configuration
func Load() (*Config, error) {
	cfg, err := sharedConfig.Load("report-service")
	if err != nil {
		return nil, err
	}

	// Override default database name - connect to core database for reports
	if cfg.Database.DBName == "report-service_db" {
		cfg.Database.DBName = "bookkeep_core"
	}

	return &Config{Config: cfg}, nil
}
