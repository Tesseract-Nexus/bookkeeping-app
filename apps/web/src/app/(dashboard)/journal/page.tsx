'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  Filter,
  FileText,
  ArrowUpDown,
  Eye,
  XCircle,
  Calendar,
} from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';

interface TransactionLine {
  id: string;
  account_id: string;
  account_name: string;
  account_code: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

interface Transaction {
  id: string;
  transaction_number: string;
  transaction_date: string;
  type: 'sale' | 'purchase' | 'receipt' | 'payment' | 'expense' | 'journal' | 'transfer';
  status: 'draft' | 'posted' | 'void';
  description: string;
  reference: string;
  total_amount: number;
  lines: TransactionLine[];
  created_at: string;
}

const typeConfig = {
  sale: { label: 'Sale', color: 'bg-green-100 text-green-800' },
  purchase: { label: 'Purchase', color: 'bg-blue-100 text-blue-800' },
  receipt: { label: 'Receipt', color: 'bg-emerald-100 text-emerald-800' },
  payment: { label: 'Payment', color: 'bg-orange-100 text-orange-800' },
  expense: { label: 'Expense', color: 'bg-red-100 text-red-800' },
  journal: { label: 'Journal', color: 'bg-purple-100 text-purple-800' },
  transfer: { label: 'Transfer', color: 'bg-gray-100 text-gray-800' },
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
  posted: { label: 'Posted', color: 'bg-green-100 text-green-800' },
  void: { label: 'Void', color: 'bg-red-100 text-red-800' },
};

export default function JournalEntriesPage() {
  const { isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<string>('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchTransactions() {
      try {
        const params = new URLSearchParams();
        if (selectedType) params.set('type', selectedType);
        if (selectedStatus) params.set('status', selectedStatus);

        const response = await fetch(`/api/transactions?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setTransactions(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      fetchTransactions();
    }
  }, [authLoading, selectedType, selectedStatus]);

  const filteredTransactions = React.useMemo(() => {
    if (!searchQuery) return transactions;
    const query = searchQuery.toLowerCase();
    return transactions.filter(
      (t) =>
        t.transaction_number.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.reference?.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Journal Entries</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all accounting transactions
          </p>
        </div>
        <MotionButton>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </MotionButton>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="h-10 px-3 rounded-md border bg-background text-sm"
        >
          <option value="">All Types</option>
          {Object.entries(typeConfig).map(([type, config]) => (
            <option key={type} value={type}>
              {config.label}
            </option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-10 px-3 rounded-md border bg-background text-sm"
        >
          <option value="">All Status</option>
          {Object.entries(statusConfig).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions List */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-3 px-4 font-medium">Entry #</th>
              <th className="text-left py-3 px-4 font-medium">Date</th>
              <th className="text-left py-3 px-4 font-medium">Type</th>
              <th className="text-left py-3 px-4 font-medium">Description</th>
              <th className="text-right py-3 px-4 font-medium">Amount</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-right py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No journal entries found</p>
                  <p className="text-sm mt-1">Create your first entry to get started</p>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <React.Fragment key={transaction.id}>
                  <tr
                    className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedId(expandedId === transaction.id ? null : transaction.id)
                    }
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm">
                        {transaction.transaction_number}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(transaction.transaction_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          typeConfig[transaction.type]?.color || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {typeConfig[transaction.type]?.label || transaction.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium truncate max-w-xs">
                        {transaction.description}
                      </p>
                      {transaction.reference && (
                        <p className="text-xs text-muted-foreground">
                          Ref: {transaction.reference}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      }).format(transaction.total_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusConfig[transaction.status]?.color
                        }`}
                      >
                        {statusConfig[transaction.status]?.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 hover:bg-muted rounded">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                        {transaction.status !== 'void' && (
                          <button className="p-1.5 hover:bg-muted rounded">
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === transaction.id && transaction.lines && (
                    <tr>
                      <td colSpan={7} className="bg-muted/30 p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="text-left py-2 px-3">Account</th>
                              <th className="text-left py-2 px-3">Description</th>
                              <th className="text-right py-2 px-3">Debit</th>
                              <th className="text-right py-2 px-3">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transaction.lines.map((line) => (
                              <tr key={line.id} className="border-b border-muted">
                                <td className="py-2 px-3">
                                  <span className="font-mono text-xs text-muted-foreground mr-2">
                                    {line.account_code}
                                  </span>
                                  {line.account_name}
                                </td>
                                <td className="py-2 px-3 text-muted-foreground">
                                  {line.description}
                                </td>
                                <td className="py-2 px-3 text-right font-mono">
                                  {line.debit_amount > 0
                                    ? new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                      }).format(line.debit_amount)
                                    : '-'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono">
                                  {line.credit_amount > 0
                                    ? new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                      }).format(line.credit_amount)
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
