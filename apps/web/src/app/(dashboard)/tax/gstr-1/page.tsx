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
  Eye,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const sampleData = {
  period: 'December 2025',
  dueDate: '2026-01-11',
  status: 'pending' as const,
  b2b: { count: 45, value: 1250000, tax: 225000 },
  b2cl: { count: 12, value: 450000, tax: 81000 },
  b2cs: { count: 156, value: 380000, tax: 68400 },
  exports: { count: 3, value: 180000, tax: 0 },
  cdnr: { count: 2, value: 25000, tax: 4500 },
  nil: { value: 45000 },
  hsn: { count: 28 },
  docs: { from: 'INV-001', to: 'INV-216', cancelled: 5 },
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

export default function GSTR1Page() {
  const { isLoading: authLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = React.useState('122025');

  const status = statusConfig[sampleData.status];
  const StatusIcon = status.icon;

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
            <h1 className="text-2xl font-bold">GSTR-1</h1>
            <p className="text-muted-foreground">Outward supplies return</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <Download className="h-4 w-4" />
            Download JSON
          </Button>
          <Button size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload to Portal
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
            <option value="092025">September 2025</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bgColor}`}>
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Due: </span>
            <span className="font-medium">11 Jan 2026</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'B2B Invoices', count: sampleData.b2b.count, value: sampleData.b2b.value, tax: sampleData.b2b.tax, color: 'blue' },
          { label: 'B2C Large', count: sampleData.b2cl.count, value: sampleData.b2cl.value, tax: sampleData.b2cl.tax, color: 'green' },
          { label: 'B2C Small', count: sampleData.b2cs.count, value: sampleData.b2cs.value, tax: sampleData.b2cs.tax, color: 'purple' },
          { label: 'Exports', count: sampleData.exports.count, value: sampleData.exports.value, tax: sampleData.exports.tax, color: 'orange' },
        ].map((card, index) => (
          <div
            key={card.label}
            className="bg-card border rounded-xl p-4 hover:shadow-md transition-all animate-slide-up hover:-translate-y-1 cursor-pointer group"
            style={{ animationDelay: `${150 + index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-${card.color}-100 text-${card.color}-600 dark:bg-${card.color}-950`}>
                {card.count} records
              </span>
            </div>
            <p className="text-xl font-bold group-hover:text-primary transition-colors">{formatCurrency(card.value)}</p>
            <p className="text-sm text-muted-foreground">Tax: {formatCurrency(card.tax)}</p>
          </div>
        ))}
      </div>

      {/* GSTR-1 Tables */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '350ms' }}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Return Summary
          </h2>
        </div>

        <div className="divide-y">
          {[
            { table: '4A, 4B, 6B, 6C', desc: 'B2B Invoices - 4A, 4B, 6B, 6C', invoices: sampleData.b2b.count, taxable: sampleData.b2b.value, tax: sampleData.b2b.tax },
            { table: '5A, 5B', desc: 'B2C (Large) Invoices - 5A, 5B', invoices: sampleData.b2cl.count, taxable: sampleData.b2cl.value, tax: sampleData.b2cl.tax },
            { table: '7', desc: 'B2C (Others)', invoices: sampleData.b2cs.count, taxable: sampleData.b2cs.value, tax: sampleData.b2cs.tax },
            { table: '6A', desc: 'Exports', invoices: sampleData.exports.count, taxable: sampleData.exports.value, tax: sampleData.exports.tax },
            { table: '9B', desc: 'Credit/Debit Notes (Registered)', invoices: sampleData.cdnr.count, taxable: sampleData.cdnr.value, tax: sampleData.cdnr.tax },
            { table: '8A, 8B, 8C, 8D', desc: 'Nil Rated, Exempted and Non-GST Supplies', invoices: '-', taxable: sampleData.nil.value, tax: 0 },
            { table: '12', desc: 'HSN-wise Summary', invoices: `${sampleData.hsn.count} items`, taxable: '-', tax: '-' },
            { table: '13', desc: 'Documents Issued', invoices: `${sampleData.docs.from} to ${sampleData.docs.to}`, taxable: '-', tax: '-' },
          ].map((row, index) => (
            <div
              key={row.table}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{row.table}</span>
                <span className="font-medium group-hover:text-primary transition-colors">{row.desc}</span>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <div className="text-right">
                  <p className="text-muted-foreground">Records</p>
                  <p className="font-medium">{row.invoices}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Taxable Value</p>
                  <p className="font-medium">{typeof row.taxable === 'number' ? formatCurrency(row.taxable) : row.taxable}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Tax Amount</p>
                  <p className="font-medium">{typeof row.tax === 'number' ? formatCurrency(row.tax) : row.tax}</p>
                </div>
                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 animate-slide-up" style={{ animationDelay: '450ms' }}>
        <Button variant="outline" size="lg" className="gap-2">
          <Eye className="h-5 w-5" />
          Preview Return
        </Button>
        <Button size="lg" className="gap-2">
          <Send className="h-5 w-5" />
          Submit to GST Portal
        </Button>
      </div>
    </div>
  );
}
