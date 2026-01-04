'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Receipt,
  FileText,
  Calculator,
  CreditCard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface TaxCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const taxModules: TaxCard[] = [
  {
    id: 'gstr-1',
    title: 'GSTR-1',
    description: 'Outward supplies return - details of sales',
    icon: ArrowUpFromLine,
    href: '/tax/gstr-1',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'gstr-3b',
    title: 'GSTR-3B',
    description: 'Monthly summary return with tax payment',
    icon: Receipt,
    href: '/tax/gstr-3b',
    color: 'bg-green-100 text-green-600',
  },
  {
    id: 'itc',
    title: 'Input Tax Credit',
    description: 'Track and manage ITC from purchases',
    icon: ArrowDownToLine,
    href: '/tax/itc',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'tds',
    title: 'TDS Management',
    description: 'Tax Deducted at Source tracking and certificates',
    icon: Calculator,
    href: '/tax/tds',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'tcs',
    title: 'TCS Management',
    description: 'Tax Collected at Source tracking',
    icon: CreditCard,
    href: '/tax/tcs',
    color: 'bg-red-100 text-red-600',
  },
  {
    id: 'e-invoice',
    title: 'E-Invoice',
    description: 'Generate and manage GST e-invoices',
    icon: FileText,
    href: '/tax/e-invoice',
    color: 'bg-indigo-100 text-indigo-600',
  },
];

interface FilingStatus {
  period: string;
  gstr1: 'filed' | 'pending' | 'overdue';
  gstr3b: 'filed' | 'pending' | 'overdue';
  dueDate: string;
}

const recentFilings: FilingStatus[] = [
  { period: 'December 2025', gstr1: 'pending', gstr3b: 'pending', dueDate: '2026-01-11' },
  { period: 'November 2025', gstr1: 'filed', gstr3b: 'filed', dueDate: '2025-12-20' },
  { period: 'October 2025', gstr1: 'filed', gstr3b: 'filed', dueDate: '2025-11-20' },
];

const statusConfig = {
  filed: { label: 'Filed', icon: CheckCircle, color: 'text-green-600' },
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-600' },
  overdue: { label: 'Overdue', icon: AlertCircle, color: 'text-red-600' },
};

export default function TaxManagementPage() {
  const { isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
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
          <h1 className="text-2xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground mt-1">
            GST returns, TDS/TCS, and tax compliance
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">GST Collected</p>
          <p className="text-2xl font-bold mt-1 text-green-600">-</p>
          <p className="text-xs text-muted-foreground mt-1">This month</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">GST Paid (ITC)</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">-</p>
          <p className="text-xs text-muted-foreground mt-1">This month</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Net GST Liability</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">-</p>
          <p className="text-xs text-muted-foreground mt-1">This month</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">TDS Deducted</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">-</p>
          <p className="text-xs text-muted-foreground mt-1">This month</p>
        </div>
      </div>

      {/* Filing Status */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Recent Filing Status</h2>
        </div>
        <div className="divide-y">
          {recentFilings.map((filing) => (
            <div key={filing.period} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{filing.period}</p>
                  <p className="text-sm text-muted-foreground">
                    Due: {new Date(filing.dueDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">GSTR-1</p>
                  <div className={`flex items-center gap-1 ${statusConfig[filing.gstr1].color}`}>
                    {React.createElement(statusConfig[filing.gstr1].icon, {
                      className: 'h-4 w-4',
                    })}
                    <span className="text-sm font-medium">
                      {statusConfig[filing.gstr1].label}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">GSTR-3B</p>
                  <div className={`flex items-center gap-1 ${statusConfig[filing.gstr3b].color}`}>
                    {React.createElement(statusConfig[filing.gstr3b].icon, {
                      className: 'h-4 w-4',
                    })}
                    <span className="text-sm font-medium">
                      {statusConfig[filing.gstr3b].label}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tax Modules */}
      <div>
        <h2 className="font-semibold mb-4">Tax Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {taxModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                href={module.href}
                className="group bg-card border rounded-lg p-5 hover:shadow-md transition-all hover:border-primary/50"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${module.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {module.description}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
