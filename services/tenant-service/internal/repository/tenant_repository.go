package repository

import (
	"context"
	"errors"
	"time"

	"github.com/bookkeep/tenant-service/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrTenantNotFound     = errors.New("tenant not found")
	ErrSlugExists         = errors.New("tenant slug already exists")
	ErrMemberNotFound     = errors.New("member not found")
	ErrMemberExists       = errors.New("member already exists in tenant")
	ErrInvitationNotFound = errors.New("invitation not found")
	ErrInvitationExpired  = errors.New("invitation has expired")
)

type TenantRepository interface {
	// Tenant CRUD
	Create(ctx context.Context, tenant *models.Tenant) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Tenant, error)
	GetBySlug(ctx context.Context, slug string) (*models.Tenant, error)
	Update(ctx context.Context, tenant *models.Tenant) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Member Management
	AddMember(ctx context.Context, member *models.TenantMember) error
	GetMember(ctx context.Context, tenantID, userID uuid.UUID) (*models.TenantMember, error)
	GetMemberByID(ctx context.Context, memberID uuid.UUID) (*models.TenantMember, error)
	ListMembers(ctx context.Context, tenantID uuid.UUID) ([]models.TenantMember, error)
	UpdateMember(ctx context.Context, member *models.TenantMember) error
	RemoveMember(ctx context.Context, tenantID, userID uuid.UUID) error

	// Invitations
	CreateInvitation(ctx context.Context, invitation *models.TenantInvitation) error
	GetInvitationByToken(ctx context.Context, token string) (*models.TenantInvitation, error)
	GetInvitationByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.TenantInvitation, error)
	ListInvitations(ctx context.Context, tenantID uuid.UUID) ([]models.TenantInvitation, error)
	UpdateInvitation(ctx context.Context, invitation *models.TenantInvitation) error
	DeleteInvitation(ctx context.Context, id uuid.UUID) error

	// User's Tenants
	GetUserTenants(ctx context.Context, userID uuid.UUID) ([]models.TenantMember, error)
}

type tenantRepository struct {
	db *gorm.DB
}

func NewTenantRepository(db *gorm.DB) TenantRepository {
	return &tenantRepository{db: db}
}

// Tenant CRUD

func (r *tenantRepository) Create(ctx context.Context, tenant *models.Tenant) error {
	// Check if slug exists
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.Tenant{}).
		Where("slug = ?", tenant.Slug).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrSlugExists
	}

	return r.db.WithContext(ctx).Create(tenant).Error
}

func (r *tenantRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Tenant, error) {
	var tenant models.Tenant
	err := r.db.WithContext(ctx).
		Preload("Roles.Permissions").
		First(&tenant, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTenantNotFound
		}
		return nil, err
	}
	return &tenant, nil
}

func (r *tenantRepository) GetBySlug(ctx context.Context, slug string) (*models.Tenant, error) {
	var tenant models.Tenant
	err := r.db.WithContext(ctx).First(&tenant, "slug = ?", slug).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTenantNotFound
		}
		return nil, err
	}
	return &tenant, nil
}

func (r *tenantRepository) Update(ctx context.Context, tenant *models.Tenant) error {
	result := r.db.WithContext(ctx).Save(tenant)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrTenantNotFound
	}
	return nil
}

func (r *tenantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Delete(&models.Tenant{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrTenantNotFound
	}
	return nil
}

// Member Management

func (r *tenantRepository) AddMember(ctx context.Context, member *models.TenantMember) error {
	// Check if member already exists
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.TenantMember{}).
		Where("tenant_id = ? AND user_id = ?", member.TenantID, member.UserID).
		Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrMemberExists
	}

	return r.db.WithContext(ctx).Create(member).Error
}

func (r *tenantRepository) GetMember(ctx context.Context, tenantID, userID uuid.UUID) (*models.TenantMember, error) {
	var member models.TenantMember
	err := r.db.WithContext(ctx).
		Preload("Role.Permissions").
		First(&member, "tenant_id = ? AND user_id = ?", tenantID, userID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMemberNotFound
		}
		return nil, err
	}
	return &member, nil
}

func (r *tenantRepository) GetMemberByID(ctx context.Context, memberID uuid.UUID) (*models.TenantMember, error) {
	var member models.TenantMember
	err := r.db.WithContext(ctx).
		Preload("Role.Permissions").
		Preload("Tenant").
		First(&member, "id = ?", memberID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMemberNotFound
		}
		return nil, err
	}
	return &member, nil
}

func (r *tenantRepository) ListMembers(ctx context.Context, tenantID uuid.UUID) ([]models.TenantMember, error) {
	var members []models.TenantMember
	err := r.db.WithContext(ctx).
		Preload("Role").
		Where("tenant_id = ?", tenantID).
		Order("created_at ASC").
		Find(&members).Error
	return members, err
}

func (r *tenantRepository) UpdateMember(ctx context.Context, member *models.TenantMember) error {
	result := r.db.WithContext(ctx).Save(member)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrMemberNotFound
	}
	return nil
}

func (r *tenantRepository) RemoveMember(ctx context.Context, tenantID, userID uuid.UUID) error {
	result := r.db.WithContext(ctx).Delete(&models.TenantMember{},
		"tenant_id = ? AND user_id = ?", tenantID, userID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrMemberNotFound
	}
	return nil
}

// Invitations

func (r *tenantRepository) CreateInvitation(ctx context.Context, invitation *models.TenantInvitation) error {
	return r.db.WithContext(ctx).Create(invitation).Error
}

func (r *tenantRepository) GetInvitationByToken(ctx context.Context, token string) (*models.TenantInvitation, error) {
	var invitation models.TenantInvitation
	err := r.db.WithContext(ctx).
		Preload("Tenant").
		Preload("Role").
		First(&invitation, "token = ?", token).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvitationNotFound
		}
		return nil, err
	}

	if invitation.ExpiresAt.Before(time.Now()) {
		return nil, ErrInvitationExpired
	}

	return &invitation, nil
}

func (r *tenantRepository) GetInvitationByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.TenantInvitation, error) {
	var invitation models.TenantInvitation
	err := r.db.WithContext(ctx).
		First(&invitation, "tenant_id = ? AND email = ? AND status = 'pending'", tenantID, email).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvitationNotFound
		}
		return nil, err
	}
	return &invitation, nil
}

func (r *tenantRepository) ListInvitations(ctx context.Context, tenantID uuid.UUID) ([]models.TenantInvitation, error) {
	var invitations []models.TenantInvitation
	err := r.db.WithContext(ctx).
		Preload("Role").
		Where("tenant_id = ? AND status = 'pending'", tenantID).
		Order("created_at DESC").
		Find(&invitations).Error
	return invitations, err
}

func (r *tenantRepository) UpdateInvitation(ctx context.Context, invitation *models.TenantInvitation) error {
	return r.db.WithContext(ctx).Save(invitation).Error
}

func (r *tenantRepository) DeleteInvitation(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Delete(&models.TenantInvitation{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrInvitationNotFound
	}
	return nil
}

// User's Tenants

func (r *tenantRepository) GetUserTenants(ctx context.Context, userID uuid.UUID) ([]models.TenantMember, error) {
	var members []models.TenantMember
	err := r.db.WithContext(ctx).
		Preload("Tenant").
		Preload("Role").
		Where("user_id = ? AND status = 'active'", userID).
		Order("created_at ASC").
		Find(&members).Error
	return members, err
}
