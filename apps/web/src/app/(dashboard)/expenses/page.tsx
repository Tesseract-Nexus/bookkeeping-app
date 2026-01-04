'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Receipt,
  Calendar,
  CreditCard,
  TrendingDown,
  Upload,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  vendor: string;
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'reimbursable';
  receipt: boolean;
}

const sampleExpenses: Expense[] = [
  { id: '1', date: '2025-12-28', description: 'Office Supplies', category: 'Office Expenses', vendor: 'Staples', amount: 2500, paymentMethod: 'Credit Card', status: 'paid', receipt: true },
  { id: '2', date: '2025-12-27', description: 'Team Lunch', category: 'Meals & Entertainment', vendor: 'Restaurant ABC', amount: 3200, paymentMethod: 'Cash', status: 'reimbursable', receipt: true },
  { id: '3', date: '2025-12-26', description: 'Software Subscription', category: 'Software & IT', vendor: 'Adobe Inc', amount: 15000, paymentMethod: 'Bank Transfer', status: 'paid', receipt: true },
  { id: '4', date: '2025-12-25', description: 'Travel - Client Meeting', category: 'Travel', vendor: 'Uber', amount: 850, paymentMethod: 'Credit Card', status: 'paid', receipt: false },
  { id: '5', date: '2025-12-24', description: 'Internet Bill', category: 'Utilities', vendor: 'Airtel', amount: 1299, paymentMethod: 'Auto Debit', status: 'pending', receipt: true },
  { id: '6', date: '2025-12-23', description: 'Marketing Materials', category: 'Marketing', vendor: 'PrintHub', amount: 8500, paymentMethod: 'Bank Transfer', status: 'paid', receipt: true },
];

const categories = [
  { name: 'All Categories', value: '' },
  { name: 'Office Expenses', value: 'office', color: 'bg-blue-100 text-blue-700' },
  { name: 'Travel', value: 'travel', color: 'bg-green-100 text-green-700' },
  { name: 'Meals & Entertainment', value: 'meals', color: 'bg-orange-100 text-orange-700' },
  { name: 'Software & IT', value: 'software', color: 'bg-purple-100 text-purple-700' },
  { name: 'Utilities', value: 'utilities', color: 'bg-yellow-100 text-yellow-700' },
  { name: 'Marketing', value: 'marketing', color: 'bg-pink-100 text-pink-700' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getCategoryColor = (category: string) => {
  const cat = categories.find(c => c.name === category);
  return cat?.color || 'bg-gray-100 text-gray-700';
};

const statusStyles = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  reimbursable: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
};

export default function ExpensesPage() {
  const { isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [dateRange, setDateRange] = React.useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const totalExpenses = sampleExpenses.reduce((sum, e) => sum + e.amount, 0);
  const paidExpenses = sampleExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = sampleExpenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const reimbursableExpenses = sampleExpenses.filter(e => e.status === 'reimbursable').reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = sampleExpenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || expense.category.toLowerCase().includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  if (authLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track and manage your business expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Expenses', value: totalExpenses, icon: TrendingDown, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950' },
          { label: 'Paid', value: paidExpenses, icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
          { label: 'Pending', value: pendingExpenses, icon: Calendar, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950' },
          { label: 'Reimbursable', value: reimbursableExpenses, icon: Receipt, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-950' },
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border rounded-xl p-4 hover:shadow-md transition-all animate-slide-up hover:-translate-y-1"
              style={{ animationDelay: `${100 + index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border bg-background text-sm"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="h-8 px-2 rounded border bg-background text-sm"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="h-8 px-2 rounded border bg-background text-sm"
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-sm">
                <th className="text-left p-4 font-semibold">Date</th>
                <th className="text-left p-4 font-semibold">Description</th>
                <th className="text-left p-4 font-semibold">Category</th>
                <th className="text-left p-4 font-semibold">Vendor</th>
                <th className="text-right p-4 font-semibold">Amount</th>
                <th className="text-center p-4 font-semibold">Status</th>
                <th className="text-center p-4 font-semibold">Receipt</th>
                <th className="text-center p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense, index) => (
                <tr
                  key={expense.id}
                  className="border-b hover:bg-muted/50 transition-colors group"
                  style={{ animationDelay: `${450 + index * 30}ms` }}
                >
                  <td className="p-4 text-muted-foreground">
                    {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-4">
                    <span className="font-medium group-hover:text-primary transition-colors">{expense.description}</span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                      <Tag className="h-3 w-3" />
                      {expense.category}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{expense.vendor}</td>
                  <td className="p-4 text-right font-bold">{formatCurrency(expense.amount)}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[expense.status]}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {expense.receipt ? (
                      <Button variant="ghost" size="icon-sm" className="hover:text-primary">
                        <FileText className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-primary">
                        <Upload className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon-sm" className="hover:text-primary">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-bold">
                <td className="p-4" colSpan={4}>Total ({filteredExpenses.length} expenses)</td>
                <td className="p-4 text-right">{formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}</td>
                <td className="p-4" colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '550ms' }}>
        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Expense by Category</h3>
          <div className="space-y-3">
            {categories.slice(1).map((cat) => {
              const catTotal = sampleExpenses
                .filter(e => e.category === cat.name)
                .reduce((sum, e) => sum + e.amount, 0);
              const percentage = (catTotal / totalExpenses) * 100;
              return (
                <div key={cat.value} className="group cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm group-hover:text-primary transition-colors">{cat.name}</span>
                    <span className="text-sm font-medium">{formatCurrency(catTotal)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all group-hover:opacity-80 ${cat.color?.replace('text', 'bg').replace('-100', '-500').replace('-700', '-500')}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Scan Receipt', icon: Upload, desc: 'Upload and scan receipts' },
              { label: 'Recurring', icon: Calendar, desc: 'Set up recurring expenses' },
              { label: 'Categories', icon: Tag, desc: 'Manage expense categories' },
              { label: 'Reports', icon: FileText, desc: 'Generate expense reports' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.label}
                  className="p-3 border rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="font-medium mt-2 group-hover:text-primary transition-colors">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
