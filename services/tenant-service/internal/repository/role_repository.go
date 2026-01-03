package repository

import (
	"context"
	"errors"

	"github.com/bookkeep/tenant-service/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrRoleNotFound     = errors.New("role not found")
	ErrRoleNameExists   = errors.New("role name already exists in tenant")
	ErrSystemRole       = errors.New("cannot modify system role")
)

type RoleRepository interface {
	// Role CRUD
	Create(ctx context.Context, role *models.Role) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Role, error)
	GetByName(ctx context.Context, tenantID uuid.UUID, name string) (*models.Role, error)
	GetSystemRoleByName(ctx context.Context, name string) (*models.Role, error)
	List(ctx context.Context, tenantID uuid.UUID) ([]models.Role, error)
	ListSystemRoles(ctx context.Context) ([]models.Role, error)
	Update(ctx context.Context, role *models.Role) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Permissions
	SetPermissions(ctx context.Context, roleID uuid.UUID, permissions []string) error
	GetPermissions(ctx context.Context, roleID uuid.UUID) ([]models.RolePermission, error)

	// Audit
	CreateAuditLog(ctx context.Context, log *models.AuditLog) error
	ListAuditLogs(ctx context.Context, tenantID uuid.UUID, filters AuditLogFilters) ([]models.AuditLog, int64, error)
}

type AuditLogFilters struct {
	UserID     *uuid.UUID
	Action     string
	Resource   string
	ResourceID *uuid.UUID
	StartDate  string
	EndDate    string
	Limit      int
	Offset     int
}

type roleRepository struct {
	db *gorm.DB
}

func NewRoleRepository(db *gorm.DB) RoleRepository {
	return &roleRepository{db: db}
}

func (r *roleRepository) Create(ctx context.Context, role *models.Role) error {
	// Check if name exists in tenant
	var count int64
	query := r.db.WithContext(ctx).Model(&models.Role{}).Where("name = ?", role.Name)
	if role.TenantID != nil {
		query = query.Where("tenant_id = ? OR tenant_id IS NULL", role.TenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrRoleNameExists
	}

	return r.db.WithContext(ctx).Create(role).Error
}

func (r *roleRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Role, error) {
	var role models.Role
	err := r.db.WithContext(ctx).
		Preload("Permissions").
		First(&role, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}
	return &role, nil
}

func (r *roleRepository) GetByName(ctx context.Context, tenantID uuid.UUID, name string) (*models.Role, error) {
	var role models.Role
	err := r.db.WithContext(ctx).
		Preload("Permissions").
		Where("(tenant_id = ? OR tenant_id IS NULL) AND name = ?", tenantID, name).
		First(&role).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}
	return &role, nil
}

func (r *roleRepository) GetSystemRoleByName(ctx context.Context, name string) (*models.Role, error) {
	var role models.Role
	err := r.db.WithContext(ctx).
		Preload("Permissions").
		Where("tenant_id IS NULL AND name = ? AND is_system = true", name).
		First(&role).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}
	return &role, nil
}

func (r *roleRepository) List(ctx context.Context, tenantID uuid.UUID) ([]models.Role, error) {
	var roles []models.Role
	err := r.db.WithContext(ctx).
		Preload("Permissions").
		Where("tenant_id = ? OR tenant_id IS NULL", tenantID).
		Order("is_system DESC, name ASC").
		Find(&roles).Error
	return roles, err
}

func (r *roleRepository) ListSystemRoles(ctx context.Context) ([]models.Role, error) {
	var roles []models.Role
	err := r.db.WithContext(ctx).
		Preload("Permissions").
		Where("tenant_id IS NULL AND is_system = true").
		Order("name ASC").
		Find(&roles).Error
	return roles, err
}

func (r *roleRepository) Update(ctx context.Context, role *models.Role) error {
	if role.IsSystem {
		return ErrSystemRole
	}

	result := r.db.WithContext(ctx).Save(role)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrRoleNotFound
	}
	return nil
}

func (r *roleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	// Check if it's a system role
	var role models.Role
	if err := r.db.WithContext(ctx).First(&role, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrRoleNotFound
		}
		return err
	}

	if role.IsSystem {
		return ErrSystemRole
	}

	// Delete permissions first
	if err := r.db.WithContext(ctx).Delete(&models.RolePermission{}, "role_id = ?", id).Error; err != nil {
		return err
	}

	return r.db.WithContext(ctx).Delete(&role).Error
}

func (r *roleRepository) SetPermissions(ctx context.Context, roleID uuid.UUID, permissions []string) error {
	// Start transaction
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete existing permissions
		if err := tx.Delete(&models.RolePermission{}, "role_id = ?", roleID).Error; err != nil {
			return err
		}

		// Create new permissions
		for _, perm := range permissions {
			rp := models.RolePermission{
				RoleID:     roleID,
				Permission: perm,
			}
			if err := tx.Create(&rp).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *roleRepository) GetPermissions(ctx context.Context, roleID uuid.UUID) ([]models.RolePermission, error) {
	var perms []models.RolePermission
	err := r.db.WithContext(ctx).
		Where("role_id = ?", roleID).
		Find(&perms).Error
	return perms, err
}

// Audit Logs

func (r *roleRepository) CreateAuditLog(ctx context.Context, log *models.AuditLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *roleRepository) ListAuditLogs(ctx context.Context, tenantID uuid.UUID, filters AuditLogFilters) ([]models.AuditLog, int64, error) {
	var logs []models.AuditLog
	var total int64

	query := r.db.WithContext(ctx).Model(&models.AuditLog{}).Where("tenant_id = ?", tenantID)

	if filters.UserID != nil {
		query = query.Where("user_id = ?", *filters.UserID)
	}
	if filters.Action != "" {
		query = query.Where("action = ?", filters.Action)
	}
	if filters.Resource != "" {
		query = query.Where("resource = ?", filters.Resource)
	}
	if filters.ResourceID != nil {
		query = query.Where("resource_id = ?", *filters.ResourceID)
	}
	if filters.StartDate != "" {
		query = query.Where("created_at >= ?", filters.StartDate)
	}
	if filters.EndDate != "" {
		query = query.Where("created_at <= ?", filters.EndDate)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	}
	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}

	err := query.Order("created_at DESC").Find(&logs).Error
	return logs, total, err
}
