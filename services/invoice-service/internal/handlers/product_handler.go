package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tesseract-nexus/bookkeeping-app/go-shared/response"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/models"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/repository"
	"github.com/tesseract-nexus/bookkeeping-app/invoice-service/internal/services"
)

// ProductHandler handles product endpoints
type ProductHandler struct {
	productService services.ProductService
}

// NewProductHandler creates a new product handler
func NewProductHandler(productService services.ProductService) *ProductHandler {
	return &ProductHandler{productService: productService}
}

// List lists all products for a tenant
func (h *ProductHandler) List(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	// Parse filters
	filters := repository.ProductFilters{}

	if productType := c.Query("type"); productType != "" {
		filters.Type = models.ProductType(productType)
	}
	if category := c.Query("category"); category != "" {
		filters.Category = category
	}
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		isActive := isActiveStr == "true"
		filters.IsActive = &isActive
	}
	if search := c.Query("search"); search != "" {
		filters.Search = search
	}
	if pageStr := c.Query("page"); pageStr != "" {
		page, _ := strconv.Atoi(pageStr)
		filters.Page = page
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		limit, _ := strconv.Atoi(limitStr)
		filters.Limit = limit
	}

	products, total, err := h.productService.List(c.Request.Context(), tenantID, filters)
	if err != nil {
		response.InternalError(c, "Failed to list products")
		return
	}

	if filters.Page <= 0 {
		filters.Page = 1
	}
	if filters.Limit <= 0 {
		filters.Limit = 20
	}

	response.Paginated(c, products, filters.Page, filters.Limit, total)
}

// Create creates a new product
func (h *ProductHandler) Create(c *gin.Context) {
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

	var req services.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	req.TenantID = tenantID
	req.CreatedBy = userID

	product, err := h.productService.Create(c.Request.Context(), req)
	if err != nil {
		if err == services.ErrProductSKUExists {
			response.Conflict(c, "Product with this SKU already exists")
			return
		}
		if err == services.ErrInvalidProductType {
			response.BadRequest(c, "Invalid product type", nil)
			return
		}
		response.InternalError(c, "Failed to create product")
		return
	}

	response.Created(c, product)
}

// Get gets a product by ID
func (h *ProductHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid product ID", nil)
		return
	}

	product, err := h.productService.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == services.ErrProductNotFound {
			response.NotFound(c, "Product not found")
			return
		}
		response.InternalError(c, "Failed to get product")
		return
	}

	response.Success(c, product)
}

// Update updates a product
func (h *ProductHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid product ID", nil)
		return
	}

	var req services.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	product, err := h.productService.Update(c.Request.Context(), id, req)
	if err != nil {
		if err == services.ErrProductNotFound {
			response.NotFound(c, "Product not found")
			return
		}
		if err == services.ErrProductSKUExists {
			response.Conflict(c, "Product with this SKU already exists")
			return
		}
		response.InternalError(c, "Failed to update product")
		return
	}

	response.Success(c, product)
}

// Delete deletes a product
func (h *ProductHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid product ID", nil)
		return
	}

	if err := h.productService.Delete(c.Request.Context(), id); err != nil {
		if err == services.ErrProductNotFound {
			response.NotFound(c, "Product not found")
			return
		}
		response.InternalError(c, "Failed to delete product")
		return
	}

	response.NoContent(c)
}

// GetCategories returns all product categories
func (h *ProductHandler) GetCategories(c *gin.Context) {
	tenantID, err := h.getTenantIDFromContext(c)
	if err != nil {
		response.BadRequest(c, "Tenant ID required", nil)
		return
	}

	categories, err := h.productService.GetCategories(c.Request.Context(), tenantID)
	if err != nil {
		response.InternalError(c, "Failed to get categories")
		return
	}

	response.Success(c, gin.H{"categories": categories})
}

// GetUnitsOfMeasure returns standard units of measure
func (h *ProductHandler) GetUnitsOfMeasure(c *gin.Context) {
	response.Success(c, gin.H{"units": models.StandardUnitsOfMeasure})
}

// Import imports products from a list
func (h *ProductHandler) Import(c *gin.Context) {
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

	var req struct {
		Products []services.CreateProductRequest `json:"products" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	successCount, errs := h.productService.ImportProducts(c.Request.Context(), tenantID, userID, req.Products)

	errorMessages := make([]string, len(errs))
	for i, err := range errs {
		errorMessages[i] = err.Error()
	}

	response.Success(c, gin.H{
		"imported":     successCount,
		"failed":       len(errs),
		"errors":       errorMessages,
	})
}

// UpdateStock updates product stock
func (h *ProductHandler) UpdateStock(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid product ID", nil)
		return
	}

	var req struct {
		Quantity float64 `json:"quantity" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body", nil)
		return
	}

	if err := h.productService.UpdateStock(c.Request.Context(), id, req.Quantity); err != nil {
		response.InternalError(c, "Failed to update stock")
		return
	}

	response.Success(c, gin.H{"message": "Stock updated successfully"})
}

// Helper methods

func (h *ProductHandler) getTenantIDFromContext(c *gin.Context) (uuid.UUID, error) {
	tenantIDStr, exists := c.Get("tenant_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(tenantIDStr.(string))
}

func (h *ProductHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, http.ErrNoLocation
	}
	return uuid.Parse(userIDStr.(string))
}
