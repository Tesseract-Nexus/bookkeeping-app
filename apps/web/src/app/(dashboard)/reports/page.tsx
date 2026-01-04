'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Wallet,
  Calendar,
  Download,
  ArrowRight,
} from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const reports: ReportCard[] = [
  {
    id: 'profit-loss',
    title: 'Profit & Loss',
    description: 'Income statement showing revenues, expenses, and net profit/loss',
    icon: TrendingUp,
    href: '/reports/profit-loss',
    color: 'bg-green-100 text-green-600',
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    description: 'Statement of financial position showing assets, liabilities, and equity',
    icon: BarChart3,
    href: '/reports/balance-sheet',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'cash-flow',
    title: 'Cash Flow',
    description: 'Track cash inflows and outflows from operations',
    icon: Wallet,
    href: '/reports/cash-flow',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'gst-summary',
    title: 'GST Summary',
    description: 'Summary of GST collected, paid, and liability for the period',
    icon: PieChart,
    href: '/reports/gst-summary',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'receivables-aging',
    title: 'Receivables Aging',
    description: 'Outstanding customer invoices by age buckets',
    icon: Calendar,
    href: '/reports/receivables-aging',
    color: 'bg-red-100 text-red-600',
  },
  {
    id: 'payables-aging',
    title: 'Payables Aging',
    description: 'Outstanding vendor bills by age buckets',
    icon: TrendingDown,
    href: '/reports/payables-aging',
    color: 'bg-yellow-100 text-yellow-600',
  },
];

function ReportCardComponent({ report }: { report: ReportCard }) {
  const Icon = report.icon;

  return (
    <Link
      href={report.href}
      className="group bg-card border rounded-lg p-6 hover:shadow-md transition-all hover:border-primary/50"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${report.color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            {report.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

export default function ReportsPage() {
  const { isLoading: authLoading } = useAuth();
  const [dateRange, setDateRange] = React.useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate financial statements and business reports
          </p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">From:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, startDate: e.target.value })
            }
            className="h-9 px-3 rounded-md border bg-background text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">To:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="h-9 px-3 rounded-md border bg-background text-sm"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm">
            This Month
          </Button>
          <Button variant="outline" size="sm">
            This Quarter
          </Button>
          <Button variant="outline" size="sm">
            This Year
          </Button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <ReportCardComponent key={report.id} report={report} />
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold mt-1 text-green-600">-</p>
          <p className="text-xs text-muted-foreground mt-1">
            For selected period
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold mt-1 text-red-600">-</p>
          <p className="text-xs text-muted-foreground mt-1">
            For selected period
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Net Profit</p>
          <p className="text-2xl font-bold mt-1">-</p>
          <p className="text-xs text-muted-foreground mt-1">
            For selected period
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">GST Liability</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">-</p>
          <p className="text-xs text-muted-foreground mt-1">
            For selected period
          </p>
        </div>
      </div>
    </div>
  );
}
