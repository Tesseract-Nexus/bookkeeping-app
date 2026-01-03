'use client';

import { motion } from 'framer-motion';
import { Plus, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/header';
import {
  DashboardStats,
  TaxComplianceCard,
  RevenueChart,
  InvoiceStatusChart,
  CashFlowChart,
  RecentActivity,
  RecentInvoices,
  TopCustomers,
} from '@/components/dashboard';

// Mock data for demonstration
const statsData = {
  revenue: 1250000,
  revenueChange: 12.5,
  invoices: 156,
  invoicesChange: 8.2,
  customers: 48,
  customersChange: 15.3,
  outstanding: 320000,
  outstandingChange: -5.4,
};

const revenueData = [
  { month: 'Jan', revenue: 180000, expenses: 120000 },
  { month: 'Feb', revenue: 220000, expenses: 140000 },
  { month: 'Mar', revenue: 195000, expenses: 130000 },
  { month: 'Apr', revenue: 280000, expenses: 160000 },
  { month: 'May', revenue: 250000, expenses: 155000 },
  { month: 'Jun', revenue: 310000, expenses: 180000 },
];

const invoiceStatusData = [
  { name: 'Paid', value: 85, color: 'hsl(142, 76%, 36%)' },
  { name: 'Pending', value: 42, color: 'hsl(38, 92%, 50%)' },
  { name: 'Overdue', value: 18, color: 'hsl(0, 84%, 60%)' },
  { name: 'Draft', value: 11, color: 'hsl(220, 14%, 46%)' },
];

const cashFlowData = [
  { date: 'Week 1', inflow: 280000, outflow: 180000, balance: 100000 },
  { date: 'Week 2', inflow: 320000, outflow: 200000, balance: 220000 },
  { date: 'Week 3', inflow: 250000, outflow: 220000, balance: 250000 },
  { date: 'Week 4', inflow: 400000, outflow: 180000, balance: 470000 },
];

const recentActivities = [
  {
    id: '1',
    type: 'invoice_paid' as const,
    title: 'Invoice #INV-2024-089 Paid',
    description: 'ABC Industries Ltd paid the full amount',
    amount: 85000,
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    user: { name: 'Rahul Sharma' },
  },
  {
    id: '2',
    type: 'customer_added' as const,
    title: 'New Customer Added',
    description: 'XYZ Enterprises was added to your customer list',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    user: { name: 'Priya Patel' },
  },
  {
    id: '3',
    type: 'invoice_created' as const,
    title: 'Invoice #INV-2024-090 Created',
    description: 'New invoice for Global Tech Solutions',
    amount: 125000,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    user: { name: 'Rahul Sharma' },
  },
  {
    id: '4',
    type: 'expense_recorded' as const,
    title: 'Office Supplies Expense',
    description: 'Recorded office supplies purchase',
    amount: 15000,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    user: { name: 'Admin' },
  },
  {
    id: '5',
    type: 'invoice_overdue' as const,
    title: 'Invoice #INV-2024-075 Overdue',
    description: 'Invoice for Kumar Trading is now 7 days overdue',
    amount: 45000,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
];

const recentInvoices = [
  {
    id: '1',
    number: 'INV-2024-090',
    customer: { name: 'Global Tech Solutions' },
    amount: 125000,
    status: 'pending' as const,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  },
  {
    id: '2',
    number: 'INV-2024-089',
    customer: { name: 'ABC Industries Ltd' },
    amount: 85000,
    status: 'paid' as const,
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: '3',
    number: 'INV-2024-088',
    customer: { name: 'XYZ Enterprises' },
    amount: 62000,
    status: 'pending' as const,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
  },
  {
    id: '4',
    number: 'INV-2024-087',
    customer: { name: 'Kumar Trading Co.' },
    amount: 45000,
    status: 'overdue' as const,
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
  },
  {
    id: '5',
    number: 'INV-2024-091',
    customer: { name: 'Sharma & Associates' },
    amount: 95000,
    status: 'draft' as const,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  },
];

const topCustomers = [
  { id: '1', name: 'Global Tech Solutions', totalRevenue: 580000, invoiceCount: 12, trend: 'up' as const },
  { id: '2', name: 'ABC Industries Ltd', totalRevenue: 425000, invoiceCount: 8, trend: 'up' as const },
  { id: '3', name: 'XYZ Enterprises', totalRevenue: 280000, invoiceCount: 6, trend: 'neutral' as const },
  { id: '4', name: 'Kumar Trading Co.', totalRevenue: 195000, invoiceCount: 5, trend: 'down' as const },
  { id: '5', name: 'Sharma & Associates', totalRevenue: 150000, invoiceCount: 4, trend: 'up' as const },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of your business."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden sm:flex">
              <Calendar className="mr-2 h-4 w-4" />
              This Month
            </Button>
            <Button variant="outline" className="hidden sm:flex">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <DashboardStats {...statsData} />

      {/* Main Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueChart data={revenueData} className="lg:col-span-2" />
        <InvoiceStatusChart data={invoiceStatusData} />
      </div>

      {/* Secondary Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CashFlowChart data={cashFlowData} className="lg:col-span-2" />
        <TaxComplianceCard
          gstFiled={true}
          tdsFiled={false}
          nextDueDate="20th Jan 2025"
          pendingReturns={1}
        />
      </div>

      {/* Activity and Lists Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RecentActivity activities={recentActivities} className="lg:col-span-1" />
        <RecentInvoices invoices={recentInvoices} className="lg:col-span-1" />
        <TopCustomers customers={topCustomers} className="lg:col-span-1" />
      </div>
    </div>
  );
}
