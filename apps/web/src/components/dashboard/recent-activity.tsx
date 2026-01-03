'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Users,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

// Recent activity types
type ActivityType = 'invoice_created' | 'invoice_paid' | 'invoice_overdue' | 'customer_added' | 'expense_recorded';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  amount?: number;
  timestamp: Date;
  user?: { name: string; avatar?: string };
}

interface RecentActivityProps {
  activities: Activity[];
  className?: string;
}

const activityConfig: Record<ActivityType, { icon: React.ElementType; color: string; bgColor: string }> = {
  invoice_created: {
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  invoice_paid: {
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  invoice_overdue: {
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  customer_added: {
    icon: Users,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  expense_recorded: {
    icon: CreditCard,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
};

export function RecentActivity({ activities, className }: RecentActivityProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className={cn('', className)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary">
            View All
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const config = activityConfig[activity.type];
                const Icon = config.icon;

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-start gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn('rounded-xl p-2.5', config.bgColor)}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        {activity.amount && (
                          <span className="text-sm font-semibold whitespace-nowrap">
                            {formatCurrency(activity.amount)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                        {activity.user && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              by {activity.user.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Recent invoices list
interface Invoice {
  id: string;
  number: string;
  customer: { name: string; avatar?: string };
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  dueDate: Date;
}

interface RecentInvoicesProps {
  invoices: Invoice[];
  className?: string;
}

export function RecentInvoices({ invoices, className }: RecentInvoicesProps) {
  const statusConfig = {
    paid: { label: 'Paid', variant: 'paid' as const },
    pending: { label: 'Pending', variant: 'pending' as const },
    overdue: { label: 'Overdue', variant: 'overdue' as const },
    draft: { label: 'Draft', variant: 'draft' as const },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className={cn('', className)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary">
            View All
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.map((invoice, index) => {
              const status = statusConfig[invoice.status];

              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <UserAvatar
                    name={invoice.customer.name}
                    src={invoice.customer.avatar}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{invoice.number}</span>
                      <Badge variant={status.variant} size="sm">
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {invoice.customer.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(invoice.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due {formatRelativeTime(invoice.dueDate)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Top customers list
interface TopCustomer {
  id: string;
  name: string;
  avatar?: string;
  totalRevenue: number;
  invoiceCount: number;
  trend: 'up' | 'down' | 'neutral';
}

interface TopCustomersProps {
  customers: TopCustomer[];
  className?: string;
}

export function TopCustomers({ customers, className }: TopCustomersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className={cn('', className)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Top Customers</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary">
            View All
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.map((customer, index) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-4"
              >
                <div className="text-sm font-medium text-muted-foreground w-6">
                  #{index + 1}
                </div>
                <UserAvatar name={customer.name} src={customer.avatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.invoiceCount} invoices
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(customer.totalRevenue)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
