package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/tesseract-nexus/bookkeeping-app/tax-service/internal/repository"
)

// GSTReturnService handles GST return generation
type GSTReturnService struct {
	repo *repository.TaxRepository
}

// NewGSTReturnService creates a new GST return service
func NewGSTReturnService(repo *repository.TaxRepository) *GSTReturnService {
	return &GSTReturnService{repo: repo}
}

// GSTR1Data represents the complete GSTR-1 return data
type GSTR1Data struct {
	GSTIN       string `json:"gstin"`
	ReturnPeriod string `json:"ret_period"` // MMYYYY format
	B2B          []GSTR1B2B `json:"b2b"`      // B2B invoices
	B2CL         []GSTR1B2CL `json:"b2cl"`   // B2C Large (>2.5L interstate)
	B2CS         []GSTR1B2CS `json:"b2cs"`   // B2C Small (summary by state)
	CDNR         []GSTR1CDNR `json:"cdnr"`   // Credit/Debit notes to registered
	CDNUR        []GSTR1CDNUR `json:"cdnur"` // Credit/Debit notes to unregistered
	EXP          []GSTR1Export `json:"exp"`  // Export invoices
	AT           []GSTR1Advance `json:"at"`  // Advances received
	NIL          GSTR1Nil `json:"nil"`       // Nil rated, exempt supplies
	HSN          []GSTR1HSN `json:"hsn"`     // HSN-wise summary
	DOCS         []GSTR1DocIssued `json:"doc_issue"` // Document issued summary
}

// GSTR1B2B represents B2B invoice details
type GSTR1B2B struct {
	CustomerGSTIN string `json:"ctin"`
	Invoices      []GSTR1B2BInvoice `json:"inv"`
}

type GSTR1B2BInvoice struct {
	InvoiceNumber string           `json:"inum"`
	InvoiceDate   string           `json:"idt"` // DD-MM-YYYY
	Value         decimal.Decimal  `json:"val"` // Total invoice value
	POS           string           `json:"pos"` // Place of supply state code
	ReverseCharge string           `json:"rchrg"` // Y or N
	InvoiceType   string           `json:"inv_typ"` // R=Regular, SEZWP, SEZWOP, DE, EXPWP, EXPWOP
	Items         []GSTR1InvoiceItem `json:"itms"`
}

type GSTR1InvoiceItem struct {
	ItemNumber int             `json:"num"`
	ItemDetails GSTR1ItemDetails `json:"itm_det"`
}

type GSTR1ItemDetails struct {
	Rate     decimal.Decimal `json:"rt"`     // Tax rate
	Taxable  decimal.Decimal `json:"txval"`  // Taxable value
	IGST     decimal.Decimal `json:"iamt"`   // IGST amount
	CGST     decimal.Decimal `json:"camt"`   // CGST amount
	SGST     decimal.Decimal `json:"samt"`   // SGST amount
	Cess     decimal.Decimal `json:"csamt"`  // Cess amount
}

// GSTR1B2CL represents B2C Large invoice (>2.5L interstate)
type GSTR1B2CL struct {
	POS      string `json:"pos"` // Place of supply
	Invoices []GSTR1B2CLInvoice `json:"inv"`
}

type GSTR1B2CLInvoice struct {
	InvoiceNumber string           `json:"inum"`
	InvoiceDate   string           `json:"idt"`
	Value         decimal.Decimal  `json:"val"`
	Etin          string           `json:"etin,omitempty"` // E-commerce GSTIN
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
	CustomerGSTIN string `json:"ctin"`
	Notes         []GSTR1CDNote `json:"nt"`
}

type GSTR1CDNote struct {
	NoteNumber string          `json:"ntnum"`
	NoteType   string          `json:"ntty"`   // C=Credit, D=Debit
	NoteDate   string          `json:"nt_dt"`  // DD-MM-YYYY
	Value      decimal.Decimal `json:"val"`
	POS        string          `json:"pos"`
	Items      []GSTR1InvoiceItem `json:"itms"`
}

// GSTR1CDNUR represents Credit/Debit note to unregistered
type GSTR1CDNUR struct {
	NoteNumber string          `json:"ntnum"`
	NoteType   string          `json:"ntty"`
	NoteDate   string          `json:"nt_dt"`
	Value      decimal.Decimal `json:"val"`
	POS        string          `json:"pos"`
	Items      []GSTR1InvoiceItem `json:"itms"`
}

// GSTR1Export represents export invoice
type GSTR1Export struct {
	ExportType string `json:"exp_typ"` // WPAY=With payment, WOPAY=Without payment
	Invoices   []GSTR1ExportInvoice `json:"inv"`
}

type GSTR1ExportInvoice struct {
	InvoiceNumber string          `json:"inum"`
	InvoiceDate   string          `json:"idt"`
	Value         decimal.Decimal `json:"val"`
	ShippingBill  string          `json:"sbnum,omitempty"`
	ShippingDate  string          `json:"sbdt,omitempty"`
	ShippingPort  string          `json:"sbpcode,omitempty"`
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
	NilInter   decimal.Decimal `json:"nil_inter,omitempty"`   // Nil rated interstate
	NilIntra   decimal.Decimal `json:"nil_intra,omitempty"`   // Nil rated intrastate
	ExemptInter decimal.Decimal `json:"expt_inter,omitempty"` // Exempt interstate
	ExemptIntra decimal.Decimal `json:"expt_intra,omitempty"` // Exempt intrastate
	NonGSTInter decimal.Decimal `json:"ngsup_inter,omitempty"` // Non-GST interstate
	NonGSTIntra decimal.Decimal `json:"ngsup_intra,omitempty"` // Non-GST intrastate
}

// GSTR1HSN represents HSN-wise summary
type GSTR1HSN struct {
	HSNCode     string          `json:"hsn_sc"`
	Description string          `json:"desc,omitempty"`
	UQC         string          `json:"uqc"`    // Unit quantity code
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
	GSTIN        string `json:"gstin"`
	ReturnPeriod string `json:"ret_period"`
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
	ITC4A  GSTR3BITCRow `json:"itc_avl"` // ITC available
	ITC4B1 GSTR3BITCRow `json:"itc_rev"` // ITC reversed (Rules 42 & 43)
	ITC4B2 GSTR3BITCRow `json:"itc_rev_other"` // ITC reversed (Others)
	ITC4C  GSTR3BITCRow `json:"itc_net"` // Net ITC available
	ITC4D1 GSTR3BITCRow `json:"itc_inelg_1"` // Ineligible ITC (Sec 17(5))
	ITC4D2 GSTR3BITCRow `json:"itc_inelg_2"` // Ineligible ITC (Others)
}

type GSTR3BITCRow struct {
	IGST decimal.Decimal `json:"iamt"`
	CGST decimal.Decimal `json:"camt"`
	SGST decimal.Decimal `json:"samt"`
	Cess decimal.Decimal `json:"csamt"`
}

// GSTR3BSec51 represents Section 5.1 - Interest and late fee
type GSTR3BSec51 struct {
	Interest  decimal.Decimal `json:"intr_amt,omitempty"`
	LateFee   decimal.Decimal `json:"ltfee_amt,omitempty"`
}

// GenerateGSTR1 generates GSTR-1 data for a period
func (s *GSTReturnService) GenerateGSTR1(ctx context.Context, tenantID uuid.UUID, gstin, period string) (*GSTR1Data, error) {
	// Parse period (MMYYYY)
	periodMonth, periodYear := parsePeriod(period)
	startDate := time.Date(periodYear, time.Month(periodMonth), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)

	// Get all invoices for the period
	invoices, err := s.repo.GetInvoicesForGSTR(ctx, tenantID.String(), startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get invoices: %w", err)
	}

	gstr1 := &GSTR1Data{
		GSTIN:        gstin,
		ReturnPeriod: period,
	}

	// Group invoices by type
	b2bMap := make(map[string]*GSTR1B2B)
	b2clMap := make(map[string]*GSTR1B2CL)
	b2csMap := make(map[string]*GSTR1B2CS)
	hsnMap := make(map[string]*GSTR1HSN)

	threshold := decimal.NewFromFloat(250000) // 2.5 lakhs

	for _, inv := range invoices {
		if inv.CustomerGSTIN != "" {
			// B2B - customer has GSTIN
			if _, ok := b2bMap[inv.CustomerGSTIN]; !ok {
				b2bMap[inv.CustomerGSTIN] = &GSTR1B2B{
					CustomerGSTIN: inv.CustomerGSTIN,
					Invoices:      []GSTR1B2BInvoice{},
				}
			}
			b2bInv := GSTR1B2BInvoice{
				InvoiceNumber: inv.InvoiceNumber,
				InvoiceDate:   inv.InvoiceDate.Format("02-01-2006"),
				Value:         inv.TotalAmount,
				POS:           inv.PlaceOfSupply,
				ReverseCharge: "N",
				InvoiceType:   "R",
				Items:         s.buildInvoiceItems(inv),
			}
			b2bMap[inv.CustomerGSTIN].Invoices = append(b2bMap[inv.CustomerGSTIN].Invoices, b2bInv)
		} else if inv.IsInterstate && inv.TotalAmount.GreaterThan(threshold) {
			// B2C Large - interstate > 2.5L
			if _, ok := b2clMap[inv.PlaceOfSupply]; !ok {
				b2clMap[inv.PlaceOfSupply] = &GSTR1B2CL{
					POS:      inv.PlaceOfSupply,
					Invoices: []GSTR1B2CLInvoice{},
				}
			}
			b2clInv := GSTR1B2CLInvoice{
				InvoiceNumber: inv.InvoiceNumber,
				InvoiceDate:   inv.InvoiceDate.Format("02-01-2006"),
				Value:         inv.TotalAmount,
				Items:         s.buildInvoiceItems(inv),
			}
			b2clMap[inv.PlaceOfSupply].Invoices = append(b2clMap[inv.PlaceOfSupply].Invoices, b2clInv)
		} else {
			// B2C Small - consolidated
			key := fmt.Sprintf("%s_%s", inv.PlaceOfSupply, inv.GSTRate.String())
			if _, ok := b2csMap[key]; !ok {
				b2csMap[key] = &GSTR1B2CS{
					Type:    "OE",
					POS:     inv.PlaceOfSupply,
					Rate:    inv.GSTRate,
				}
			}
			b2cs := b2csMap[key]
			b2cs.Taxable = b2cs.Taxable.Add(inv.Subtotal)
			b2cs.IGST = b2cs.IGST.Add(inv.IGSTAmount)
			b2cs.CGST = b2cs.CGST.Add(inv.CGSTAmount)
			b2cs.SGST = b2cs.SGST.Add(inv.SGSTAmount)
			b2cs.Cess = b2cs.Cess.Add(inv.CessAmount)
		}

		// HSN summary
		for _, item := range inv.Items {
			if item.HSNCode != "" {
				if _, ok := hsnMap[item.HSNCode]; !ok {
					hsnMap[item.HSNCode] = &GSTR1HSN{
						HSNCode: item.HSNCode,
						UQC:     item.UOM,
					}
				}
				hsn := hsnMap[item.HSNCode]
				hsn.Quantity = hsn.Quantity.Add(item.Quantity)
				hsn.TotalValue = hsn.TotalValue.Add(item.LineTotal)
				hsn.Taxable = hsn.Taxable.Add(item.TaxableAmount)
				hsn.IGST = hsn.IGST.Add(item.IGSTAmount)
				hsn.CGST = hsn.CGST.Add(item.CGSTAmount)
				hsn.SGST = hsn.SGST.Add(item.SGSTAmount)
				hsn.Cess = hsn.Cess.Add(item.CessAmount)
			}
		}
	}

	// Convert maps to slices
	for _, b2b := range b2bMap {
		gstr1.B2B = append(gstr1.B2B, *b2b)
	}
	for _, b2cl := range b2clMap {
		gstr1.B2CL = append(gstr1.B2CL, *b2cl)
	}
	for _, b2cs := range b2csMap {
		gstr1.B2CS = append(gstr1.B2CS, *b2cs)
	}
	for _, hsn := range hsnMap {
		gstr1.HSN = append(gstr1.HSN, *hsn)
	}

	return gstr1, nil
}

// GenerateGSTR3B generates GSTR-3B data for a period
func (s *GSTReturnService) GenerateGSTR3B(ctx context.Context, tenantID uuid.UUID, gstin, period string) (*GSTR3BData, error) {
	periodMonth, periodYear := parsePeriod(period)
	startDate := time.Date(periodYear, time.Month(periodMonth), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)

	// Get sales summary
	salesSummary, err := s.repo.GetSalesSummaryForGSTR(ctx, tenantID.String(), startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get sales summary: %w", err)
	}

	// Get purchase summary
	purchaseSummary, err := s.repo.GetPurchaseSummaryForGSTR(ctx, tenantID.String(), startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get purchase summary: %w", err)
	}

	// Get ITC summary
	itcSummary, err := s.repo.GetITCSummary(ctx, tenantID.String(), period)
	if err != nil {
		// Non-fatal, continue with zero values
		itcSummary = nil
	}

	gstr3b := &GSTR3BData{
		GSTIN:        gstin,
		ReturnPeriod: period,
	}

	// Section 3.1 - Outward supplies
	gstr3b.Sec31 = GSTR3BSec31{
		OSup31A: GSTR3BSupply{
			Taxable: salesSummary.TaxableAmount,
			IGST:    salesSummary.IGSTAmount,
			CGST:    salesSummary.CGSTAmount,
			SGST:    salesSummary.SGSTAmount,
			Cess:    salesSummary.CessAmount,
		},
		OSup31B: GSTR3BSupply{
			Taxable: salesSummary.ZeroRatedAmount,
		},
		OSup31C: GSTR3BSupply{
			Taxable: salesSummary.ExemptAmount.Add(salesSummary.NilRatedAmount),
		},
		OSup31D: GSTR3BSupply{
			Taxable: purchaseSummary.RCMAmount,
			IGST:    purchaseSummary.RCMIGSTAmount,
			CGST:    purchaseSummary.RCMCGSTAmount,
			SGST:    purchaseSummary.RCMSGSTAmount,
		},
	}

	// Section 4 - ITC
	if itcSummary != nil {
		gstr3b.Sec4 = GSTR3BSec4{
			ITC4A: GSTR3BITCRow{
				IGST: itcSummary.AvailableIGST,
				CGST: itcSummary.AvailableCGST,
				SGST: itcSummary.AvailableSGST,
				Cess: itcSummary.AvailableCess,
			},
			ITC4B1: GSTR3BITCRow{
				IGST: itcSummary.ReversedIGST,
				CGST: itcSummary.ReversedCGST,
				SGST: itcSummary.ReversedSGST,
				Cess: itcSummary.ReversedCess,
			},
			ITC4C: GSTR3BITCRow{
				IGST: itcSummary.NetIGST,
				CGST: itcSummary.NetCGST,
				SGST: itcSummary.NetSGST,
				Cess: itcSummary.NetCess,
			},
		}
	}

	return gstr3b, nil
}

// ExportGSTR1JSON exports GSTR-1 data as JSON string
func (s *GSTReturnService) ExportGSTR1JSON(ctx context.Context, tenantID uuid.UUID, gstin, period string) (string, error) {
	gstr1, err := s.GenerateGSTR1(ctx, tenantID, gstin, period)
	if err != nil {
		return "", err
	}

	jsonData, err := json.MarshalIndent(gstr1, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal GSTR-1: %w", err)
	}

	return string(jsonData), nil
}

// ExportGSTR3BJSON exports GSTR-3B data as JSON string
func (s *GSTReturnService) ExportGSTR3BJSON(ctx context.Context, tenantID uuid.UUID, gstin, period string) (string, error) {
	gstr3b, err := s.GenerateGSTR3B(ctx, tenantID, gstin, period)
	if err != nil {
		return "", err
	}

	jsonData, err := json.MarshalIndent(gstr3b, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal GSTR-3B: %w", err)
	}

	return string(jsonData), nil
}

// Helper functions

func (s *GSTReturnService) buildInvoiceItems(inv repository.InvoiceForGSTR) []GSTR1InvoiceItem {
	var items []GSTR1InvoiceItem
	// Group by rate
	rateMap := make(map[string]*GSTR1ItemDetails)

	for _, item := range inv.Items {
		rateKey := item.GSTRate.String()
		if _, ok := rateMap[rateKey]; !ok {
			rateMap[rateKey] = &GSTR1ItemDetails{
				Rate: item.GSTRate,
			}
		}
		det := rateMap[rateKey]
		det.Taxable = det.Taxable.Add(item.TaxableAmount)
		det.IGST = det.IGST.Add(item.IGSTAmount)
		det.CGST = det.CGST.Add(item.CGSTAmount)
		det.SGST = det.SGST.Add(item.SGSTAmount)
		det.Cess = det.Cess.Add(item.CessAmount)
	}

	i := 1
	for _, det := range rateMap {
		items = append(items, GSTR1InvoiceItem{
			ItemNumber:  i,
			ItemDetails: *det,
		})
		i++
	}
	return items
}

func parsePeriod(period string) (int, int) {
	if len(period) != 6 {
		return 1, 2024
	}
	var month, year int
	fmt.Sscanf(period, "%02d%04d", &month, &year)
	return month, year
}
