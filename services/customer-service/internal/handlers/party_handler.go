package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/customer-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/customer-service/internal/services"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
)

// PartyHandler handles party-related endpoints
type PartyHandler struct {
	partyService services.PartyService
}

// NewPartyHandler creates a new party handler
func NewPartyHandler(partyService services.PartyService) *PartyHandler {
	return &PartyHandler{partyService: partyService}
}

// CreateParty handles party creation
func (h *PartyHandler) CreateParty(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	userID, err := h.getUserIDFromContext(c)
	if err != nil {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	var req services.CreatePartyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	party, err := h.partyService.CreateParty(c.Request.Context(), tenantID, userID, req)
	if err != nil {
		switch err {
		case services.ErrPartyExists:
			response.Conflict(c, "Party with this GSTIN already exists")
		case services.ErrInvalidGSTIN:
			response.BadRequest(c, "Invalid GSTIN format", nil)
		case services.ErrInvalidPAN:
			response.BadRequest(c, "Invalid PAN format", nil)
		default:
			response.InternalError(c, "Failed to create party")
		}
		return
	}

	response.Created(c, party)
}

// GetParty handles getting a single party
func (h *PartyHandler) GetParty(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	partyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid party ID", nil)
		return
	}

	party, err := h.partyService.GetParty(c.Request.Context(), partyID, tenantID)
	if err != nil {
		if err == services.ErrPartyNotFound {
			response.NotFound(c, "Party not found")
			return
		}
		response.InternalError(c, "Failed to get party")
		return
	}

	response.Success(c, party)
}

// UpdateParty handles party updates
func (h *PartyHandler) UpdateParty(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	partyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid party ID", nil)
		return
	}

	var req services.UpdatePartyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	party, err := h.partyService.UpdateParty(c.Request.Context(), partyID, tenantID, req)
	if err != nil {
		switch err {
		case services.ErrPartyNotFound:
			response.NotFound(c, "Party not found")
		case services.ErrInvalidGSTIN:
			response.BadRequest(c, "Invalid GSTIN format", nil)
		case services.ErrInvalidPAN:
			response.BadRequest(c, "Invalid PAN format", nil)
		default:
			response.InternalError(c, "Failed to update party")
		}
		return
	}

	response.Success(c, party)
}

// DeleteParty handles party deletion
func (h *PartyHandler) DeleteParty(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	partyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid party ID", nil)
		return
	}

	if err := h.partyService.DeleteParty(c.Request.Context(), partyID, tenantID); err != nil {
		if err == services.ErrPartyNotFound {
			response.NotFound(c, "Party not found")
			return
		}
		response.InternalError(c, "Failed to delete party")
		return
	}

	response.NoContent(c)
}

// ListParties handles listing parties
func (h *PartyHandler) ListParties(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	filter := repository.PartyFilter{
		PartyType: c.Query("type"),
		Search:    c.Query("search"),
		SortBy:    c.Query("sort_by"),
		SortOrder: c.Query("sort_order"),
	}

	if page, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil {
		filter.Page = page
	}
	if perPage, err := strconv.Atoi(c.DefaultQuery("per_page", "20")); err == nil {
		filter.PerPage = perPage
	}
	if hasBalance := c.Query("has_balance"); hasBalance == "true" {
		filter.HasBalance = true
	}
	if isActive := c.Query("is_active"); isActive != "" {
		active := isActive == "true"
		filter.IsActive = &active
	}

	parties, total, err := h.partyService.ListParties(c.Request.Context(), tenantID, filter)
	if err != nil {
		response.InternalError(c, "Failed to list parties")
		return
	}

	response.Paginated(c, parties, filter.Page, filter.PerPage, total)
}

// GetPartyLedger handles getting party ledger
func (h *PartyHandler) GetPartyLedger(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	partyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid party ID", nil)
		return
	}

	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")

	ledger, err := h.partyService.GetPartyLedger(c.Request.Context(), partyID, tenantID, fromDate, toDate)
	if err != nil {
		if err == services.ErrPartyNotFound {
			response.NotFound(c, "Party not found")
			return
		}
		response.InternalError(c, "Failed to get party ledger")
		return
	}

	response.Success(c, ledger)
}

// ValidateGSTIN handles GSTIN validation
func (h *PartyHandler) ValidateGSTIN(c *gin.Context) {
	gstin := c.Param("gstin")
	if gstin == "" {
		response.BadRequest(c, "GSTIN is required", nil)
		return
	}

	valid, err := h.partyService.ValidateGSTIN(gstin)
	if err != nil {
		response.InternalError(c, "Failed to validate GSTIN")
		return
	}

	response.Success(c, gin.H{
		"gstin":    gstin,
		"is_valid": valid,
	})
}

// AddContact handles adding a contact to a party
func (h *PartyHandler) AddContact(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	partyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid party ID", nil)
		return
	}

	var req services.CreateContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	contact, err := h.partyService.AddContact(c.Request.Context(), partyID, tenantID, req)
	if err != nil {
		if err == services.ErrPartyNotFound {
			response.NotFound(c, "Party not found")
			return
		}
		response.InternalError(c, "Failed to add contact")
		return
	}

	response.Created(c, contact)
}

// AddBankDetail handles adding bank details to a party
func (h *PartyHandler) AddBankDetail(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	partyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid party ID", nil)
		return
	}

	var req services.CreateBankDetailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	bankDetail, err := h.partyService.AddBankDetail(c.Request.Context(), partyID, tenantID, req)
	if err != nil {
		if err == services.ErrPartyNotFound {
			response.NotFound(c, "Party not found")
			return
		}
		response.InternalError(c, "Failed to add bank detail")
		return
	}

	response.Created(c, bankDetail)
}

// Helper methods

func (h *PartyHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, services.ErrPartyNotFound
	}
	return uuid.Parse(userIDStr.(string))
}

func (h *PartyHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, services.ErrPartyNotFound
	}
	return uuid.Parse(tenantIDStr.(string))
}
