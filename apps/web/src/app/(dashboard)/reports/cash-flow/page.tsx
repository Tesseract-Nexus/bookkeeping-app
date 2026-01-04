'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  TrendingUp,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const sampleData = {
  operating: [
    { name: 'Net Profit', amount: 367000 },
    { name: 'Add: Depreciation', amount: 18000 },
    { name: 'Increase in Accounts Payable', amount: 25000 },
    { name: 'Decrease in Inventory', amount: 15000 },
    { name: 'Increase in Accounts Receivable', amount: -45000 },
    { name: 'Increase in Prepaid Expenses', amount: -5000 },
  ],
  investing: [
    { name: 'Purchase of Equipment', amount: -120000 },
    { name: 'Sale of Investments', amount: 50000 },
    { name: 'Purchase of Intangibles', amount: -25000 },
  ],
  financing: [
    { name: 'Loan Repayment', amount: -75000 },
    { name: 'Dividend Paid', amount: -50000 },
    { name: 'New Loan Received', amount: 100000 },
  ],
  openingBalance: 385000,
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function CashFlowReportPage() {
  const { isLoading: authLoading } = useAuth();
  const [dateRange, setDateRange] = React.useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const operatingCashFlow = sampleData.operating.reduce((sum, item) => sum + item.amount, 0);
  const investingCashFlow = sampleData.investing.reduce((sum, item) => sum + item.amount, 0);
  const financingCashFlow = sampleData.financing.reduce((sum, item) => sum + item.amount, 0);
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
  const closingBalance = sampleData.openingBalance + netCashFlow;

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
            <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
            <p className="text-muted-foreground">Track cash inflows and outflows</p>
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
          { label: 'Operating Activities', value: operatingCashFlow, icon: TrendingUp, positive: operatingCashFlow >= 0 },
          { label: 'Investing Activities', value: investingCashFlow, icon: ArrowDownToLine, positive: investingCashFlow >= 0 },
          { label: 'Financing Activities', value: financingCashFlow, icon: ArrowUpFromLine, positive: financingCashFlow >= 0 },
          { label: 'Net Cash Flow', value: netCashFlow, icon: Wallet, positive: netCashFlow >= 0 },
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border rounded-xl p-4 hover:shadow-md transition-all animate-slide-up hover:-translate-y-1"
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.positive ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
                  <Icon className={`h-5 w-5 ${card.positive ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-xl font-bold ${card.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(card.value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cash Flow Statement */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '350ms' }}>
        {/* Opening Balance */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Opening Cash Balance</span>
            <span className="text-xl font-bold">{formatCurrency(sampleData.openingBalance)}</span>
          </div>
        </div>

        {/* Operating Activities */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cash Flow from Operating Activities
          </h3>
          <div className="space-y-1">
            {sampleData.operating.map((item) => (
              <div key={item.name} className="flex justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">{item.name}</span>
                <span className={`font-medium ${item.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-3 px-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg font-semibold mt-2">
              <span>Net Cash from Operating Activities</span>
              <span className={operatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(operatingCashFlow)}
              </span>
            </div>
          </div>
        </div>

        {/* Investing Activities */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-purple-600 mb-3 flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Cash Flow from Investing Activities
          </h3>
          <div className="space-y-1">
            {sampleData.investing.map((item) => (
              <div key={item.name} className="flex justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">{item.name}</span>
                <span className={`font-medium ${item.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-3 px-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg font-semibold mt-2">
              <span>Net Cash from Investing Activities</span>
              <span className={investingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(investingCashFlow)}
              </span>
            </div>
          </div>
        </div>

        {/* Financing Activities */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-orange-600 mb-3 flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5" />
            Cash Flow from Financing Activities
          </h3>
          <div className="space-y-1">
            {sampleData.financing.map((item) => (
              <div key={item.name} className="flex justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">{item.name}</span>
                <span className={`font-medium ${item.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-3 px-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg font-semibold mt-2">
              <span>Net Cash from Financing Activities</span>
              <span className={financingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(financingCashFlow)}
              </span>
            </div>
          </div>
        </div>

        {/* Net Change & Closing Balance */}
        <div className="p-4 bg-muted/30 space-y-3">
          <div className="flex justify-between py-3 px-4 bg-card border rounded-xl">
            <span className="font-semibold">Net Change in Cash</span>
            <span className={`font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netCashFlow)}
            </span>
          </div>
          <div className={`flex justify-between py-4 px-4 rounded-xl ${closingBalance >= 0 ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
            <span className="text-lg font-bold">Closing Cash Balance</span>
            <span className={`text-lg font-bold ${closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(closingBalance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
