package nats

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

// Client wraps NATS connection with JetStream support
type Client struct {
	conn *nats.Conn
	js   jetstream.JetStream
}

// Config holds NATS configuration
type Config struct {
	URL            string
	Name           string
	MaxReconnects  int
	ReconnectWait  time.Duration
	RequestTimeout time.Duration
}

// Event represents a domain event
type Event struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Source    string          `json:"source"`
	TenantID  string          `json:"tenant_id"`
	UserID    string          `json:"user_id,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
	Data      json.RawMessage `json:"data"`
}

// New creates a new NATS client with JetStream
func New(config Config) (*Client, error) {
	if config.MaxReconnects == 0 {
		config.MaxReconnects = 10
	}
	if config.ReconnectWait == 0 {
		config.ReconnectWait = 2 * time.Second
	}
	if config.RequestTimeout == 0 {
		config.RequestTimeout = 5 * time.Second
	}

	opts := []nats.Option{
		nats.Name(config.Name),
		nats.MaxReconnects(config.MaxReconnects),
		nats.ReconnectWait(config.ReconnectWait),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			if err != nil {
				log.Printf("NATS disconnected: %v", err)
			}
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			log.Printf("NATS reconnected to %s", nc.ConnectedUrl())
		}),
		nats.ErrorHandler(func(nc *nats.Conn, sub *nats.Subscription, err error) {
			log.Printf("NATS error: %v", err)
		}),
	}

	conn, err := nats.Connect(config.URL, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	js, err := jetstream.New(conn)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to create JetStream context: %w", err)
	}

	log.Printf("Successfully connected to NATS at %s", config.URL)
	return &Client{conn: conn, js: js}, nil
}

// Close closes the NATS connection
func (c *Client) Close() {
	if c.conn != nil {
		c.conn.Drain()
		c.conn.Close()
	}
}

// IsConnected checks if NATS is connected
func (c *Client) IsConnected() bool {
	return c.conn != nil && c.conn.IsConnected()
}

// Publish publishes a message to a subject
func (c *Client) Publish(ctx context.Context, subject string, data interface{}) error {
	payload, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %w", err)
	}
	return c.conn.Publish(subject, payload)
}

// PublishEvent publishes a domain event
func (c *Client) PublishEvent(ctx context.Context, event Event) error {
	subject := fmt.Sprintf("events.%s", event.Type)
	return c.Publish(ctx, subject, event)
}

// Request performs a request-reply operation
func (c *Client) Request(ctx context.Context, subject string, data interface{}, timeout time.Duration) (*nats.Msg, error) {
	payload, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal data: %w", err)
	}
	return c.conn.Request(subject, payload, timeout)
}

// Subscribe subscribes to a subject
func (c *Client) Subscribe(subject string, handler func(*nats.Msg)) (*nats.Subscription, error) {
	return c.conn.Subscribe(subject, handler)
}

// QueueSubscribe subscribes to a subject with a queue group
func (c *Client) QueueSubscribe(subject, queue string, handler func(*nats.Msg)) (*nats.Subscription, error) {
	return c.conn.QueueSubscribe(subject, queue, handler)
}

// CreateStream creates a JetStream stream
func (c *Client) CreateStream(ctx context.Context, config jetstream.StreamConfig) (jetstream.Stream, error) {
	return c.js.CreateOrUpdateStream(ctx, config)
}

// GetStream gets an existing stream
func (c *Client) GetStream(ctx context.Context, name string) (jetstream.Stream, error) {
	return c.js.Stream(ctx, name)
}

// DeleteStream deletes a stream
func (c *Client) DeleteStream(ctx context.Context, name string) error {
	return c.js.DeleteStream(ctx, name)
}

// PublishToStream publishes a message to a JetStream stream
func (c *Client) PublishToStream(ctx context.Context, subject string, data interface{}) (*jetstream.PubAck, error) {
	payload, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal data: %w", err)
	}
	return c.js.Publish(ctx, subject, payload)
}

// CreateConsumer creates a durable consumer
func (c *Client) CreateConsumer(ctx context.Context, stream string, config jetstream.ConsumerConfig) (jetstream.Consumer, error) {
	s, err := c.js.Stream(ctx, stream)
	if err != nil {
		return nil, err
	}
	return s.CreateOrUpdateConsumer(ctx, config)
}

// ConsumeMessages consumes messages from a consumer
func (c *Client) ConsumeMessages(ctx context.Context, consumer jetstream.Consumer, handler func(jetstream.Msg)) (jetstream.ConsumeContext, error) {
	return consumer.Consume(handler)
}

// GetJetStream returns the JetStream context
func (c *Client) GetJetStream() jetstream.JetStream {
	return c.js
}

// GetConn returns the underlying NATS connection
func (c *Client) GetConn() *nats.Conn {
	return c.conn
}

// Standard stream names
const (
	StreamEvents        = "EVENTS"
	StreamInvoices      = "INVOICES"
	StreamTransactions  = "TRANSACTIONS"
	StreamNotifications = "NOTIFICATIONS"
	StreamAudit         = "AUDIT"
)

// Standard subjects
const (
	SubjectInvoiceCreated     = "invoice.created"
	SubjectInvoicePaid        = "invoice.paid"
	SubjectInvoiceOverdue     = "invoice.overdue"
	SubjectTransactionCreated = "transaction.created"
	SubjectPaymentReceived    = "payment.received"
	SubjectCustomerCreated    = "customer.created"
	SubjectVendorCreated      = "vendor.created"
	SubjectBillCreated        = "bill.created"
	SubjectBillPaid           = "bill.paid"
	SubjectBankReconciled     = "bank.reconciled"
	SubjectReportGenerated    = "report.generated"
	SubjectUserLogin          = "user.login"
	SubjectUserLogout         = "user.logout"
)

// DefaultStreamConfig returns default stream configuration
func DefaultStreamConfig(name string, subjects []string) jetstream.StreamConfig {
	return jetstream.StreamConfig{
		Name:        name,
		Description: fmt.Sprintf("Stream for %s events", name),
		Subjects:    subjects,
		Retention:   jetstream.LimitsPolicy,
		MaxAge:      7 * 24 * time.Hour, // 7 days retention
		MaxBytes:    1024 * 1024 * 1024, // 1GB max
		MaxMsgs:     -1,                 // Unlimited messages
		Storage:     jetstream.FileStorage,
		Replicas:    1,
		Discard:     jetstream.DiscardOld,
	}
}

// InitializeStreams creates default streams for the application
func (c *Client) InitializeStreams(ctx context.Context) error {
	streams := []struct {
		name     string
		subjects []string
	}{
		{
			name: StreamEvents,
			subjects: []string{
				"events.>",
			},
		},
		{
			name: StreamInvoices,
			subjects: []string{
				"invoice.>",
			},
		},
		{
			name: StreamTransactions,
			subjects: []string{
				"transaction.>",
				"payment.>",
			},
		},
		{
			name: StreamNotifications,
			subjects: []string{
				"notification.>",
			},
		},
		{
			name: StreamAudit,
			subjects: []string{
				"audit.>",
			},
		},
	}

	for _, s := range streams {
		config := DefaultStreamConfig(s.name, s.subjects)
		_, err := c.CreateStream(ctx, config)
		if err != nil {
			return fmt.Errorf("failed to create stream %s: %w", s.name, err)
		}
		log.Printf("Created/updated stream: %s", s.name)
	}

	return nil
}

// EventBuilder helps construct events
type EventBuilder struct {
	event Event
}

// NewEvent creates a new event builder
func NewEvent(eventType, source string) *EventBuilder {
	return &EventBuilder{
		event: Event{
			ID:        generateEventID(),
			Type:      eventType,
			Source:    source,
			Timestamp: time.Now().UTC(),
		},
	}
}

// WithTenant sets the tenant ID
func (b *EventBuilder) WithTenant(tenantID string) *EventBuilder {
	b.event.TenantID = tenantID
	return b
}

// WithUser sets the user ID
func (b *EventBuilder) WithUser(userID string) *EventBuilder {
	b.event.UserID = userID
	return b
}

// WithData sets the event data
func (b *EventBuilder) WithData(data interface{}) *EventBuilder {
	jsonData, _ := json.Marshal(data)
	b.event.Data = jsonData
	return b
}

// Build returns the constructed event
func (b *EventBuilder) Build() Event {
	return b.event
}

// generateEventID generates a unique event ID
func generateEventID() string {
	return fmt.Sprintf("evt_%d", time.Now().UnixNano())
}
