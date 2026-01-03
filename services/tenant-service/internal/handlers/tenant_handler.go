package handlers

import (
	"net/http"

	"github.com/bookkeep/go-shared/response"
	"github.com/bookkeep/tenant-service/internal/models"
	"github.com/bookkeep/tenant-service/internal/repository"
	"github.com/bookkeep/tenant-service/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TenantHandler struct {
	tenantService services.TenantService
	roleRepo      repository.RoleRepository
}

func NewTenantHandler(tenantService services.TenantService, roleRepo repository.RoleRepository) *TenantHandler {
	return &TenantHandler{
		tenantService: tenantService,
		roleRepo:      roleRepo,
	}
}

// CreateTenant creates a new tenant (business)
// @Summary Create a new tenant
// @Tags Tenants
// @Accept json
// @Produce json
// @Param body body services.CreateTenantRequest true "Tenant details"
// @Success 201 {object} models.Tenant
// @Router /tenants [post]
func (h *TenantHandler) CreateTenant(c *gin.Context) {
	userID, _ := c.Get("user_id")
	userEmail, _ := c.Get("user_email")
	userPhone, _ := c.Get("user_phone")
	userFirstName, _ := c.Get("user_first_name")
	userLastName, _ := c.Get("user_last_name")

	var req services.CreateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	ownerInfo := services.OwnerInfo{
		Email:     userEmail.(string),
		Phone:     userPhone.(string),
		FirstName: userFirstName.(string),
		LastName:  userLastName.(string),
	}

	tenant, err := h.tenantService.CreateTenant(c.Request.Context(), req, userID.(uuid.UUID), ownerInfo)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Created(c, tenant)
}

// GetTenant retrieves a tenant by ID
// @Summary Get tenant details
// @Tags Tenants
// @Produce json
// @Param id path string true "Tenant ID"
// @Success 200 {object} models.Tenant
// @Router /tenants/{id} [get]
func (h *TenantHandler) GetTenant(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	tenant, err := h.tenantService.GetTenant(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		if err == repository.ErrTenantNotFound {
			response.NotFound(c, "Tenant not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, tenant)
}

// UpdateTenant updates a tenant
// @Summary Update tenant details
// @Tags Tenants
// @Accept json
// @Produce json
// @Param id path string true "Tenant ID"
// @Param body body services.UpdateTenantRequest true "Updated tenant details"
// @Success 200 {object} models.Tenant
// @Router /tenants/{id} [put]
func (h *TenantHandler) UpdateTenant(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	var req services.UpdateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	tenant, err := h.tenantService.UpdateTenant(c.Request.Context(), tenantID.(uuid.UUID), req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.OK(c, tenant)
}

// DeleteTenant soft-deletes a tenant
// @Summary Delete a tenant
// @Tags Tenants
// @Param id path string true "Tenant ID"
// @Success 204
// @Router /tenants/{id} [delete]
func (h *TenantHandler) DeleteTenant(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	if err := h.tenantService.DeleteTenant(c.Request.Context(), tenantID.(uuid.UUID)); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}

// GetMyTenants retrieves all tenants for the current user
// @Summary Get user's tenants
// @Tags Tenants
// @Produce json
// @Success 200 {array} models.TenantMember
// @Router /tenants/me [get]
func (h *TenantHandler) GetMyTenants(c *gin.Context) {
	userID, _ := c.Get("user_id")

	tenants, err := h.tenantService.GetUserTenants(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, tenants)
}

// Team Management

// ListMembers lists all members of a tenant
// @Summary List tenant members
// @Tags Team
// @Produce json
// @Param id path string true "Tenant ID"
// @Success 200 {array} models.TenantMember
// @Router /tenants/{id}/members [get]
func (h *TenantHandler) ListMembers(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	members, err := h.tenantService.ListMembers(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, members)
}

// InviteMember invites a new member to the tenant
// @Summary Invite a team member
// @Tags Team
// @Accept json
// @Produce json
// @Param id path string true "Tenant ID"
// @Param body body services.InviteMemberRequest true "Invitation details"
// @Success 201 {object} models.TenantInvitation
// @Router /tenants/{id}/invitations [post]
func (h *TenantHandler) InviteMember(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	userID, _ := c.Get("user_id")

	var req services.InviteMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	invitation, err := h.tenantService.InviteMember(c.Request.Context(), tenantID.(uuid.UUID), userID.(uuid.UUID), req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Created(c, invitation)
}

// ListInvitations lists pending invitations
// @Summary List pending invitations
// @Tags Team
// @Produce json
// @Param id path string true "Tenant ID"
// @Success 200 {array} models.TenantInvitation
// @Router /tenants/{id}/invitations [get]
func (h *TenantHandler) ListInvitations(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	invitations, err := h.tenantService.ListInvitations(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, invitations)
}

// AcceptInvitation accepts a pending invitation
// @Summary Accept an invitation
// @Tags Team
// @Param token path string true "Invitation token"
// @Success 200 {object} models.TenantMember
// @Router /invitations/{token}/accept [post]
func (h *TenantHandler) AcceptInvitation(c *gin.Context) {
	token := c.Param("token")
	userID, _ := c.Get("user_id")
	userEmail, _ := c.Get("user_email")
	userPhone, _ := c.Get("user_phone")
	userFirstName, _ := c.Get("user_first_name")
	userLastName, _ := c.Get("user_last_name")

	memberInfo := services.MemberInfo{
		Email:     userEmail.(string),
		Phone:     userPhone.(string),
		FirstName: userFirstName.(string),
		LastName:  userLastName.(string),
	}

	member, err := h.tenantService.AcceptInvitation(c.Request.Context(), token, userID.(uuid.UUID), memberInfo)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.OK(c, member)
}

// CancelInvitation cancels a pending invitation
// @Summary Cancel an invitation
// @Tags Team
// @Param id path string true "Tenant ID"
// @Param invitation_id path string true "Invitation ID"
// @Success 204
// @Router /tenants/{id}/invitations/{invitation_id} [delete]
func (h *TenantHandler) CancelInvitation(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	invitationIDStr := c.Param("invitation_id")

	invitationID, err := uuid.Parse(invitationIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid invitation ID")
		return
	}

	if err := h.tenantService.CancelInvitation(c.Request.Context(), tenantID.(uuid.UUID), invitationID); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}

// UpdateMember updates a member's role or status
// @Summary Update a team member
// @Tags Team
// @Accept json
// @Produce json
// @Param id path string true "Tenant ID"
// @Param member_id path string true "Member ID"
// @Param body body services.UpdateMemberRequest true "Update details"
// @Success 200 {object} models.TenantMember
// @Router /tenants/{id}/members/{member_id} [put]
func (h *TenantHandler) UpdateMember(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	memberIDStr := c.Param("member_id")

	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid member ID")
		return
	}

	var req services.UpdateMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	member, err := h.tenantService.UpdateMember(c.Request.Context(), tenantID.(uuid.UUID), memberID, req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.OK(c, member)
}

// RemoveMember removes a member from the tenant
// @Summary Remove a team member
// @Tags Team
// @Param id path string true "Tenant ID"
// @Param member_id path string true "Member ID"
// @Success 204
// @Router /tenants/{id}/members/{member_id} [delete]
func (h *TenantHandler) RemoveMember(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	userID, _ := c.Get("user_id")
	memberIDStr := c.Param("member_id")

	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid member ID")
		return
	}

	if err := h.tenantService.RemoveMember(c.Request.Context(), tenantID.(uuid.UUID), memberID, userID.(uuid.UUID)); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}

// Roles

// ListRoles lists all available roles
// @Summary List available roles
// @Tags Roles
// @Produce json
// @Param id path string true "Tenant ID"
// @Success 200 {array} models.Role
// @Router /tenants/{id}/roles [get]
func (h *TenantHandler) ListRoles(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	roles, err := h.roleRepo.List(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, roles)
}

// GetAllPermissions returns all available permissions in the system
// @Summary Get all available permissions
// @Tags Roles
// @Produce json
// @Success 200 {array} string
// @Router /permissions [get]
func (h *TenantHandler) GetAllPermissions(c *gin.Context) {
	response.OK(c, models.AllPermissions())
}

// GetMyPermissions returns the current user's permissions for the tenant
// @Summary Get my permissions
// @Tags Roles
// @Produce json
// @Success 200 {array} string
// @Router /tenants/{id}/permissions/me [get]
func (h *TenantHandler) GetMyPermissions(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	userID, _ := c.Get("user_id")

	permissions, err := h.tenantService.GetUserPermissions(c.Request.Context(), tenantID.(uuid.UUID), userID.(uuid.UUID))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.OK(c, permissions)
}
