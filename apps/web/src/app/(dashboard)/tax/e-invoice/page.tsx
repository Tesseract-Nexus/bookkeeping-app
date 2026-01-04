'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Upload,
  Eye,
  Copy,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface EInvoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerGstin: string;
  invoiceValue: number;
  irn: string | null;
  ackNo: string | null;
  ackDate: string | null;
  status: 'generated' | 'pending' | 'cancelled';
}

const sampleData: EInvoice[] = [
  { id: '1', invoiceNo: 'INV-2025-216', invoiceDate: '2025-12-28', customerName: 'ABC Corporation', customerGstin: '27AAACW8776M1Z1', invoiceValue: 295000, irn: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0', ackNo: 'EINV2512280001', ackDate: '2025-12-28', status: 'generated' },
  { id: '2', invoiceNo: 'INV-2025-215', invoiceDate: '2025-12-27', customerName: 'XYZ Industries', customerGstin: '29AABCU9603R1ZP', invoiceValue: 185000, irn: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1', ackNo: 'EINV2512270002', ackDate: '2025-12-27', status: 'generated' },
  { id: '3', invoiceNo: 'INV-2025-214', invoiceDate: '2025-12-26', customerName: 'Tech Solutions Ltd', customerGstin: '07AAACI1681G1ZH', invoiceValue: 142000, irn: null, ackNo: null, ackDate: null, status: 'pending' },
  { id: '4', invoiceNo: 'INV-2025-213', invoiceDate: '2025-12-25', customerName: 'Global Traders', customerGstin: '33AADCT2345M1ZK', invoiceValue: 98000, irn: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2', ackNo: 'EINV2512250003', ackDate: '2025-12-25', status: 'cancelled' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const statusConfig = {
  generated: { label: 'Generated', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950' },
};

export default function EInvoicePage() {
  const { isLoading: authLoading } = useAuth();
  const [dateRange, setDateRange] = React.useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const generatedCount = sampleData.filter(e => e.status === 'generated').length;
  const pendingCount = sampleData.filter(e => e.status === 'pending').length;
  const cancelledCount = sampleData.filter(e => e.status === 'cancelled').length;
  const totalValue = sampleData.filter(e => e.status === 'generated').reduce((sum, e) => sum + e.invoiceValue, 0);

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
            <h1 className="text-2xl font-bold">E-Invoice</h1>
            <p className="text-muted-foreground">Generate and manage GST e-invoices</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" />
            Sync Status
          </Button>
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Generate E-Invoice
          </Button>
        </div>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl animate-slide-up" style={{ animationDelay: '100ms' }}>
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">From:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="h-9 px-3 rounded-lg border bg-background text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">To:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="h-9 px-3 rounded-lg border bg-background text-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Generated', value: generatedCount, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950', isCount: true },
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950', isCount: true },
          { label: 'Cancelled', value: cancelledCount, icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950', isCount: true },
          { label: 'Total Value', value: totalValue, icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950' },
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border rounded-xl p-4 hover:shadow-md transition-all animate-slide-up hover:-translate-y-1"
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>
                    {card.isCount ? card.value : formatCurrency(card.value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* E-Invoice Table */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '350ms' }}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            E-Invoices
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-sm">
                <th className="text-left p-4 font-semibold">Invoice</th>
                <th className="text-left p-4 font-semibold">Customer</th>
                <th className="text-right p-4 font-semibold">Value</th>
                <th className="text-left p-4 font-semibold">IRN</th>
                <th className="text-left p-4 font-semibold">Ack No.</th>
                <th className="text-center p-4 font-semibold">Status</th>
                <th className="text-center p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((invoice) => {
                const status = statusConfig[invoice.status];
                const StatusIcon = status.icon;
                return (
                  <tr key={invoice.id} className="border-b hover:bg-muted/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-medium group-hover:text-primary transition-colors">{invoice.invoiceNo}</div>
                      <div className="text-xs text-muted-foreground">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{invoice.customerName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{invoice.customerGstin}</div>
                    </td>
                    <td className="p-4 text-right font-bold">{formatCurrency(invoice.invoiceValue)}</td>
                    <td className="p-4">
                      {invoice.irn ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono truncate max-w-[120px]">{invoice.irn.slice(0, 12)}...</span>
                          <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {invoice.ackNo ? (
                        <div>
                          <div className="text-sm font-medium">{invoice.ackNo}</div>
                          <div className="text-xs text-muted-foreground">{invoice.ackDate && new Date(invoice.ackDate).toLocaleDateString('en-IN')}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon-sm" className="hover:text-primary" title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status === 'generated' && (
                          <Button variant="ghost" size="icon-sm" className="hover:text-primary" title="QR Code">
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}
                        {invoice.status === 'pending' && (
                          <Button variant="ghost" size="icon-sm" className="hover:text-green-600" title="Generate">
                            <Upload className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-sm" className="hover:text-primary" title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border rounded-xl p-5">
          <h3 className="font-semibold mb-2">E-Invoice Requirements</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>- Mandatory for businesses with turnover &gt; ₹5 crore</li>
            <li>- Generate within 24 hours of invoice date</li>
            <li>- IRN is valid for 24 hours for cancellation</li>
            <li>- E-way bill auto-generated for eligible invoices</li>
          </ul>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border rounded-xl p-5">
          <h3 className="font-semibold mb-2">Quick Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>- Verify customer GSTIN before generating</li>
            <li>- Keep backup of IRN and signed invoice</li>
            <li>- Use batch generation for multiple invoices</li>
            <li>- Print QR code on physical invoice copies</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
