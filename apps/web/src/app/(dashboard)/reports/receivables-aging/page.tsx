'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  Printer,
  RefreshCw,
  Mail,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface CustomerAging {
  id: string;
  name: string;
  email: string;
  phone: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

const sampleData: CustomerAging[] = [
  { id: '1', name: 'ABC Corporation', email: 'accounts@abc.com', phone: '+91 98765 43210', current: 50000, days30: 35000, days60: 0, days90: 0, over90: 0, total: 85000 },
  { id: '2', name: 'XYZ Industries', email: 'finance@xyz.in', phone: '+91 98765 43211', current: 25000, days30: 15000, days60: 12000, days90: 0, over90: 0, total: 52000 },
  { id: '3', name: 'Tech Solutions Ltd', email: 'billing@techsol.com', phone: '+91 98765 43212', current: 0, days30: 28000, days60: 18000, days90: 15000, over90: 0, total: 61000 },
  { id: '4', name: 'Global Traders', email: 'accounts@global.in', phone: '+91 98765 43213', current: 42000, days30: 0, days60: 0, days90: 8000, over90: 12000, total: 62000 },
  { id: '5', name: 'Metro Supplies', email: 'ap@metro.com', phone: '+91 98765 43214', current: 18000, days30: 22000, days60: 0, days90: 0, over90: 0, total: 40000 },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ReceivablesAgingReportPage() {
  const { isLoading: authLoading } = useAuth();
  const [asOfDate, setAsOfDate] = React.useState(new Date().toISOString().split('T')[0]);

  const totals = sampleData.reduce(
    (acc, customer) => ({
      current: acc.current + customer.current,
      days30: acc.days30 + customer.days30,
      days60: acc.days60 + customer.days60,
      days90: acc.days90 + customer.days90,
      over90: acc.over90 + customer.over90,
      total: acc.total + customer.total,
    }),
    { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 }
  );

  const overdueAmount = totals.days30 + totals.days60 + totals.days90 + totals.over90;
  const overduePercentage = ((overdueAmount / totals.total) * 100).toFixed(1);

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
            <h1 className="text-2xl font-bold">Receivables Aging</h1>
            <p className="text-muted-foreground">Outstanding customer invoices by age</p>
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
          { label: 'Total Outstanding', value: totals.total, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950' },
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

      {/* Customer Aging Table */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold">Customer Details</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-sm">
                <th className="text-left p-4 font-semibold">Customer</th>
                <th className="text-right p-4 font-semibold text-green-600">Current</th>
                <th className="text-right p-4 font-semibold text-yellow-600">1-30 Days</th>
                <th className="text-right p-4 font-semibold text-orange-600">31-60 Days</th>
                <th className="text-right p-4 font-semibold text-red-500">61-90 Days</th>
                <th className="text-right p-4 font-semibold text-red-600">90+ Days</th>
                <th className="text-right p-4 font-semibold">Total</th>
                <th className="text-center p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-muted/50 transition-colors group">
                  <td className="p-4">
                    <div className="font-medium group-hover:text-primary transition-colors">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                  </td>
                  <td className="p-4 text-right text-green-600">{customer.current > 0 ? formatCurrency(customer.current) : '-'}</td>
                  <td className="p-4 text-right text-yellow-600">{customer.days30 > 0 ? formatCurrency(customer.days30) : '-'}</td>
                  <td className="p-4 text-right text-orange-600">{customer.days60 > 0 ? formatCurrency(customer.days60) : '-'}</td>
                  <td className="p-4 text-right text-red-500">{customer.days90 > 0 ? formatCurrency(customer.days90) : '-'}</td>
                  <td className="p-4 text-right text-red-600 font-medium">{customer.over90 > 0 ? formatCurrency(customer.over90) : '-'}</td>
                  <td className="p-4 text-right font-bold">{formatCurrency(customer.total)}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon-sm" className="hover:text-primary">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="hover:text-primary">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/50 font-bold">
                <td className="p-4">Total ({sampleData.length} customers)</td>
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
