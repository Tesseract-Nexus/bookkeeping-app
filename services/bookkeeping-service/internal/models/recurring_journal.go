package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RecurrenceFrequency represents how often a journal entry recurs
type RecurrenceFrequency string

const (
	FrequencyDaily    RecurrenceFrequency = "daily"
	FrequencyWeekly   RecurrenceFrequency = "weekly"
	FrequencyBiweekly RecurrenceFrequency = "biweekly"
	FrequencyMonthly  RecurrenceFrequency = "monthly"
	FrequencyQuarterly RecurrenceFrequency = "quarterly"
	FrequencyAnnually RecurrenceFrequency = "annually"
)

// RecurringJournalStatus represents the status of a recurring journal
type RecurringJournalStatus string

const (
	RecurringStatusActive    RecurringJournalStatus = "active"
	RecurringStatusPaused    RecurringJournalStatus = "paused"
	RecurringStatusCompleted RecurringJournalStatus = "completed"
	RecurringStatusCancelled RecurringJournalStatus = "cancelled"
)

// RecurringJournal represents a template for generating recurring journal entries
type RecurringJournal struct {
	ID              uuid.UUID              `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID        uuid.UUID              `gorm:"type:uuid;index;not null" json:"tenant_id"`
	Name            string                 `gorm:"size:200;not null" json:"name"`
	Description     string                 `gorm:"type:text" json:"description"`

	// Transaction template data
	TransactionType TransactionType        `gorm:"type:varchar(50);not null" json:"transaction_type"`
	TotalAmount     float64                `gorm:"type:decimal(15,2);not null" json:"total_amount"`

	// Recurrence settings
	Frequency       RecurrenceFrequency    `gorm:"size:20;not null" json:"frequency"`
	IntervalCount   int                    `gorm:"default:1" json:"interval_count"`
	StartDate       time.Time              `gorm:"not null" json:"start_date"`
	EndDate         *time.Time             `json:"end_date,omitempty"`
	MaxOccurrences  *int                   `json:"max_occurrences,omitempty"`
	OccurrenceCount int                    `gorm:"default:0" json:"occurrence_count"`
	NextRunDate     time.Time              `gorm:"index" json:"next_run_date"`
	LastRunDate     *time.Time             `json:"last_run_date,omitempty"`

	// Status
	Status          RecurringJournalStatus `gorm:"size:20;default:'active'" json:"status"`

	// Template lines
	Lines           []RecurringJournalLine `gorm:"foreignKey:RecurringJournalID" json:"lines"`

	// Audit fields
	CreatedBy      uuid.UUID      `gorm:"type:uuid" json:"created_by"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for RecurringJournal
func (RecurringJournal) TableName() string {
	return "recurring_journals"
}

// BeforeCreate hook
func (rj *RecurringJournal) BeforeCreate(tx *gorm.DB) error {
	if rj.ID == uuid.Nil {
		rj.ID = uuid.New()
	}
	return nil
}

// CalculateNextRunDate calculates the next run date based on frequency
func (rj *RecurringJournal) CalculateNextRunDate() time.Time {
	base := rj.NextRunDate
	if rj.LastRunDate != nil {
		base = *rj.LastRunDate
	}

	interval := rj.IntervalCount
	if interval <= 0 {
		interval = 1
	}

	switch rj.Frequency {
	case FrequencyDaily:
		return base.AddDate(0, 0, interval)
	case FrequencyWeekly:
		return base.AddDate(0, 0, 7*interval)
	case FrequencyBiweekly:
		return base.AddDate(0, 0, 14*interval)
	case FrequencyMonthly:
		return base.AddDate(0, interval, 0)
	case FrequencyQuarterly:
		return base.AddDate(0, 3*interval, 0)
	case FrequencyAnnually:
		return base.AddDate(interval, 0, 0)
	default:
		return base.AddDate(0, 1, 0)
	}
}

// ShouldGenerate checks if a journal entry should be generated
func (rj *RecurringJournal) ShouldGenerate() bool {
	if rj.Status != RecurringStatusActive {
		return false
	}

	now := time.Now()
	if rj.NextRunDate.After(now) {
		return false
	}

	if rj.EndDate != nil && now.After(*rj.EndDate) {
		return false
	}

	if rj.MaxOccurrences != nil && rj.OccurrenceCount >= *rj.MaxOccurrences {
		return false
	}

	return true
}

// IsBalanced checks if the recurring journal lines are balanced
func (rj *RecurringJournal) IsBalanced() bool {
	var totalDebit, totalCredit float64
	for _, line := range rj.Lines {
		totalDebit += line.DebitAmount
		totalCredit += line.CreditAmount
	}
	return totalDebit == totalCredit
}

// RecurringJournalLine represents a line item template for recurring journals
type RecurringJournalLine struct {
	ID                  uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	RecurringJournalID  uuid.UUID `gorm:"type:uuid;index;not null" json:"recurring_journal_id"`
	AccountID           uuid.UUID `gorm:"type:uuid;not null" json:"account_id"`
	Description         string    `gorm:"type:text" json:"description"`
	DebitAmount         float64   `gorm:"type:decimal(15,2);default:0" json:"debit_amount"`
	CreditAmount        float64   `gorm:"type:decimal(15,2);default:0" json:"credit_amount"`
	LineOrder           int       `gorm:"default:0" json:"line_order"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// TableName returns the table name for RecurringJournalLine
func (RecurringJournalLine) TableName() string {
	return "recurring_journal_lines"
}

// BeforeCreate hook
func (rjl *RecurringJournalLine) BeforeCreate(tx *gorm.DB) error {
	if rjl.ID == uuid.Nil {
		rjl.ID = uuid.New()
	}
	return nil
}

// GeneratedJournal tracks which transactions were generated from recurring templates
type GeneratedJournal struct {
	ID                  uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	RecurringJournalID  uuid.UUID `gorm:"type:uuid;index;not null" json:"recurring_journal_id"`
	TransactionID       uuid.UUID `gorm:"type:uuid;index;not null" json:"transaction_id"`
	OccurrenceNumber    int       `gorm:"not null" json:"occurrence_number"`
	GeneratedAt         time.Time `gorm:"not null" json:"generated_at"`
}

// TableName returns the table name for GeneratedJournal
func (GeneratedJournal) TableName() string {
	return "generated_journals"
}

// BeforeCreate hook
func (gj *GeneratedJournal) BeforeCreate(tx *gorm.DB) error {
	if gj.ID == uuid.Nil {
		gj.ID = uuid.New()
	}
	return nil
}
