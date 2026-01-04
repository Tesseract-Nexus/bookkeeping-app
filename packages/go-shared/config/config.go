package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for a service
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	NATS     NATSConfig
	JWT      JWTConfig
	App      AppConfig
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Host string
	Port int
}

// DatabaseConfig holds PostgreSQL configuration
type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

// NATSConfig holds NATS configuration
type NATSConfig struct {
	URL string
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret           string
	Issuer           string
	AccessTokenTTL   time.Duration
	RefreshTokenTTL  time.Duration
	SkipPaths        []string
}

// AppConfig holds application-specific configuration
type AppConfig struct {
	Name        string
	Environment string
	LogLevel    string
	Version     string
}

// Load loads configuration from environment variables
func Load(serviceName string) (*Config, error) {
	environment := GetEnv("GIN_MODE", "debug")
	jwtSecret := GetEnv("JWT_SECRET", "")

	// Validate JWT_SECRET in production
	if environment == "release" && jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required in production mode")
	}

	// Validate JWT_SECRET minimum length
	if jwtSecret != "" && len(jwtSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be at least 32 characters long")
	}

	config := &Config{
		Server: ServerConfig{
			Host: GetEnv("HOST", "0.0.0.0"),
			Port: GetEnvAsInt("PORT", 8080),
		},
		Database: DatabaseConfig{
			Host:            GetEnv("DB_HOST", "localhost"),
			Port:            GetEnvAsInt("DB_PORT", 5432),
			User:            GetEnv("DB_USER", "postgres"),
			Password:        GetEnv("DB_PASSWORD", "postgres"),
			DBName:          GetEnv("DB_NAME", serviceName+"_db"),
			SSLMode:         GetEnv("DB_SSLMODE", "disable"),
			MaxOpenConns:    GetEnvAsInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    GetEnvAsInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: GetEnvAsDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
			ConnMaxIdleTime: GetEnvAsDuration("DB_CONN_MAX_IDLE_TIME", 5*time.Minute),
		},
		Redis: RedisConfig{
			Host:     GetEnv("REDIS_HOST", "localhost"),
			Port:     GetEnvAsInt("REDIS_PORT", 6379),
			Password: GetEnv("REDIS_PASSWORD", ""),
			DB:       GetEnvAsInt("REDIS_DB", 0),
		},
		NATS: NATSConfig{
			URL: GetEnv("NATS_URL", "nats://localhost:4222"),
		},
		JWT: JWTConfig{
			Secret:          jwtSecret,
			Issuer:          GetEnv("JWT_ISSUER", "bookkeeping-auth"),
			AccessTokenTTL:  GetEnvAsDuration("JWT_ACCESS_TOKEN_TTL", 15*time.Minute),
			RefreshTokenTTL: GetEnvAsDuration("JWT_REFRESH_TOKEN_TTL", 7*24*time.Hour),
			SkipPaths:       []string{"/health", "/ready", "/metrics"},
		},
		App: AppConfig{
			Name:        serviceName,
			Environment: environment,
			LogLevel:    GetEnv("LOG_LEVEL", "info"),
			Version:     GetEnv("APP_VERSION", "0.1.0"),
		},
	}

	return config, nil
}

// GetDatabaseDSN returns the database connection string
func (c *Config) GetDatabaseDSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.DBName,
		c.Database.SSLMode,
	)
}

// GetServerAddress returns the server address
func (c *Config) GetServerAddress() string {
	return fmt.Sprintf("%s:%d", c.Server.Host, c.Server.Port)
}

// GetRedisAddress returns the Redis address
func (c *Config) GetRedisAddress() string {
	return fmt.Sprintf("%s:%d", c.Redis.Host, c.Redis.Port)
}

// IsProduction returns true if running in production
func (c *Config) IsProduction() bool {
	return c.App.Environment == "release"
}

// Helper functions
func GetEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func GetEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func GetEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func GetEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}
