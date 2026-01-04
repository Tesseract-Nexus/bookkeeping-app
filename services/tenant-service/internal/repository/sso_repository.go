package repository

import (
	"context"
	"errors"

	"github.com/bookkeep/tenant-service/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrSSOConfigNotFound      = errors.New("SSO configuration not found")
	ErrSSOGroupMappingNotFound = errors.New("SSO group mapping not found")
)

type SSORepository interface {
	// SSO Configuration
	GetByTenantID(ctx context.Context, tenantID uuid.UUID) (*models.TenantSSOConfig, error)
	Create(ctx context.Context, config *models.TenantSSOConfig) error
	Update(ctx context.Context, config *models.TenantSSOConfig) error
	Delete(ctx context.Context, tenantID uuid.UUID) error

	// Group Mappings
	ListGroupMappings(ctx context.Context, tenantID uuid.UUID) ([]models.SSOGroupMapping, error)
	GetGroupMappingByID(ctx context.Context, tenantID, mappingID uuid.UUID) (*models.SSOGroupMapping, error)
	CreateGroupMapping(ctx context.Context, mapping *models.SSOGroupMapping) error
	UpdateGroupMapping(ctx context.Context, mapping *models.SSOGroupMapping) error
	DeleteGroupMapping(ctx context.Context, tenantID, mappingID uuid.UUID) error

	// Login Attempts
	LogLoginAttempt(ctx context.Context, attempt *models.SSOLoginAttempt) error
	GetLoginAttempts(ctx context.Context, tenantID uuid.UUID, limit int) ([]models.SSOLoginAttempt, error)

	// KeyCloak Configuration
	GetKeycloakConfig(ctx context.Context, tenantID uuid.UUID) (*models.KeycloakConfig, error)
	CreateKeycloakConfig(ctx context.Context, config *models.KeycloakConfig) error
	UpdateKeycloakConfig(ctx context.Context, config *models.KeycloakConfig) error
}

type ssoRepository struct {
	db *gorm.DB
}

func NewSSORepository(db *gorm.DB) SSORepository {
	return &ssoRepository{db: db}
}

// SSO Configuration

func (r *ssoRepository) GetByTenantID(ctx context.Context, tenantID uuid.UUID) (*models.TenantSSOConfig, error) {
	var config models.TenantSSOConfig
	if err := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		First(&config).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSSOConfigNotFound
		}
		return nil, err
	}
	return &config, nil
}

func (r *ssoRepository) Create(ctx context.Context, config *models.TenantSSOConfig) error {
	return r.db.WithContext(ctx).Create(config).Error
}

func (r *ssoRepository) Update(ctx context.Context, config *models.TenantSSOConfig) error {
	return r.db.WithContext(ctx).Save(config).Error
}

func (r *ssoRepository) Delete(ctx context.Context, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Delete(&models.TenantSSOConfig{}).Error
}

// Group Mappings

func (r *ssoRepository) ListGroupMappings(ctx context.Context, tenantID uuid.UUID) ([]models.SSOGroupMapping, error) {
	var mappings []models.SSOGroupMapping
	if err := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Preload("Role").
		Order("priority DESC").
		Find(&mappings).Error; err != nil {
		return nil, err
	}
	return mappings, nil
}

func (r *ssoRepository) GetGroupMappingByID(ctx context.Context, tenantID, mappingID uuid.UUID) (*models.SSOGroupMapping, error) {
	var mapping models.SSOGroupMapping
	if err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, mappingID).
		Preload("Role").
		First(&mapping).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSSOGroupMappingNotFound
		}
		return nil, err
	}
	return &mapping, nil
}

func (r *ssoRepository) CreateGroupMapping(ctx context.Context, mapping *models.SSOGroupMapping) error {
	return r.db.WithContext(ctx).Create(mapping).Error
}

func (r *ssoRepository) UpdateGroupMapping(ctx context.Context, mapping *models.SSOGroupMapping) error {
	return r.db.WithContext(ctx).Save(mapping).Error
}

func (r *ssoRepository) DeleteGroupMapping(ctx context.Context, tenantID, mappingID uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, mappingID).
		Delete(&models.SSOGroupMapping{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrSSOGroupMappingNotFound
	}
	return nil
}

// Login Attempts

func (r *ssoRepository) LogLoginAttempt(ctx context.Context, attempt *models.SSOLoginAttempt) error {
	return r.db.WithContext(ctx).Create(attempt).Error
}

func (r *ssoRepository) GetLoginAttempts(ctx context.Context, tenantID uuid.UUID, limit int) ([]models.SSOLoginAttempt, error) {
	var attempts []models.SSOLoginAttempt
	query := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Order("attempted_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&attempts).Error; err != nil {
		return nil, err
	}
	return attempts, nil
}

// KeyCloak Configuration

func (r *ssoRepository) GetKeycloakConfig(ctx context.Context, tenantID uuid.UUID) (*models.KeycloakConfig, error) {
	var config models.KeycloakConfig
	if err := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		First(&config).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSSOConfigNotFound
		}
		return nil, err
	}
	return &config, nil
}

func (r *ssoRepository) CreateKeycloakConfig(ctx context.Context, config *models.KeycloakConfig) error {
	return r.db.WithContext(ctx).Create(config).Error
}

func (r *ssoRepository) UpdateKeycloakConfig(ctx context.Context, config *models.KeycloakConfig) error {
	return r.db.WithContext(ctx).Save(config).Error
}
