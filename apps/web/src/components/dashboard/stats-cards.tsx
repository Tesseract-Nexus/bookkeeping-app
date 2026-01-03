'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon,
  trend = 'neutral',
  className,
  delay = 0,
}: StatCardProps) {
  const trendConfig = {
    up: {
      color: 'text-success',
      bg: 'bg-success/10',
      icon: TrendingUp,
    },
    down: {
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      icon: TrendingDown,
    },
    neutral: {
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      icon: TrendingUp,
    },
  };

  const config = trendConfig[trend];
  const TrendIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />

      <div className="flex items-start justify-between relative">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-sm font-medium',
                  config.color
                )}
              >
                {trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : trend === 'down' ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : null}
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('rounded-xl p-3', config.bg)}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Pre-configured stat cards for common metrics
interface DashboardStatsProps {
  revenue: number;
  revenueChange: number;
  invoices: number;
  invoicesChange: number;
  customers: number;
  customersChange: number;
  outstanding: number;
  outstandingChange: number;
}

export function DashboardStats({
  revenue,
  revenueChange,
  invoices,
  invoicesChange,
  customers,
  customersChange,
  outstanding,
  outstandingChange,
}: DashboardStatsProps) {
  const stats = [
    {
      title: 'Total Revenue',
      value: formatCurrency(revenue),
      change: revenueChange,
      trend: revenueChange >= 0 ? 'up' : 'down',
      icon: <IndianRupee className="h-5 w-5 text-success" />,
    },
    {
      title: 'Total Invoices',
      value: invoices.toLocaleString(),
      change: invoicesChange,
      trend: invoicesChange >= 0 ? 'up' : 'down',
      icon: <FileText className="h-5 w-5 text-primary" />,
    },
    {
      title: 'Total Customers',
      value: customers.toLocaleString(),
      change: customersChange,
      trend: customersChange >= 0 ? 'up' : 'down',
      icon: <Users className="h-5 w-5 text-purple-500" />,
    },
    {
      title: 'Outstanding',
      value: formatCurrency(outstanding),
      change: outstandingChange,
      trend: outstandingChange <= 0 ? 'up' : 'down', // Less outstanding is better
      icon: <DollarSign className="h-5 w-5 text-warning" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <StatCard
          key={stat.title}
          {...stat}
          trend={stat.trend as 'up' | 'down' | 'neutral'}
          delay={i * 0.1}
        />
      ))}
    </div>
  );
}

// Tax compliance card
interface TaxComplianceCardProps {
  gstFiled: boolean;
  tdsFiled: boolean;
  nextDueDate: string;
  pendingReturns: number;
}

export function TaxComplianceCard({
  gstFiled,
  tdsFiled,
  nextDueDate,
  pendingReturns,
}: TaxComplianceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl border bg-card p-6"
    >
      <h3 className="font-semibold mb-4">Tax Compliance Status</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">GSTR-3B (Current Month)</span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              gstFiled
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning-foreground'
            )}
          >
            {gstFiled ? 'Filed' : 'Pending'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">TDS Return</span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              tdsFiled
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning-foreground'
            )}
          >
            {tdsFiled ? 'Filed' : 'Pending'}
          </span>
        </div>
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Next Due Date</span>
            <span className="font-medium">{nextDueDate}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Pending Returns</span>
            <span className={cn(
              'font-medium',
              pendingReturns > 0 ? 'text-destructive' : 'text-success'
            )}>
              {pendingReturns}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
