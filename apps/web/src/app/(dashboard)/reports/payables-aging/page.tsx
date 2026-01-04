'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  Building,
  AlertTriangle,
  Clock,
  CheckCircle,
  Printer,
  RefreshCw,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface VendorAging {
  id: string;
  name: string;
  email: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

const sampleData: VendorAging[] = [
  { id: '1', name: 'Supplier One Pvt Ltd', email: 'accounts@supplier1.com', current: 45000, days30: 22000, days60: 0, days90: 0, over90: 0, total: 67000 },
  { id: '2', name: 'Raw Materials Co', email: 'billing@rawmat.in', current: 32000, days30: 18000, days60: 15000, days90: 0, over90: 0, total: 65000 },
  { id: '3', name: 'Office Supplies Ltd', email: 'ar@officesup.com', current: 0, days30: 12000, days60: 8000, days90: 5000, over90: 0, total: 25000 },
  { id: '4', name: 'Tech Hardware Inc', email: 'finance@techhw.in', current: 55000, days30: 0, days60: 0, days90: 0, over90: 8000, total: 63000 },
  { id: '5', name: 'Logistics Partners', email: 'invoices@logistics.com', current: 28000, days30: 15000, days60: 0, days90: 0, over90: 0, total: 43000 },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function PayablesAgingReportPage() {
  const { isLoading: authLoading } = useAuth();
  const [asOfDate, setAsOfDate] = React.useState(new Date().toISOString().split('T')[0]);

  const totals = sampleData.reduce(
    (acc, vendor) => ({
      current: acc.current + vendor.current,
      days30: acc.days30 + vendor.days30,
      days60: acc.days60 + vendor.days60,
      days90: acc.days90 + vendor.days90,
      over90: acc.over90 + vendor.over90,
      total: acc.total + vendor.total,
    }),
    { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 }
  );

  const overdueAmount = totals.days30 + totals.days60 + totals.days90 + totals.over90;

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
          <Link href="/reports">
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Payables Aging</h1>
            <p className="text-muted-foreground">Outstanding vendor bills by age</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl animate-slide-up" style={{ animationDelay: '100ms' }}>
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">As of Date:</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="h-9 px-3 rounded-lg border bg-background text-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Payables', value: totals.total, icon: Building, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950' },
          { label: 'Current (0-30 days)', value: totals.current, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
          { label: 'Overdue', value: overdueAmount, icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950' },
          { label: 'Over 90 Days', value: totals.over90, icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950' },
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
                    {formatCurrency(card.value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Aging Buckets Summary */}
      <div className="grid grid-cols-5 gap-3 animate-slide-up" style={{ animationDelay: '350ms' }}>
        {[
          { label: 'Current', value: totals.current, color: 'bg-green-500' },
          { label: '1-30 Days', value: totals.days30, color: 'bg-yellow-500' },
          { label: '31-60 Days', value: totals.days60, color: 'bg-orange-500' },
          { label: '61-90 Days', value: totals.days90, color: 'bg-red-400' },
          { label: '90+ Days', value: totals.over90, color: 'bg-red-600' },
        ].map((bucket) => (
          <div key={bucket.label} className="text-center">
            <div className={`h-2 rounded-full ${bucket.color} mb-2`} />
            <p className="text-xs text-muted-foreground">{bucket.label}</p>
            <p className="font-semibold text-sm">{formatCurrency(bucket.value)}</p>
          </div>
        ))}
      </div>

      {/* Vendor Aging Table */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold">Vendor Details</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-sm">
                <th className="text-left p-4 font-semibold">Vendor</th>
                <th className="text-right p-4 font-semibold text-green-600">Current</th>
                <th className="text-right p-4 font-semibold text-yellow-600">1-30 Days</th>
                <th className="text-right p-4 font-semibold text-orange-600">31-60 Days</th>
                <th className="text-right p-4 font-semibold text-red-500">61-90 Days</th>
                <th className="text-right p-4 font-semibold text-red-600">90+ Days</th>
                <th className="text-right p-4 font-semibold">Total</th>
                <th className="text-center p-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((vendor) => (
                <tr key={vendor.id} className="border-b hover:bg-muted/50 transition-colors group">
                  <td className="p-4">
                    <div className="font-medium group-hover:text-primary transition-colors">{vendor.name}</div>
                    <div className="text-xs text-muted-foreground">{vendor.email}</div>
                  </td>
                  <td className="p-4 text-right text-green-600">{vendor.current > 0 ? formatCurrency(vendor.current) : '-'}</td>
                  <td className="p-4 text-right text-yellow-600">{vendor.days30 > 0 ? formatCurrency(vendor.days30) : '-'}</td>
                  <td className="p-4 text-right text-orange-600">{vendor.days60 > 0 ? formatCurrency(vendor.days60) : '-'}</td>
                  <td className="p-4 text-right text-red-500">{vendor.days90 > 0 ? formatCurrency(vendor.days90) : '-'}</td>
                  <td className="p-4 text-right text-red-600 font-medium">{vendor.over90 > 0 ? formatCurrency(vendor.over90) : '-'}</td>
                  <td className="p-4 text-right font-bold">{formatCurrency(vendor.total)}</td>
                  <td className="p-4 text-center">
                    <Button variant="outline" size="sm" className="gap-2 hover:bg-primary hover:text-primary-foreground transition-colors">
                      <CreditCard className="h-4 w-4" />
                      Pay
                    </Button>
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/50 font-bold">
                <td className="p-4">Total ({sampleData.length} vendors)</td>
                <td className="p-4 text-right text-green-600">{formatCurrency(totals.current)}</td>
                <td className="p-4 text-right text-yellow-600">{formatCurrency(totals.days30)}</td>
                <td className="p-4 text-right text-orange-600">{formatCurrency(totals.days60)}</td>
                <td className="p-4 text-right text-red-500">{formatCurrency(totals.days90)}</td>
                <td className="p-4 text-right text-red-600">{formatCurrency(totals.over90)}</td>
                <td className="p-4 text-right">{formatCurrency(totals.total)}</td>
                <td className="p-4"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
