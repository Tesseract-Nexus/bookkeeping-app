package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/auth-service/internal/models"
	"gorm.io/gorm"
)

// UserRepository handles user data operations
type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByPhone(ctx context.Context, phone string) (*models.User, error)
	GetByResetToken(ctx context.Context, token string) (*models.User, error)
	GetByVerificationToken(ctx context.Context, token string) (*models.User, error)
	GetByTenantID(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error)
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error
	VerifyEmail(ctx context.Context, id uuid.UUID) error
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
	AssignRoles(ctx context.Context, userID uuid.UUID, roleIDs []uuid.UUID) error
}

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Roles").
		First(&user, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Roles").
		First(&user, "email = ?", email).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByPhone(ctx context.Context, phone string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Roles").
		First(&user, "phone = ?", phone).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByResetToken(ctx context.Context, token string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Roles").
		First(&user, "reset_token = ?", token).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByVerificationToken(ctx context.Context, token string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Roles").
		First(&user, "verification_token = ?", token).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByTenantID(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	offset := (page - 1) * limit

	err := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("tenant_id = ?", tenantID).
		Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = r.db.WithContext(ctx).
		Preload("Roles").
		Where("tenant_id = ?", tenantID).
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&users).Error
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *userRepository) Update(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.User{}, "id = ?", id).Error
}

func (r *userRepository) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	return r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"password_hash":       passwordHash,
			"password_changed_at": gorm.Expr("NOW()"),
		}).Error
}

func (r *userRepository) VerifyEmail(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_email_verified": true,
			"email_verified_at": gorm.Expr("NOW()"),
		}).Error
}

func (r *userRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", id).
		Update("last_login_at", gorm.Expr("NOW()")).Error
}

func (r *userRepository) AssignRoles(ctx context.Context, userID uuid.UUID, roleIDs []uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Remove existing roles
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserRole{}).Error; err != nil {
			return err
		}

		// Add new roles
		for _, roleID := range roleIDs {
			userRole := models.UserRole{
				UserID: userID,
				RoleID: roleID,
			}
			if err := tx.Create(&userRole).Error; err != nil {
				return err
			}
		}

		return nil
	})
}
