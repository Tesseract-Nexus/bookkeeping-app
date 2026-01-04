package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	gonats "github.com/tesseract-nexus/bookkeeping-app/go-shared/nats"
	goredis "github.com/tesseract-nexus/bookkeeping-app/go-shared/redis"
)

// EventType represents the type of domain event
type EventType string

// Domain event types
const (
	// Invoice events
	EventInvoiceCreated EventType = "invoice.created"
	EventInvoiceUpdated EventType = "invoice.updated"
	EventInvoiceSent    EventType = "invoice.sent"
	EventInvoicePaid    EventType = "invoice.paid"
	EventInvoiceOverdue EventType = "invoice.overdue"

	// Bill events
	EventBillCreated  EventType = "bill.created"
	EventBillUpdated  EventType = "bill.updated"
	EventBillApproved EventType = "bill.approved"
	EventBillPaid     EventType = "bill.paid"
	EventBillOverdue  EventType = "bill.overdue"

	// Transaction events
	EventTransactionCreated EventType = "transaction.created"
	EventTransactionVoided  EventType = "transaction.voided"
	EventPaymentReceived    EventType = "payment.received"
	EventPaymentMade        EventType = "payment.made"

	// Customer events
	EventCustomerCreated EventType = "customer.created"
	EventCustomerUpdated EventType = "customer.updated"

	// Vendor events
	EventVendorCreated EventType = "vendor.created"
	EventVendorUpdated EventType = "vendor.updated"

	// Bank events
	EventBankReconciled  EventType = "bank.reconciled"
	EventBankImported    EventType = "bank.imported"

	// Dashboard events
	EventDashboardUpdate EventType = "dashboard.update"

	// Notification events
	EventNotification EventType = "notification"
)

// DomainEvent represents a domain event
type DomainEvent struct {
	ID        string          `json:"id"`
	Type      EventType       `json:"type"`
	Source    string          `json:"source"`
	TenantID  string          `json:"tenant_id"`
	UserID    string          `json:"user_id,omitempty"`
	EntityID  string          `json:"entity_id,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
	Data      json.RawMessage `json:"data"`
}

// Publisher handles event publishing to NATS and Redis
type Publisher struct {
	nats   *gonats.Client
	redis  *goredis.Client
	source string
}

// PublisherConfig holds publisher configuration
type PublisherConfig struct {
	NATSClient  *gonats.Client
	RedisClient *goredis.Client
	ServiceName string
}

// NewPublisher creates a new event publisher
func NewPublisher(config PublisherConfig) *Publisher {
	return &Publisher{
		nats:   config.NATSClient,
		redis:  config.RedisClient,
		source: config.ServiceName,
	}
}

// Publish publishes a domain event
func (p *Publisher) Publish(ctx context.Context, eventType EventType, tenantID, userID, entityID string, data interface{}) error {
	event := p.buildEvent(eventType, tenantID, userID, entityID, data)

	// Publish to NATS if available
	if p.nats != nil && p.nats.IsConnected() {
		subject := fmt.Sprintf("events.%s", eventType)
		if _, err := p.nats.PublishToStream(ctx, subject, event); err != nil {
			log.Printf("Failed to publish to NATS: %v", err)
		}
	}

	// Publish to Redis Pub/Sub for real-time updates
	if p.redis != nil {
		channel := fmt.Sprintf("tenant:%s:events", tenantID)
		if err := p.redis.Publish(ctx, channel, event); err != nil {
			log.Printf("Failed to publish to Redis: %v", err)
		}
	}

	return nil
}

// PublishNotification publishes a notification event
func (p *Publisher) PublishNotification(ctx context.Context, tenantID, userID string, notification NotificationPayload) error {
	return p.Publish(ctx, EventNotification, tenantID, userID, "", notification)
}

// PublishDashboardUpdate publishes a dashboard update event
func (p *Publisher) PublishDashboardUpdate(ctx context.Context, tenantID string, data interface{}) error {
	return p.Publish(ctx, EventDashboardUpdate, tenantID, "", "", data)
}

// buildEvent constructs a domain event
func (p *Publisher) buildEvent(eventType EventType, tenantID, userID, entityID string, data interface{}) DomainEvent {
	dataBytes, _ := json.Marshal(data)
	return DomainEvent{
		ID:        uuid.New().String(),
		Type:      eventType,
		Source:    p.source,
		TenantID:  tenantID,
		UserID:    userID,
		EntityID:  entityID,
		Timestamp: time.Now().UTC(),
		Data:      dataBytes,
	}
}

// NotificationPayload represents a notification
type NotificationPayload struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	Type    string `json:"type"` // info, success, warning, error
	Action  string `json:"action,omitempty"`
	Link    string `json:"link,omitempty"`
}

// InvoiceEventPayload represents invoice event data
type InvoiceEventPayload struct {
	InvoiceID     string  `json:"invoice_id"`
	InvoiceNumber string  `json:"invoice_number"`
	CustomerID    string  `json:"customer_id"`
	CustomerName  string  `json:"customer_name"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
}

// BillEventPayload represents bill event data
type BillEventPayload struct {
	BillID     string  `json:"bill_id"`
	BillNumber string  `json:"bill_number"`
	VendorID   string  `json:"vendor_id"`
	VendorName string  `json:"vendor_name"`
	Amount     float64 `json:"amount"`
	Status     string  `json:"status"`
}

// TransactionEventPayload represents transaction event data
type TransactionEventPayload struct {
	TransactionID     string  `json:"transaction_id"`
	TransactionNumber string  `json:"transaction_number"`
	TransactionType   string  `json:"transaction_type"`
	Amount            float64 `json:"amount"`
	Description       string  `json:"description"`
}

// PaymentEventPayload represents payment event data
type PaymentEventPayload struct {
	PaymentID     string  `json:"payment_id"`
	InvoiceID     string  `json:"invoice_id,omitempty"`
	BillID        string  `json:"bill_id,omitempty"`
	Amount        float64 `json:"amount"`
	PaymentMethod string  `json:"payment_method"`
}

// CustomerEventPayload represents customer event data
type CustomerEventPayload struct {
	CustomerID   string `json:"customer_id"`
	CustomerName string `json:"customer_name"`
	Email        string `json:"email,omitempty"`
	Phone        string `json:"phone,omitempty"`
}

// VendorEventPayload represents vendor event data
type VendorEventPayload struct {
	VendorID   string `json:"vendor_id"`
	VendorName string `json:"vendor_name"`
	Email      string `json:"email,omitempty"`
	Phone      string `json:"phone,omitempty"`
}

// BankEventPayload represents bank event data
type BankEventPayload struct {
	BankAccountID   string `json:"bank_account_id"`
	BankAccountName string `json:"bank_account_name"`
	ReconcileCount  int    `json:"reconcile_count,omitempty"`
	ImportCount     int    `json:"import_count,omitempty"`
}

// DashboardUpdatePayload represents dashboard update data
type DashboardUpdatePayload struct {
	Type      string `json:"type"` // metrics_refresh, invoice_update, etc.
	Timestamp string `json:"timestamp"`
}
