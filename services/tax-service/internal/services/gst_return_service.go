package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// GSTReturnService handles GST return generation
type GSTReturnService struct{}

// NewGSTReturnService creates a new GST return service
func NewGSTReturnService() *GSTReturnService {
	return &GSTReturnService{}
}

// GSTR1Data represents the complete GSTR-1 return data
type GSTR1Data struct {
	GSTIN        string          `json:"gstin"`
	ReturnPeriod string          `json:"ret_period"` // MMYYYY format
	B2B          []GSTR1B2B      `json:"b2b"`        // B2B invoices
	B2CL         []GSTR1B2CL     `json:"b2cl"`       // B2C Large (>2.5L interstate)
	B2CS         []GSTR1B2CS     `json:"b2cs"`       // B2C Small (summary by state)
	CDNR         []GSTR1CDNR     `json:"cdnr"`       // Credit/Debit notes to registered
	CDNUR        []GSTR1CDNUR    `json:"cdnur"`      // Credit/Debit notes to unregistered
	EXP          []GSTR1Export   `json:"exp"`        // Export invoices
	AT           []GSTR1Advance  `json:"at"`         // Advances received
	NIL          GSTR1Nil        `json:"nil"`        // Nil rated, exempt supplies
	HSN          []GSTR1HSN      `json:"hsn"`        // HSN-wise summary
	DOCS         []GSTR1DocIssued `json:"doc_issue"` // Document issued summary
}

// GSTR1B2B represents B2B invoice details
type GSTR1B2B struct {
	CustomerGSTIN string            `json:"ctin"`
	Invoices      []GSTR1B2BInvoice `json:"inv"`
}

type GSTR1B2BInvoice struct {
	InvoiceNumber string             `json:"inum"`
	InvoiceDate   string             `json:"idt"`     // DD-MM-YYYY
	Value         decimal.Decimal    `json:"val"`     // Total invoice value
	POS           string             `json:"pos"`     // Place of supply state code
	ReverseCharge string             `json:"rchrg"`   // Y or N
	InvoiceType   string             `json:"inv_typ"` // R=Regular, SEZWP, SEZWOP, DE, EXPWP, EXPWOP
	Items         []GSTR1InvoiceItem `json:"itms"`
}

type GSTR1InvoiceItem struct {
	ItemNumber  int              `json:"num"`
	ItemDetails GSTR1ItemDetails `json:"itm_det"`
}

type GSTR1ItemDetails struct {
	Rate    decimal.Decimal `json:"rt"`    // Tax rate
	Taxable decimal.Decimal `json:"txval"` // Taxable value
	IGST    decimal.Decimal `json:"iamt"`  // IGST amount
	CGST    decimal.Decimal `json:"camt"`  // CGST amount
	SGST    decimal.Decimal `json:"samt"`  // SGST amount
	Cess    decimal.Decimal `json:"csamt"` // Cess amount
}

// GSTR1B2CL represents B2C Large invoice (>2.5L interstate)
type GSTR1B2CL struct {
	POS      string             `json:"pos"` // Place of supply
	Invoices []GSTR1B2CLInvoice `json:"inv"`
}

type GSTR1B2CLInvoice struct {
	InvoiceNumber string             `json:"inum"`
	InvoiceDate   string             `json:"idt"`
	Value         decimal.Decimal    `json:"val"`
	Etin          string             `json:"etin,omitempty"` // E-commerce GSTIN
	Items         []GSTR1InvoiceItem `json:"itms"`
}

// GSTR1B2CS represents B2C Small (consolidated by rate and POS)
type GSTR1B2CS struct {
	Type    string          `json:"typ"`   // OE=Outward taxable, E=E-commerce
	POS     string          `json:"pos"`   // Place of supply
	Rate    decimal.Decimal `json:"rt"`    // Tax rate
	Taxable decimal.Decimal `json:"txval"` // Total taxable value
	IGST    decimal.Decimal `json:"iamt"`
	CGST    decimal.Decimal `json:"camt"`
	SGST    decimal.Decimal `json:"samt"`
	Cess    decimal.Decimal `json:"csamt"`
}

// GSTR1CDNR represents Credit/Debit note to registered person
type GSTR1CDNR struct {
	CustomerGSTIN string        `json:"ctin"`
	Notes         []GSTR1CDNote `json:"nt"`
}

type GSTR1CDNote struct {
	NoteNumber string             `json:"ntnum"`
	NoteType   string             `json:"ntty"`  // C=Credit, D=Debit
	NoteDate   string             `json:"nt_dt"` // DD-MM-YYYY
	Value      decimal.Decimal    `json:"val"`
	POS        string             `json:"pos"`
	Items      []GSTR1InvoiceItem `json:"itms"`
}

// GSTR1CDNUR represents Credit/Debit note to unregistered
type GSTR1CDNUR struct {
	NoteNumber string             `json:"ntnum"`
	NoteType   string             `json:"ntty"`
	NoteDate   string             `json:"nt_dt"`
	Value      decimal.Decimal    `json:"val"`
	POS        string             `json:"pos"`
	Items      []GSTR1InvoiceItem `json:"itms"`
}

// GSTR1Export represents export invoice
type GSTR1Export struct {
	ExportType string               `json:"exp_typ"` // WPAY=With payment, WOPAY=Without payment
	Invoices   []GSTR1ExportInvoice `json:"inv"`
}

type GSTR1ExportInvoice struct {
	InvoiceNumber string             `json:"inum"`
	InvoiceDate   string             `json:"idt"`
	Value         decimal.Decimal    `json:"val"`
	ShippingBill  string             `json:"sbnum,omitempty"`
	ShippingDate  string             `json:"sbdt,omitempty"`
	ShippingPort  string             `json:"sbpcode,omitempty"`
	Items         []GSTR1InvoiceItem `json:"itms"`
}

// GSTR1Advance represents advances received
type GSTR1Advance struct {
	POS     string          `json:"pos"`
	Rate    decimal.Decimal `json:"rt"`
	Taxable decimal.Decimal `json:"ad_amt"`
	IGST    decimal.Decimal `json:"iamt"`
	CGST    decimal.Decimal `json:"camt"`
	SGST    decimal.Decimal `json:"samt"`
	Cess    decimal.Decimal `json:"csamt"`
}

// GSTR1Nil represents nil rated and exempt supplies
type GSTR1Nil struct {
	NilInter    decimal.Decimal `json:"nil_inter,omitempty"`   // Nil rated interstate
	NilIntra    decimal.Decimal `json:"nil_intra,omitempty"`   // Nil rated intrastate
	ExemptInter decimal.Decimal `json:"expt_inter,omitempty"`  // Exempt interstate
	ExemptIntra decimal.Decimal `json:"expt_intra,omitempty"`  // Exempt intrastate
	NonGSTInter decimal.Decimal `json:"ngsup_inter,omitempty"` // Non-GST interstate
	NonGSTIntra decimal.Decimal `json:"ngsup_intra,omitempty"` // Non-GST intrastate
}

// GSTR1HSN represents HSN-wise summary
type GSTR1HSN struct {
	HSNCode     string          `json:"hsn_sc"`
	Description string          `json:"desc,omitempty"`
	UQC         string          `json:"uqc"` // Unit quantity code
	Quantity    decimal.Decimal `json:"qty"`
	TotalValue  decimal.Decimal `json:"val"`
	Taxable     decimal.Decimal `json:"txval"`
	IGST        decimal.Decimal `json:"iamt"`
	CGST        decimal.Decimal `json:"camt"`
	SGST        decimal.Decimal `json:"samt"`
	Cess        decimal.Decimal `json:"csamt"`
}

// GSTR1DocIssued represents document issued summary
type GSTR1DocIssued struct {
	DocType    int    `json:"doc_num"`
	DocName    string `json:"docs,omitempty"`
	FromSerial string `json:"from,omitempty"`
	ToSerial   string `json:"to,omitempty"`
	TotalCount int    `json:"totnum"`
	Cancelled  int    `json:"cancel"`
	Net        int    `json:"net_issue"`
}

// GSTR3BData represents GSTR-3B return data
type GSTR3BData struct {
	GSTIN        string      `json:"gstin"`
	ReturnPeriod string      `json:"ret_period"`
	Sec31        GSTR3BSec31 `json:"sup_details"` // Outward and inward supplies
	Sec32        GSTR3BSec32 `json:"itc_elg"`     // ITC available
	Sec4         GSTR3BSec4  `json:"inward_sup"`  // Inward supplies from RCM
	Sec51        GSTR3BSec51 `json:"intr_ltfee"`  // Interest and late fee
}

// GSTR3BSec31 represents Section 3.1 - Outward supplies
type GSTR3BSec31 struct {
	OSup31A GSTR3BSupply `json:"osup_det"`      // Outward taxable (excluding zero rated)
	OSup31B GSTR3BSupply `json:"osup_zero"`     // Zero rated
	OSup31C GSTR3BSupply `json:"osup_nil_exmp"` // Nil rated/exempt
	OSup31D GSTR3BSupply `json:"isup_rev"`      // Inward supplies (reverse charge)
	OSup31E GSTR3BSupply `json:"osup_nongst"`   // Non-GST outward
}

type GSTR3BSupply struct {
	Taxable decimal.Decimal `json:"txval"`
	IGST    decimal.Decimal `json:"iamt"`
	CGST    decimal.Decimal `json:"camt"`
	SGST    decimal.Decimal `json:"samt"`
	Cess    decimal.Decimal `json:"csamt"`
}

// GSTR3BSec32 represents Section 3.2 - Supplies to unregistered/composition/UIN
type GSTR3BSec32 struct {
	InterStateUnreg decimal.Decimal `json:"unreg_details,omitempty"`
	InterStateComp  decimal.Decimal `json:"comp_details,omitempty"`
	InterStateUIN   decimal.Decimal `json:"uin_details,omitempty"`
}

// GSTR3BSec4 represents Section 4 - ITC
type GSTR3BSec4 struct {
	ITC4A  GSTR3BITCRow `json:"itc_avl"`       // ITC available
	ITC4B1 GSTR3BITCRow `json:"itc_rev"`       // ITC reversed (Rules 42 & 43)
	ITC4B2 GSTR3BITCRow `json:"itc_rev_other"` // ITC reversed (Others)
	ITC4C  GSTR3BITCRow `json:"itc_net"`       // Net ITC available
	ITC4D1 GSTR3BITCRow `json:"itc_inelg_1"`   // Ineligible ITC (Sec 17(5))
	ITC4D2 GSTR3BITCRow `json:"itc_inelg_2"`   // Ineligible ITC (Others)
}

type GSTR3BITCRow struct {
	IGST decimal.Decimal `json:"iamt"`
	CGST decimal.Decimal `json:"camt"`
	SGST decimal.Decimal `json:"samt"`
	Cess decimal.Decimal `json:"csamt"`
}

// GSTR3BSec51 represents Section 5.1 - Interest and late fee
type GSTR3BSec51 struct {
	Interest decimal.Decimal `json:"intr_amt,omitempty"`
	LateFee  decimal.Decimal `json:"ltfee_amt,omitempty"`
}

// GenerateGSTR1 generates empty GSTR-1 structure for a period
// TODO: Implement with actual invoice data from database
func (s *GSTReturnService) GenerateGSTR1(tenantID uuid.UUID, gstin, period string) *GSTR1Data {
	return &GSTR1Data{
		GSTIN:        gstin,
		ReturnPeriod: period,
		B2B:          []GSTR1B2B{},
		B2CL:         []GSTR1B2CL{},
		B2CS:         []GSTR1B2CS{},
		CDNR:         []GSTR1CDNR{},
		CDNUR:        []GSTR1CDNUR{},
		EXP:          []GSTR1Export{},
		AT:           []GSTR1Advance{},
		HSN:          []GSTR1HSN{},
		DOCS:         []GSTR1DocIssued{},
	}
}

// GenerateGSTR3B generates empty GSTR-3B structure for a period
// TODO: Implement with actual data from database
func (s *GSTReturnService) GenerateGSTR3B(tenantID uuid.UUID, gstin, period string) *GSTR3BData {
	return &GSTR3BData{
		GSTIN:        gstin,
		ReturnPeriod: period,
	}
}

// ExportGSTR1JSON exports GSTR-1 data as JSON string
func (s *GSTReturnService) ExportGSTR1JSON(tenantID uuid.UUID, gstin, period string) (string, error) {
	gstr1 := s.GenerateGSTR1(tenantID, gstin, period)

	jsonData, err := json.MarshalIndent(gstr1, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal GSTR-1: %w", err)
	}

	return string(jsonData), nil
}

// ExportGSTR3BJSON exports GSTR-3B data as JSON string
func (s *GSTReturnService) ExportGSTR3BJSON(tenantID uuid.UUID, gstin, period string) (string, error) {
	gstr3b := s.GenerateGSTR3B(tenantID, gstin, period)

	jsonData, err := json.MarshalIndent(gstr3b, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal GSTR-3B: %w", err)
	}

	return string(jsonData), nil
}

// Helper functions

func parsePeriod(period string) (int, int) {
	if len(period) != 6 {
		return 1, 2024
	}
	var month, year int
	fmt.Sscanf(period, "%02d%04d", &month, &year)
	return month, year
}

func getPeriodDates(period string) (time.Time, time.Time) {
	periodMonth, periodYear := parsePeriod(period)
	startDate := time.Date(periodYear, time.Month(periodMonth), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)
	return startDate, endDate
}
