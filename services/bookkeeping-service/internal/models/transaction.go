package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TransactionType represents the type of transaction
type TransactionType string

const (
	TransactionTypeSale     TransactionType = "sale"
	TransactionTypePurchase TransactionType = "purchase"
	TransactionTypeReceipt  TransactionType = "receipt"
	TransactionTypePayment  TransactionType = "payment"
	TransactionTypeExpense  TransactionType = "expense"
	TransactionTypeJournal  TransactionType = "journal"
	TransactionTypeTransfer TransactionType = "transfer"
)

// TransactionStatus represents the status of a transaction
type TransactionStatus string

const (
	TransactionStatusDraft  TransactionStatus = "draft"
	TransactionStatusPosted TransactionStatus = "posted"
	TransactionStatusVoid   TransactionStatus = "void"
)

// PaymentMode represents the mode of payment
type PaymentMode string

const (
	PaymentModeCash   PaymentMode = "cash"
	PaymentModeBank   PaymentMode = "bank"
	PaymentModeUPI    PaymentMode = "upi"
	PaymentModeCard   PaymentMode = "card"
	PaymentModeCredit PaymentMode = "credit"
	PaymentModeCheque PaymentMode = "cheque"
)

// Transaction represents a journal entry
type Transaction struct {
	ID       uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;index;not null" json:"tenant_id"`
	StoreID  *uuid.UUID `gorm:"type:uuid;index" json:"store_id,omitempty"`

	TransactionNumber string          `gorm:"size:50;not null" json:"transaction_number"`
	TransactionDate   time.Time       `gorm:"type:date;not null;index" json:"transaction_date"`
	TransactionType   TransactionType `gorm:"type:varchar(50);not null" json:"transaction_type"`

	ReferenceType string     `gorm:"size:50" json:"reference_type,omitempty"` // invoice, bill, manual
	ReferenceID   *uuid.UUID `gorm:"type:uuid" json:"reference_id,omitempty"`

	PartyID   *uuid.UUID `gorm:"type:uuid;index" json:"party_id,omitempty"`
	PartyType string     `gorm:"size:20" json:"party_type,omitempty"` // customer, vendor
	PartyName string     `gorm:"size:255" json:"party_name,omitempty"`

	Description string `gorm:"type:text" json:"description"`
	Notes       string `gorm:"type:text" json:"notes"`

	// Totals
	Subtotal       float64 `gorm:"type:decimal(15,2);not null" json:"subtotal"`
	TaxAmount      float64 `gorm:"type:decimal(15,2);default:0" json:"tax_amount"`
	DiscountAmount float64 `gorm:"type:decimal(15,2);default:0" json:"discount_amount"`
	TotalAmount    float64 `gorm:"type:decimal(15,2);not null" json:"total_amount"`

	// Payment info
	PaymentMode      PaymentMode `gorm:"type:varchar(50)" json:"payment_mode,omitempty"`
	PaymentReference string      `gorm:"size:100" json:"payment_reference,omitempty"`

	Status TransactionStatus `gorm:"type:varchar(20);default:'posted'" json:"status"`

	// Relations
	Lines []TransactionLine `gorm:"foreignKey:TransactionID" json:"lines,omitempty"`

	// Audit
	CreatedBy uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy *uuid.UUID     `gorm:"type:uuid" json:"updated_by,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for Transaction
func (Transaction) TableName() string {
	return "transactions"
}

// BeforeCreate hook
func (t *Transaction) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

// IsBalanced checks if the transaction is balanced (debits = credits)
func (t *Transaction) IsBalanced() bool {
	var totalDebit, totalCredit float64
	for _, line := range t.Lines {
		totalDebit += line.DebitAmount
		totalCredit += line.CreditAmount
	}
	return totalDebit == totalCredit
}

// TransactionLine represents a line item in a transaction (double-entry)
type TransactionLine struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TransactionID uuid.UUID `gorm:"type:uuid;not null;index" json:"transaction_id"`
	AccountID     uuid.UUID `gorm:"type:uuid;not null;index" json:"account_id"`

	Description string `gorm:"type:text" json:"description"`

	DebitAmount  float64 `gorm:"type:decimal(15,2);default:0" json:"debit_amount"`
	CreditAmount float64 `gorm:"type:decimal(15,2);default:0" json:"credit_amount"`

	// Tax tracking
	TaxRateID *uuid.UUID `gorm:"type:uuid" json:"tax_rate_id,omitempty"`
	TaxAmount float64    `gorm:"type:decimal(15,2);default:0" json:"tax_amount"`

	LineOrder int `gorm:"default:0" json:"line_order"`

	// Relations
	Account *Account `gorm:"foreignKey:AccountID" json:"account,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the table name for TransactionLine
func (TransactionLine) TableName() string {
	return "transaction_lines"
}

// BeforeCreate hook
func (l *TransactionLine) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}

// BankTransaction represents a bank statement entry for reconciliation
type BankTransaction struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	BankAccountID uuid.UUID `gorm:"type:uuid;not null;index" json:"bank_account_id"`
	TenantID      uuid.UUID `gorm:"type:uuid;not null" json:"tenant_id"`

	TransactionDate time.Time  `gorm:"type:date;not null" json:"transaction_date"`
	ValueDate       *time.Time `gorm:"type:date" json:"value_date,omitempty"`
	Description     string     `gorm:"type:text" json:"description"`
	Reference       string     `gorm:"size:100" json:"reference"`

	DebitAmount  float64 `gorm:"type:decimal(15,2);default:0" json:"debit_amount"`
	CreditAmount float64 `gorm:"type:decimal(15,2);default:0" json:"credit_amount"`
	Balance      float64 `gorm:"type:decimal(15,2)" json:"balance"`

	// Reconciliation
	IsReconciled            bool       `gorm:"default:false" json:"is_reconciled"`
	ReconciledTransactionID *uuid.UUID `gorm:"type:uuid" json:"reconciled_transaction_id,omitempty"`
	ReconciledAt            *time.Time `json:"reconciled_at,omitempty"`
	ReconciledBy            *uuid.UUID `gorm:"type:uuid" json:"reconciled_by,omitempty"`

	// Import tracking
	ImportBatchID *uuid.UUID `gorm:"type:uuid" json:"import_batch_id,omitempty"`
	ExternalID    string     `gorm:"size:100" json:"external_id,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the table name for BankTransaction
func (BankTransaction) TableName() string {
	return "bank_transactions"
}

// BeforeCreate hook
func (b *BankTransaction) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}
