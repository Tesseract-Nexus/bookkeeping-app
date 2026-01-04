'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  Building2,
  Wallet,
  CreditCard,
  Scale,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const sampleData = {
  assets: {
    current: [
      { name: 'Cash & Bank Balances', amount: 450000 },
      { name: 'Accounts Receivable', amount: 320000 },
      { name: 'Inventory', amount: 180000 },
      { name: 'Prepaid Expenses', amount: 25000 },
    ],
    nonCurrent: [
      { name: 'Property, Plant & Equipment', amount: 850000 },
      { name: 'Less: Accumulated Depreciation', amount: -180000 },
      { name: 'Intangible Assets', amount: 50000 },
      { name: 'Long-term Investments', amount: 200000 },
    ],
  },
  liabilities: {
    current: [
      { name: 'Accounts Payable', amount: 180000 },
      { name: 'Short-term Loans', amount: 100000 },
      { name: 'Accrued Expenses', amount: 45000 },
      { name: 'GST Payable', amount: 35000 },
    ],
    nonCurrent: [
      { name: 'Long-term Loans', amount: 350000 },
      { name: 'Deferred Tax Liability', amount: 25000 },
    ],
  },
  equity: [
    { name: 'Share Capital', amount: 500000 },
    { name: 'Retained Earnings', amount: 560000 },
    { name: 'Current Year Profit', amount: 100000 },
  ],
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function BalanceSheetPage() {
  const { isLoading: authLoading } = useAuth();
  const [asOfDate, setAsOfDate] = React.useState(new Date().toISOString().split('T')[0]);

  const totalCurrentAssets = sampleData.assets.current.reduce((sum, item) => sum + item.amount, 0);
  const totalNonCurrentAssets = sampleData.assets.nonCurrent.reduce((sum, item) => sum + item.amount, 0);
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  const totalCurrentLiabilities = sampleData.liabilities.current.reduce((sum, item) => sum + item.amount, 0);
  const totalNonCurrentLiabilities = sampleData.liabilities.nonCurrent.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  const totalEquity = sampleData.equity.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

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
            <h1 className="text-2xl font-bold">Balance Sheet</h1>
            <p className="text-muted-foreground">Statement of financial position</p>
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
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
            End of Month
          </Button>
          <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
            End of Quarter
          </Button>
          <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
            End of Year
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: totalAssets, icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950' },
          { label: 'Total Liabilities', value: totalLiabilities, icon: CreditCard, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-950' },
          { label: 'Total Equity', value: totalEquity, icon: Wallet, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
          { label: 'Balance Check', value: totalAssets - totalLiabilitiesAndEquity === 0 ? 'Balanced' : 'Unbalanced', icon: Scale, color: totalAssets - totalLiabilitiesAndEquity === 0 ? 'text-green-600' : 'text-red-600', bgColor: totalAssets - totalLiabilitiesAndEquity === 0 ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950', isText: true },
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
                    {card.isText ? card.value : formatCurrency(card.value as number)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Balance Sheet Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '350ms' }}>
          <div className="p-4 border-b bg-blue-50 dark:bg-blue-950/30">
            <h2 className="font-semibold text-blue-600 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Assets
            </h2>
          </div>

          <div className="p-4 space-y-4">
            {/* Current Assets */}
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Current Assets</h3>
              <div className="space-y-1">
                {sampleData.assets.current.map((item) => (
                  <div key={item.name} className="flex justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm">{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">Total Current Assets</span>
                  <span className="font-bold">{formatCurrency(totalCurrentAssets)}</span>
                </div>
              </div>
            </div>

            {/* Non-Current Assets */}
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Non-Current Assets</h3>
              <div className="space-y-1">
                {sampleData.assets.nonCurrent.map((item) => (
                  <div key={item.name} className="flex justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm">{item.name}</span>
                    <span className={`font-medium ${item.amount < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">Total Non-Current Assets</span>
                  <span className="font-bold">{formatCurrency(totalNonCurrentAssets)}</span>
                </div>
              </div>
            </div>

            {/* Total Assets */}
            <div className="flex justify-between py-3 px-4 bg-blue-100 dark:bg-blue-950 rounded-xl">
              <span className="font-bold text-blue-600">Total Assets</span>
              <span className="font-bold text-blue-600">{formatCurrency(totalAssets)}</span>
            </div>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="p-4 border-b bg-red-50 dark:bg-red-950/30">
            <h2 className="font-semibold text-red-600 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Liabilities & Equity
            </h2>
          </div>

          <div className="p-4 space-y-4">
            {/* Current Liabilities */}
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Current Liabilities</h3>
              <div className="space-y-1">
                {sampleData.liabilities.current.map((item) => (
                  <div key={item.name} className="flex justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm">{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">Total Current Liabilities</span>
                  <span className="font-bold">{formatCurrency(totalCurrentLiabilities)}</span>
                </div>
              </div>
            </div>

            {/* Non-Current Liabilities */}
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Non-Current Liabilities</h3>
              <div className="space-y-1">
                {sampleData.liabilities.nonCurrent.map((item) => (
                  <div key={item.name} className="flex justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm">{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">Total Non-Current Liabilities</span>
                  <span className="font-bold">{formatCurrency(totalNonCurrentLiabilities)}</span>
                </div>
              </div>
            </div>

            {/* Equity */}
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Equity</h3>
              <div className="space-y-1">
                {sampleData.equity.map((item) => (
                  <div key={item.name} className="flex justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm">{item.name}</span>
                    <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 px-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <span className="font-medium">Total Equity</span>
                  <span className="font-bold text-green-600">{formatCurrency(totalEquity)}</span>
                </div>
              </div>
            </div>

            {/* Total Liabilities & Equity */}
            <div className="flex justify-between py-3 px-4 bg-purple-100 dark:bg-purple-950 rounded-xl">
              <span className="font-bold text-purple-600">Total Liabilities & Equity</span>
              <span className="font-bold text-purple-600">{formatCurrency(totalLiabilitiesAndEquity)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
