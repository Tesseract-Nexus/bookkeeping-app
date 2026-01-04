'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const sampleData = {
  period: 'December 2025',
  dueDate: '2026-01-20',
  status: 'pending' as const,
  section31: {
    outwardTaxable: { taxable: 2080000, igst: 81000, cgst: 112500, sgst: 112500, cess: 0 },
    outwardZero: { taxable: 180000, igst: 0, cgst: 0, sgst: 0, cess: 0 },
    nilExempt: { taxable: 45000, igst: 0, cgst: 0, sgst: 0, cess: 0 },
    inwardRCM: { taxable: 35000, igst: 2100, cgst: 2100, sgst: 2100, cess: 0 },
    nonGST: { taxable: 15000, igst: 0, cgst: 0, sgst: 0, cess: 0 },
  },
  section4: {
    itcAvailable: { igst: 55000, cgst: 28000, sgst: 28000, cess: 1500 },
    itcReversed: { igst: 2000, cgst: 1000, sgst: 1000, cess: 0 },
    netITC: { igst: 53000, cgst: 27000, sgst: 27000, cess: 1500 },
    ineligible: { igst: 3000, cgst: 1500, sgst: 1500, cess: 0 },
  },
  section5: {
    interest: 0,
    lateFee: 0,
  },
  cashLedger: 150000,
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const statusConfig = {
  filed: { label: 'Filed', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950' },
  overdue: { label: 'Overdue', icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950' },
};

export default function GSTR3BPage() {
  const { isLoading: authLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = React.useState('122025');

  const status = statusConfig[sampleData.status];
  const StatusIcon = status.icon;

  const totalOutputTax = sampleData.section31.outwardTaxable.igst + sampleData.section31.outwardTaxable.cgst + sampleData.section31.outwardTaxable.sgst;
  const totalITC = sampleData.section4.netITC.igst + sampleData.section4.netITC.cgst + sampleData.section4.netITC.sgst;
  const netPayable = totalOutputTax - totalITC;

  if (authLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <Link href="/tax">
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">GSTR-3B</h1>
            <p className="text-muted-foreground">Monthly summary return</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            File Return
          </Button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl animate-slide-up" style={{ animationDelay: '100ms' }}>
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Return Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="h-9 px-3 rounded-lg border bg-background text-sm"
          >
            <option value="122025">December 2025</option>
            <option value="112025">November 2025</option>
            <option value="102025">October 2025</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bgColor}`}>
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Due: </span>
            <span className="font-medium">20 Jan 2026</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Output Tax', value: totalOutputTax, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
          { label: 'Total ITC Available', value: totalITC, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950' },
          { label: 'Net Tax Payable', value: netPayable, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-950' },
          { label: 'Cash Ledger Balance', value: sampleData.cashLedger, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-950' },
        ].map((card, index) => (
          <div
            key={card.label}
            className="bg-card border rounded-xl p-4 hover:shadow-md transition-all animate-slide-up hover:-translate-y-1"
            style={{ animationDelay: `${150 + index * 50}ms` }}
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Section 3.1 - Outward Supplies */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '350ms' }}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold">3.1 Outward and Inward Supplies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-sm">
                <th className="text-left p-4 font-semibold">Description</th>
                <th className="text-right p-4 font-semibold">Taxable Value</th>
                <th className="text-right p-4 font-semibold">IGST</th>
                <th className="text-right p-4 font-semibold">CGST</th>
                <th className="text-right p-4 font-semibold">SGST</th>
                <th className="text-right p-4 font-semibold">Cess</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: '(a) Outward taxable supplies', data: sampleData.section31.outwardTaxable },
                { label: '(b) Outward zero rated supplies', data: sampleData.section31.outwardZero },
                { label: '(c) Nil rated, exempted', data: sampleData.section31.nilExempt },
                { label: '(d) Inward supplies (RCM)', data: sampleData.section31.inwardRCM },
                { label: '(e) Non-GST outward supplies', data: sampleData.section31.nonGST },
              ].map((row) => (
                <tr key={row.label} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-4">{row.label}</td>
                  <td className="p-4 text-right">{formatCurrency(row.data.taxable)}</td>
                  <td className="p-4 text-right">{formatCurrency(row.data.igst)}</td>
                  <td className="p-4 text-right">{formatCurrency(row.data.cgst)}</td>
                  <td className="p-4 text-right">{formatCurrency(row.data.sgst)}</td>
                  <td className="p-4 text-right">{formatCurrency(row.data.cess)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4 - ITC */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold">4. Eligible ITC</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-sm">
                <th className="text-left p-4 font-semibold">Description</th>
                <th className="text-right p-4 font-semibold">IGST</th>
                <th className="text-right p-4 font-semibold">CGST</th>
                <th className="text-right p-4 font-semibold">SGST</th>
                <th className="text-right p-4 font-semibold">Cess</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: '(A) ITC Available', data: sampleData.section4.itcAvailable, highlight: false },
                { label: '(B) ITC Reversed', data: sampleData.section4.itcReversed, highlight: false },
                { label: '(C) Net ITC Available (A-B)', data: sampleData.section4.netITC, highlight: true },
                { label: '(D) Ineligible ITC', data: sampleData.section4.ineligible, highlight: false },
              ].map((row) => (
                <tr key={row.label} className={`border-b hover:bg-muted/50 transition-colors ${row.highlight ? 'bg-green-50 dark:bg-green-950/30 font-semibold' : ''}`}>
                  <td className="p-4">{row.label}</td>
                  <td className="p-4 text-right">{formatCurrency(row.data.igst)}</td>
                  <td className="p-4 text-right">{formatCurrency(row.data.cgst)}</td>
                  <td className="p-4 text-right">{formatCurrency(row.data.sgst)}</td>
                  <td className="p-4 text-right">{formatCurrency(row.data.cess)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Payment Summary */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 border rounded-xl p-6 animate-slide-up" style={{ animationDelay: '450ms' }}>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-600" />
          Tax Payment Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground">IGST Payable</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(sampleData.section31.outwardTaxable.igst - sampleData.section4.netITC.igst)}</p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground">CGST Payable</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(sampleData.section31.outwardTaxable.cgst - sampleData.section4.netITC.cgst)}</p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground">SGST Payable</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(sampleData.section31.outwardTaxable.sgst - sampleData.section4.netITC.sgst)}</p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground">Total Tax Payable</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(netPayable)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 animate-slide-up" style={{ animationDelay: '500ms' }}>
        <Button variant="outline" size="lg" className="gap-2">
          <CreditCard className="h-5 w-5" />
          Pay Tax via Challan
        </Button>
        <Button size="lg" className="gap-2">
          <Send className="h-5 w-5" />
          File GSTR-3B
        </Button>
      </div>
    </div>
  );
}
