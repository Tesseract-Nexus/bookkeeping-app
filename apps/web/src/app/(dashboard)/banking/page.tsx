'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  Building,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle,
  Clock,
  Link2,
  X,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: 'savings' | 'current' | 'cash';
  current_balance: number;
  statement_balance: number;
  last_synced_at: string | null;
  is_active: boolean;
}

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  is_reconciled: boolean;
  matched_transaction_id: string | null;
  matched_type: 'invoice' | 'bill' | 'expense' | null;
  category: string;
}

interface MatchSuggestion {
  id: string;
  type: 'invoice' | 'bill' | 'expense';
  number: string;
  party_name: string;
  amount: number;
  date: string;
  confidence: number;
}

const accountTypeConfig = {
  savings: { label: 'Savings', color: 'bg-green-100 text-green-700' },
  current: { label: 'Current', color: 'bg-blue-100 text-blue-700' },
  cash: { label: 'Cash', color: 'bg-yellow-100 text-yellow-700' },
};

function AddAccountModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<BankAccount>) => void;
}) {
  const [formData, setFormData] = React.useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_type: 'current' as 'savings' | 'current' | 'cash',
    current_balance: 0,
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Bank Account</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Account Name *</label>
            <Input
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="e.g., HDFC Current Account"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bank Name *</label>
            <Input
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="e.g., HDFC Bank"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Account Number *</label>
              <Input
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="1234567890"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IFSC Code *</label>
              <Input
                value={formData.ifsc_code}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                placeholder="HDFC0001234"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Account Type *</label>
            <select
              value={formData.account_type}
              onChange={(e) => setFormData({ ...formData, account_type: e.target.value as 'savings' | 'current' | 'cash' })}
              className="w-full h-10 px-3 rounded-md border bg-background"
              required
            >
              <option value="current">Current Account</option>
              <option value="savings">Savings Account</option>
              <option value="cash">Cash Account</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Opening Balance</label>
            <Input
              type="number"
              value={formData.current_balance}
              onChange={(e) => setFormData({ ...formData, current_balance: parseFloat(e.target.value) || 0 })}
              step="0.01"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <MotionButton type="submit" isLoading={isSaving}>
              <Check className="h-4 w-4 mr-2" />
              Add Account
            </MotionButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportStatementModal({
  isOpen,
  onClose,
  accountId,
  onImport,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onImport: (file: File, format: string) => void;
}) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [format, setFormat] = React.useState('csv');
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsImporting(true);
    await onImport(selectedFile, format);
    setIsImporting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import Bank Statement</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">File Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full h-10 px-3 rounded-md border bg-background"
            >
              <option value="csv">CSV (Excel compatible)</option>
              <option value="ofx">OFX (Open Financial Exchange)</option>
              <option value="qif">QIF (Quicken Interchange Format)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Statement File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.ofx,.qif"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    CSV, OFX, or QIF files
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium">CSV Format Requirements:</p>
            <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
              <li>Date column (DD/MM/YYYY or YYYY-MM-DD)</li>
              <li>Description/Narration column</li>
              <li>Debit and Credit columns (or single Amount column)</li>
              <li>Balance column (optional)</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <MotionButton type="submit" isLoading={isImporting} disabled={!selectedFile}>
              <Upload className="h-4 w-4 mr-2" />
              Import Statement
            </MotionButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReconciliationPanel({
  transaction,
  suggestions,
  onMatch,
  onDismiss,
}: {
  transaction: BankTransaction;
  suggestions: MatchSuggestion[];
  onMatch: (txnId: string, matchId: string, matchType: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-yellow-800">Match this transaction</p>
          <p className="text-sm text-yellow-700 mt-1">
            {transaction.description} - {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(transaction.amount)}
          </p>

          {suggestions.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-yellow-600 font-medium">Suggested matches:</p>
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 capitalize">
                        {suggestion.type}
                      </span>
                      <span className="font-medium">{suggestion.number}</span>
                      <span className="text-xs text-green-600">
                        {suggestion.confidence}% match
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {suggestion.party_name} •{' '}
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(suggestion.amount)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onMatch(transaction.id, suggestion.id, suggestion.type)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Match
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-yellow-600 mt-2">
              No matching invoices or bills found
            </p>
          )}

          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={onDismiss}>
              Skip
            </Button>
            <Button size="sm" variant="outline">
              Create Expense
            </Button>
            <Button size="sm" variant="outline">
              Add to Journal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BankingPage() {
  const { isLoading: authLoading } = useAuth();
  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedAccount, setSelectedAccount] = React.useState<string | null>(null);
  const [transactions, setTransactions] = React.useState<BankTransaction[]>([]);
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'unreconciled' | 'reconciled'>('all');
  const [reconcileId, setReconcileId] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<MatchSuggestion[]>([]);

  // Sample data for demo
  const sampleTransactions: BankTransaction[] = [
    {
      id: '1',
      date: '2026-01-03',
      description: 'NEFT-ACME CORP-REF123',
      reference: 'REF123',
      type: 'credit',
      amount: 150000,
      balance: 850000,
      is_reconciled: true,
      matched_transaction_id: 'inv-001',
      matched_type: 'invoice',
      category: 'Sales',
    },
    {
      id: '2',
      date: '2026-01-02',
      description: 'UPI-OFFICE SUPPLIES-UTR456',
      reference: 'UTR456',
      type: 'debit',
      amount: 5600,
      balance: 700000,
      is_reconciled: false,
      matched_transaction_id: null,
      matched_type: null,
      category: '',
    },
    {
      id: '3',
      date: '2026-01-02',
      description: 'IMPS-VENDOR PAYMENT-XYZ789',
      reference: 'XYZ789',
      type: 'debit',
      amount: 45000,
      balance: 705600,
      is_reconciled: false,
      matched_transaction_id: null,
      matched_type: null,
      category: '',
    },
    {
      id: '4',
      date: '2026-01-01',
      description: 'NEFT-CUSTOMER PMT-ABC111',
      reference: 'ABC111',
      type: 'credit',
      amount: 75000,
      balance: 750600,
      is_reconciled: true,
      matched_transaction_id: 'inv-002',
      matched_type: 'invoice',
      category: 'Sales',
    },
  ];

  const sampleSuggestions: MatchSuggestion[] = [
    {
      id: 'bill-001',
      type: 'bill',
      number: 'BILL-2026-001',
      party_name: 'Office Supplies Ltd',
      amount: 5600,
      date: '2026-01-01',
      confidence: 95,
    },
  ];

  React.useEffect(() => {
    async function fetchBankAccounts() {
      try {
        const response = await fetch('/api/banking');
        const data = await response.json();

        if (data.success && data.data?.length > 0) {
          setAccounts(data.data);
          setSelectedAccount(data.data[0].id);
        } else {
          // Use sample data for demo
          setAccounts([
            {
              id: '1',
              account_name: 'HDFC Current Account',
              bank_name: 'HDFC Bank',
              account_number: '50100123456789',
              ifsc_code: 'HDFC0001234',
              account_type: 'current',
              current_balance: 850000,
              statement_balance: 850000,
              last_synced_at: '2026-01-04T10:00:00Z',
              is_active: true,
            },
            {
              id: '2',
              account_name: 'ICICI Savings',
              bank_name: 'ICICI Bank',
              account_number: '00123456789',
              ifsc_code: 'ICIC0001234',
              account_type: 'savings',
              current_balance: 125000,
              statement_balance: 125000,
              last_synced_at: null,
              is_active: true,
            },
          ]);
          setSelectedAccount('1');
          setTransactions(sampleTransactions);
        }
      } catch (error) {
        console.error('Failed to fetch bank accounts:', error);
        // Use sample data
        setAccounts([
          {
            id: '1',
            account_name: 'HDFC Current Account',
            bank_name: 'HDFC Bank',
            account_number: '50100123456789',
            ifsc_code: 'HDFC0001234',
            account_type: 'current',
            current_balance: 850000,
            statement_balance: 850000,
            last_synced_at: '2026-01-04T10:00:00Z',
            is_active: true,
          },
        ]);
        setSelectedAccount('1');
        setTransactions(sampleTransactions);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      fetchBankAccounts();
    }
  }, [authLoading]);

  const handleAddAccount = async (data: Partial<BankAccount>) => {
    try {
      const response = await fetch('/api/banking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAccounts([...accounts, result.data]);
        }
      }
    } catch (error) {
      console.error('Failed to add account:', error);
    }
  };

  const handleImport = async (file: File, format: string) => {
    // In real implementation, this would upload the file and process it
    console.log('Importing file:', file.name, 'Format:', format);
    // After import, refresh transactions
    setTransactions(sampleTransactions);
  };

  const handleMatch = (txnId: string, matchId: string, matchType: string) => {
    setTransactions(
      transactions.map((t) =>
        t.id === txnId
          ? { ...t, is_reconciled: true, matched_transaction_id: matchId, matched_type: matchType as 'invoice' | 'bill' | 'expense' }
          : t
      )
    );
    setReconcileId(null);
  };

  const totalBalance = React.useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  }, [accounts]);

  const filteredTransactions = React.useMemo(() => {
    if (filterStatus === 'all') return transactions;
    if (filterStatus === 'reconciled') return transactions.filter((t) => t.is_reconciled);
    return transactions.filter((t) => !t.is_reconciled);
  }, [transactions, filterStatus]);

  const unreconciledCount = transactions.filter((t) => !t.is_reconciled).length;

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
          <h1 className="text-2xl font-bold">Banking & Reconciliation</h1>
          <p className="text-muted-foreground mt-1">
            Manage bank accounts, import statements, and reconcile transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Statement
          </Button>
          <MotionButton onClick={() => setShowAddAccount(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </MotionButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 text-white">
          <p className="text-blue-100 text-sm">Total Balance</p>
          <p className="text-2xl font-bold mt-1">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalBalance)}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Accounts</p>
          <p className="text-2xl font-bold mt-1">{accounts.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Transactions</p>
          <p className="text-2xl font-bold mt-1">{transactions.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">To Reconcile</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{unreconciledCount}</p>
        </div>
      </div>

      {/* Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <div
            key={account.id}
            className={`bg-card border rounded-lg p-5 cursor-pointer transition-all ${
              selectedAccount === account.id ? 'ring-2 ring-primary border-primary' : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedAccount(account.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">{account.account_name}</h3>
                  <p className="text-sm text-muted-foreground">{account.bank_name}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${accountTypeConfig[account.account_type]?.color}`}>
                {accountTypeConfig[account.account_type]?.label}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Book Balance</p>
                <p className="font-mono font-medium">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(account.current_balance || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statement Balance</p>
                <p className="font-mono font-medium">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(account.statement_balance || 0)}
                </p>
              </div>
            </div>

            {account.last_synced_at && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                Last synced: {new Date(account.last_synced_at).toLocaleDateString('en-IN')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Transactions */}
      {selectedAccount && (
        <div className="border rounded-lg overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold">Transactions</h2>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1 rounded text-sm ${filterStatus === 'all' ? 'bg-background shadow' : ''}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('unreconciled')}
                  className={`px-3 py-1 rounded text-sm ${filterStatus === 'unreconciled' ? 'bg-background shadow' : ''}`}
                >
                  To Reconcile ({unreconciledCount})
                </button>
                <button
                  onClick={() => setFilterStatus('reconciled')}
                  className={`px-3 py-1 rounded text-sm ${filterStatus === 'reconciled' ? 'bg-background shadow' : ''}`}
                >
                  Reconciled
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync
              </Button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found</p>
              <p className="text-sm mt-1">Import a bank statement to get started</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTransactions.map((txn) => (
                <React.Fragment key={txn.id}>
                  <div
                    className={`p-4 flex items-center justify-between hover:bg-muted/30 transition-colors ${
                      reconcileId === txn.id ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          txn.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {txn.type === 'credit' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{txn.description}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {txn.reference && <span className="font-mono text-xs">Ref: {txn.reference}</span>}
                          {txn.matched_type && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 capitalize">
                              {txn.matched_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-mono font-medium ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.type === 'credit' ? '+' : '-'}
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(txn.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bal: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(txn.balance)}
                        </p>
                      </div>
                      {txn.is_reconciled ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <button
                          onClick={() => {
                            setReconcileId(reconcileId === txn.id ? null : txn.id);
                            setSuggestions(sampleSuggestions);
                          }}
                          className="p-2 hover:bg-yellow-100 rounded-full"
                          title="Reconcile"
                        >
                          <Clock className="h-5 w-5 text-yellow-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  {reconcileId === txn.id && (
                    <ReconciliationPanel
                      transaction={txn}
                      suggestions={suggestions}
                      onMatch={handleMatch}
                      onDismiss={() => setReconcileId(null)}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddAccountModal isOpen={showAddAccount} onClose={() => setShowAddAccount(false)} onSave={handleAddAccount} />
      <ImportStatementModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        accountId={selectedAccount || ''}
        onImport={handleImport}
      />
    </div>
  );
}
