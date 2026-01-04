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
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Link2,
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
  last_synced_at: string | null;
  is_active: boolean;
}

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  is_reconciled: boolean;
}

const accountTypeConfig = {
  savings: { label: 'Savings', color: 'bg-green-100 text-green-700' },
  current: { label: 'Current', color: 'bg-blue-100 text-blue-700' },
  cash: { label: 'Cash', color: 'bg-yellow-100 text-yellow-700' },
};

export default function BankingPage() {
  const { isLoading: authLoading } = useAuth();
  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedAccount, setSelectedAccount] = React.useState<string | null>(null);
  const [transactions, setTransactions] = React.useState<BankTransaction[]>([]);

  React.useEffect(() => {
    async function fetchBankAccounts() {
      try {
        const response = await fetch('/api/banking');
        const data = await response.json();

        if (data.success) {
          setAccounts(data.data || []);
          if (data.data?.length > 0) {
            setSelectedAccount(data.data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch bank accounts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      fetchBankAccounts();
    }
  }, [authLoading]);

  const totalBalance = React.useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  }, [accounts]);

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
          <h1 className="text-2xl font-bold">Banking</h1>
          <p className="text-muted-foreground mt-1">
            Manage bank accounts and reconcile transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Link2 className="h-4 w-4 mr-2" />
            Connect Bank
          </Button>
          <MotionButton>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </MotionButton>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <p className="text-blue-100">Total Balance</p>
        <p className="text-4xl font-bold mt-2">
          {new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
          }).format(totalBalance)}
        </p>
        <p className="text-blue-200 text-sm mt-2">
          Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Bank Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No bank accounts added</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first bank account to start tracking
          </p>
          <Button className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Bank Account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`bg-card border rounded-lg p-5 cursor-pointer transition-all ${
                selectedAccount === account.id
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:shadow-md'
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
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    accountTypeConfig[account.account_type]?.color || 'bg-gray-100'
                  }`}
                >
                  {accountTypeConfig[account.account_type]?.label || account.account_type}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Account Number</p>
                <p className="font-mono text-sm">
                  ****{account.account_number.slice(-4)}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-xl font-bold">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(account.current_balance || 0)}
                </p>
              </div>

              {account.last_synced_at && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3" />
                  Last synced:{' '}
                  {new Date(account.last_synced_at).toLocaleDateString('en-IN')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Transactions */}
      {selectedAccount && (
        <div className="border rounded-lg">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent Transactions</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync
              </Button>
              <Button variant="outline" size="sm">
                Import
              </Button>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm mt-1">
                Import bank statement or sync to see transactions
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((txn) => (
                <div key={txn.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        txn.type === 'credit'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {txn.type === 'credit' ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{txn.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(txn.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p
                        className={`font-mono font-medium ${
                          txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {txn.type === 'credit' ? '+' : '-'}
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(txn.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bal:{' '}
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(txn.balance)}
                      </p>
                    </div>
                    {txn.is_reconciled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
