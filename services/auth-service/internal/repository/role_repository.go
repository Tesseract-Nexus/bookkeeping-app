package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/models"
	"gorm.io/gorm"
)

// RoleRepository handles role data operations
type RoleRepository interface {
	Create(ctx context.Context, role *models.Role) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Role, error)
	GetByName(ctx context.Context, name string) (*models.Role, error)
	GetAll(ctx context.Context) ([]models.Role, error)
	GetByNames(ctx context.Context, names []string) ([]models.Role, error)
	Update(ctx context.Context, role *models.Role) error
	Delete(ctx context.Context, id uuid.UUID) error
	SeedDefaultRoles(ctx context.Context) error
	SeedDefaultPermissions(ctx context.Context) error
}

type roleRepository struct {
	db *gorm.DB
}

// NewRoleRepository creates a new role repository
func NewRoleRepository(db *gorm.DB) RoleRepository {
	return &roleRepository{db: db}
}

func (r *roleRepository) Create(ctx context.Context, role *models.Role) error {
	return r.db.WithContext(ctx).Create(role).Error
}

func (r *roleRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Role, error) {
	var role models.Role
	err := r.db.WithContext(ctx).
		Preload("Permissions").
		First(&role, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *roleRepository) GetByName(ctx context.Context, name string) (*models.Role, error) {
	var role models.Role
	err := r.db.WithContext(ctx).
		Preload("Permissions").
		First(&role, "name = ?", name).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *roleRepository) GetAll(ctx context.Context) ([]models.Role, error) {
	var roles []models.Role
	err := r.db.WithContext(ctx).
		Preload("Permissions").
		Order("level DESC").
		Find(&roles).Error
	if err != nil {
		return nil, err
	}
	return roles, nil
}

func (r *roleRepository) GetByNames(ctx context.Context, names []string) ([]models.Role, error) {
	var roles []models.Role
	err := r.db.WithContext(ctx).
		Where("name IN ?", names).
		Find(&roles).Error
	if err != nil {
		return nil, err
	}
	return roles, nil
}

func (r *roleRepository) Update(ctx context.Context, role *models.Role) error {
	return r.db.WithContext(ctx).Save(role).Error
}

func (r *roleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Role{}, "id = ?", id).Error
}

func (r *roleRepository) SeedDefaultRoles(ctx context.Context) error {
	for _, role := range models.DefaultRoles {
		var existing models.Role
		err := r.db.WithContext(ctx).Where("name = ?", role.Name).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			if err := r.db.WithContext(ctx).Create(&role).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *roleRepository) SeedDefaultPermissions(ctx context.Context) error {
	for _, perm := range models.DefaultPermissions {
		var existing models.Permission
		err := r.db.WithContext(ctx).Where("name = ?", perm.Name).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			if err := r.db.WithContext(ctx).Create(&perm).Error; err != nil {
				return err
			}
		}
	}
	return nil
}
