'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface LineItem {
  name: string;
  amount: number;
  subItems?: LineItem[];
}

const sampleData = {
  revenue: [
    { name: 'Sales Revenue', amount: 850000 },
    { name: 'Service Revenue', amount: 250000 },
    { name: 'Other Income', amount: 25000 },
  ],
  expenses: [
    { name: 'Cost of Goods Sold', amount: 425000 },
    { name: 'Salaries & Wages', amount: 180000 },
    { name: 'Rent & Utilities', amount: 48000 },
    { name: 'Marketing & Advertising', amount: 35000 },
    { name: 'Office Supplies', amount: 12000 },
    { name: 'Professional Fees', amount: 25000 },
    { name: 'Depreciation', amount: 18000 },
    { name: 'Other Expenses', amount: 15000 },
  ],
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ProfitLossReportPage() {
  const { isLoading: authLoading } = useAuth();
  const [dateRange, setDateRange] = React.useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [isLoading, setIsLoading] = React.useState(false);

  const totalRevenue = sampleData.revenue.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = sampleData.expenses.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = ((netProfit / totalRevenue) * 100).toFixed(1);

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
            <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
            <p className="text-muted-foreground">Income statement for the selected period</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
            This Month
          </Button>
          <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
            This Quarter
          </Button>
          <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
            This Year
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: totalRevenue, icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
          { label: 'Total Expenses', value: totalExpenses, icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950' },
          { label: 'Net Profit', value: netProfit, icon: DollarSign, color: netProfit >= 0 ? 'text-green-600' : 'text-red-600', bgColor: netProfit >= 0 ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950' },
          { label: 'Profit Margin', value: `${profitMargin}%`, icon: TrendingUp, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950', isPercentage: true },
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
                    {card.isPercentage ? card.value : formatCurrency(card.value as number)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* P&L Statement */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '350ms' }}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold">Statement Details</h2>
        </div>

        {/* Revenue Section */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-green-600 mb-3">Revenue</h3>
          <div className="space-y-2">
            {sampleData.revenue.map((item, index) => (
              <div
                key={item.name}
                className="flex justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                style={{ animationDelay: `${400 + index * 30}ms` }}
              >
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 px-3 bg-green-50 dark:bg-green-950/30 rounded-lg font-semibold">
              <span>Total Revenue</span>
              <span className="text-green-600">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-red-600 mb-3">Expenses</h3>
          <div className="space-y-2">
            {sampleData.expenses.map((item, index) => (
              <div
                key={item.name}
                className="flex justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                style={{ animationDelay: `${500 + index * 30}ms` }}
              >
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 px-3 bg-red-50 dark:bg-red-950/30 rounded-lg font-semibold">
              <span>Total Expenses</span>
              <span className="text-red-600">{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="p-4 bg-muted/30">
          <div className={`flex justify-between py-4 px-4 rounded-xl ${netProfit >= 0 ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
            <span className="text-lg font-bold">Net Profit / (Loss)</span>
            <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
