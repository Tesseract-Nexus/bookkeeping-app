'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  ArrowDownToLine,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileText,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface ITCRecord {
  id: string;
  supplierGstin: string;
  supplierName: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  status: 'matched' | 'pending' | 'mismatch';
}

const sampleData: ITCRecord[] = [
  { id: '1', supplierGstin: '27AAACW8776M1Z1', supplierName: 'Supplier One Pvt Ltd', invoiceNo: 'INV-2025-001', invoiceDate: '2025-12-05', invoiceValue: 118000, igst: 18000, cgst: 0, sgst: 0, status: 'matched' },
  { id: '2', supplierGstin: '29AABCU9603R1ZP', supplierName: 'Raw Materials Co', invoiceNo: 'RM-5678', invoiceDate: '2025-12-10', invoiceValue: 59000, igst: 0, cgst: 4500, sgst: 4500, status: 'matched' },
  { id: '3', supplierGstin: '07AAACI1681G1ZH', supplierName: 'Office Supplies Ltd', invoiceNo: 'OS-9012', invoiceDate: '2025-12-15', invoiceValue: 23600, igst: 3600, cgst: 0, sgst: 0, status: 'pending' },
  { id: '4', supplierGstin: '33AADCT2345M1ZK', supplierName: 'Tech Hardware Inc', invoiceNo: 'TH-3456', invoiceDate: '2025-12-18', invoiceValue: 177000, igst: 0, cgst: 13500, sgst: 13500, status: 'mismatch' },
  { id: '5', supplierGstin: '19AABCL5678N1ZM', supplierName: 'Logistics Partners', invoiceNo: 'LP-7890', invoiceDate: '2025-12-20', invoiceValue: 35400, igst: 5400, cgst: 0, sgst: 0, status: 'matched' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const statusConfig = {
  matched: { label: 'Matched', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
  pending: { label: 'Pending', icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950' },
  mismatch: { label: 'Mismatch', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950' },
};

export default function ITCPage() {
  const { isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const totals = sampleData.reduce(
    (acc, record) => ({
      igst: acc.igst + record.igst,
      cgst: acc.cgst + record.cgst,
      sgst: acc.sgst + record.sgst,
      total: acc.total + record.igst + record.cgst + record.sgst,
    }),
    { igst: 0, cgst: 0, sgst: 0, total: 0 }
  );

  const matchedTotal = sampleData.filter(r => r.status === 'matched').reduce((sum, r) => sum + r.igst + r.cgst + r.sgst, 0);
  const pendingTotal = sampleData.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.igst + r.cgst + r.sgst, 0);
  const mismatchTotal = sampleData.filter(r => r.status === 'mismatch').reduce((sum, r) => sum + r.igst + r.cgst + r.sgst, 0);

  const filteredData = sampleData.filter(record => {
    const matchesSearch = record.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.supplierGstin.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            <h1 className="text-2xl font-bold">Input Tax Credit</h1>
            <p className="text-muted-foreground">Track and manage ITC from purchases</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" />
            Sync with GSTR-2A
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl animate-slide-up" style={{ animationDelay: '100ms' }}>
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Period:</label>
          <select className="h-9 px-3 rounded-lg border bg-background text-sm">
            <option>December 2025</option>
            <option>November 2025</option>
            <option>October 2025</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total ITC', value: totals.total, icon: ArrowDownToLine, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950' },
          { label: 'Matched ITC', value: matchedTotal, icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
          { label: 'Pending Verification', value: pendingTotal, icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950' },
          { label: 'Mismatch', value: mismatchTotal, icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950' },
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border rounded-xl p-4 hover:shadow-md transition-all animate-slide-up hover:-translate-y-1 cursor-pointer"
              style={{ animationDelay: `${150 + index * 50}ms` }}
              onClick={() => setStatusFilter(card.label === 'Total ITC' ? 'all' : card.label === 'Matched ITC' ? 'matched' : card.label === 'Pending Verification' ? 'pending' : 'mismatch')}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4 animate-slide-up" style={{ animationDelay: '350ms' }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by supplier, invoice, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border bg-background text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border bg-background text-sm"
        >
          <option value="all">All Status</option>
          <option value="matched">Matched</option>
          <option value="pending">Pending</option>
          <option value="mismatch">Mismatch</option>
        </select>
      </div>

      {/* ITC Records Table */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            ITC Records ({filteredData.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-sm">
                <th className="text-left p-4 font-semibold">Supplier</th>
                <th className="text-left p-4 font-semibold">Invoice</th>
                <th className="text-right p-4 font-semibold">Invoice Value</th>
                <th className="text-right p-4 font-semibold">IGST</th>
                <th className="text-right p-4 font-semibold">CGST</th>
                <th className="text-right p-4 font-semibold">SGST</th>
                <th className="text-center p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((record) => {
                const status = statusConfig[record.status];
                const StatusIcon = status.icon;
                return (
                  <tr key={record.id} className="border-b hover:bg-muted/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-medium group-hover:text-primary transition-colors">{record.supplierName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{record.supplierGstin}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{record.invoiceNo}</div>
                      <div className="text-xs text-muted-foreground">{new Date(record.invoiceDate).toLocaleDateString('en-IN')}</div>
                    </td>
                    <td className="p-4 text-right font-medium">{formatCurrency(record.invoiceValue)}</td>
                    <td className="p-4 text-right">{record.igst > 0 ? formatCurrency(record.igst) : '-'}</td>
                    <td className="p-4 text-right">{record.cgst > 0 ? formatCurrency(record.cgst) : '-'}</td>
                    <td className="p-4 text-right">{record.sgst > 0 ? formatCurrency(record.sgst) : '-'}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-bold">
                <td className="p-4" colSpan={2}>Total</td>
                <td className="p-4 text-right">{formatCurrency(filteredData.reduce((sum, r) => sum + r.invoiceValue, 0))}</td>
                <td className="p-4 text-right">{formatCurrency(filteredData.reduce((sum, r) => sum + r.igst, 0))}</td>
                <td className="p-4 text-right">{formatCurrency(filteredData.reduce((sum, r) => sum + r.cgst, 0))}</td>
                <td className="p-4 text-right">{formatCurrency(filteredData.reduce((sum, r) => sum + r.sgst, 0))}</td>
                <td className="p-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
