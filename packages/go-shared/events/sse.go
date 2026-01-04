package events

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SSEMessage represents a Server-Sent Event message
type SSEMessage struct {
	ID    string          `json:"id,omitempty"`
	Event string          `json:"event,omitempty"`
	Data  json.RawMessage `json:"data"`
	Retry int             `json:"retry,omitempty"`
}

// Client represents a connected SSE client
type Client struct {
	ID       string
	TenantID string
	UserID   string
	Channel  chan SSEMessage
	Done     chan struct{}
}

// Hub manages SSE client connections
type Hub struct {
	clients    map[string]*Client
	tenants    map[string]map[string]*Client // tenantID -> clientID -> client
	register   chan *Client
	unregister chan *Client
	broadcast  chan BroadcastMessage
	mutex      sync.RWMutex
}

// BroadcastMessage represents a message to broadcast
type BroadcastMessage struct {
	TenantID string
	UserID   string // Optional: if set, only send to this user
	Message  SSEMessage
}

// NewHub creates a new SSE hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		tenants:    make(map[string]map[string]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan BroadcastMessage, 256),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			h.mutex.Lock()
			for _, client := range h.clients {
				close(client.Done)
			}
			h.clients = make(map[string]*Client)
			h.tenants = make(map[string]map[string]*Client)
			h.mutex.Unlock()
			return

		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client.ID] = client
			if _, ok := h.tenants[client.TenantID]; !ok {
				h.tenants[client.TenantID] = make(map[string]*Client)
			}
			h.tenants[client.TenantID][client.ID] = client
			h.mutex.Unlock()
			log.Printf("SSE client connected: %s (tenant: %s, user: %s)", client.ID, client.TenantID, client.UserID)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client.ID]; ok {
				delete(h.clients, client.ID)
				if tenantClients, ok := h.tenants[client.TenantID]; ok {
					delete(tenantClients, client.ID)
					if len(tenantClients) == 0 {
						delete(h.tenants, client.TenantID)
					}
				}
				close(client.Channel)
			}
			h.mutex.Unlock()
			log.Printf("SSE client disconnected: %s", client.ID)

		case msg := <-h.broadcast:
			h.mutex.RLock()
			if msg.TenantID != "" {
				// Send to specific tenant
				if tenantClients, ok := h.tenants[msg.TenantID]; ok {
					for _, client := range tenantClients {
						// If UserID is specified, only send to that user
						if msg.UserID != "" && client.UserID != msg.UserID {
							continue
						}
						select {
						case client.Channel <- msg.Message:
						default:
							// Channel full, skip
						}
					}
				}
			} else {
				// Broadcast to all clients
				for _, client := range h.clients {
					select {
					case client.Channel <- msg.Message:
					default:
						// Channel full, skip
					}
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// Register registers a new client
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister unregisters a client
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// Broadcast sends a message to all clients of a tenant
func (h *Hub) Broadcast(tenantID string, message SSEMessage) {
	h.broadcast <- BroadcastMessage{
		TenantID: tenantID,
		Message:  message,
	}
}

// BroadcastToUser sends a message to a specific user
func (h *Hub) BroadcastToUser(tenantID, userID string, message SSEMessage) {
	h.broadcast <- BroadcastMessage{
		TenantID: tenantID,
		UserID:   userID,
		Message:  message,
	}
}

// BroadcastAll sends a message to all connected clients
func (h *Hub) BroadcastAll(message SSEMessage) {
	h.broadcast <- BroadcastMessage{
		Message: message,
	}
}

// GetClientCount returns the number of connected clients
func (h *Hub) GetClientCount() int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	return len(h.clients)
}

// GetTenantClientCount returns the number of connected clients for a tenant
func (h *Hub) GetTenantClientCount(tenantID string) int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	if tenantClients, ok := h.tenants[tenantID]; ok {
		return len(tenantClients)
	}
	return 0
}

// SSEHandler returns a Gin handler for SSE connections
func SSEHandler(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get tenant and user from context (set by auth middleware)
		tenantID := c.GetString("tenant_id")
		userID := c.GetString("user_id")

		if tenantID == "" {
			c.JSON(401, gin.H{"error": "tenant not found"})
			return
		}

		// Create client
		client := &Client{
			ID:       uuid.New().String(),
			TenantID: tenantID,
			UserID:   userID,
			Channel:  make(chan SSEMessage, 64),
			Done:     make(chan struct{}),
		}

		// Register client
		hub.Register(client)

		// Set headers for SSE
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("X-Accel-Buffering", "no") // Disable nginx buffering
		c.Header("Access-Control-Allow-Origin", "*")

		// Flush headers
		c.Writer.Flush()

		// Send initial connection message
		sendSSEMessage(c.Writer, SSEMessage{
			Event: "connected",
			Data:  json.RawMessage(fmt.Sprintf(`{"client_id":"%s"}`, client.ID)),
		})
		c.Writer.Flush()

		// Keep-alive ticker
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		// Stream events
		c.Stream(func(w io.Writer) bool {
			select {
			case <-c.Request.Context().Done():
				hub.Unregister(client)
				return false

			case <-client.Done:
				return false

			case msg := <-client.Channel:
				sendSSEMessage(w, msg)
				return true

			case <-ticker.C:
				// Send keep-alive comment
				fmt.Fprintf(w, ": ping\n\n")
				c.Writer.Flush()
				return true
			}
		})
	}
}

// sendSSEMessage writes an SSE message to the writer
func sendSSEMessage(w io.Writer, msg SSEMessage) {
	if msg.ID != "" {
		fmt.Fprintf(w, "id: %s\n", msg.ID)
	}
	if msg.Event != "" {
		fmt.Fprintf(w, "event: %s\n", msg.Event)
	}
	if msg.Retry > 0 {
		fmt.Fprintf(w, "retry: %d\n", msg.Retry)
	}
	fmt.Fprintf(w, "data: %s\n\n", msg.Data)
}

// Event types
const (
	EventInvoiceCreated     = "invoice.created"
	EventInvoiceUpdated     = "invoice.updated"
	EventInvoicePaid        = "invoice.paid"
	EventInvoiceOverdue     = "invoice.overdue"
	EventBillCreated        = "bill.created"
	EventBillUpdated        = "bill.updated"
	EventBillPaid           = "bill.paid"
	EventPaymentReceived    = "payment.received"
	EventTransactionCreated = "transaction.created"
	EventBankReconciled     = "bank.reconciled"
	EventCustomerCreated    = "customer.created"
	EventCustomerUpdated    = "customer.updated"
	EventVendorCreated      = "vendor.created"
	EventVendorUpdated      = "vendor.updated"
	EventReportGenerated    = "report.generated"
	EventNotification       = "notification"
	EventDashboardUpdate    = "dashboard.update"
)

// NewMessage creates a new SSE message with data
func NewMessage(event string, data interface{}) SSEMessage {
	jsonData, _ := json.Marshal(data)
	return SSEMessage{
		ID:    fmt.Sprintf("%d", time.Now().UnixNano()),
		Event: event,
		Data:  jsonData,
	}
}

// NotificationData represents notification payload
type NotificationData struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	Type    string `json:"type"` // info, success, warning, error
	Action  string `json:"action,omitempty"`
	Link    string `json:"link,omitempty"`
}

// SendNotification sends a notification to a user
func (h *Hub) SendNotification(tenantID, userID string, notification NotificationData) {
	h.BroadcastToUser(tenantID, userID, NewMessage(EventNotification, notification))
}

// SendNotificationToTenant sends a notification to all users in a tenant
func (h *Hub) SendNotificationToTenant(tenantID string, notification NotificationData) {
	h.Broadcast(tenantID, NewMessage(EventNotification, notification))
}
