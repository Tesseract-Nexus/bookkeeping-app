'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Building2,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  subtype: string;
  parent_id: string | null;
  current_balance: number;
  is_active: boolean;
  children?: Account[];
}

const accountTypeConfig = {
  asset: { label: 'Assets', icon: Wallet, color: 'text-blue-600 bg-blue-50' },
  liability: { label: 'Liabilities', icon: CreditCard, color: 'text-red-600 bg-red-50' },
  equity: { label: 'Equity', icon: Building2, color: 'text-purple-600 bg-purple-50' },
  income: { label: 'Income', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
  expense: { label: 'Expenses', icon: TrendingDown, color: 'text-orange-600 bg-orange-50' },
};

function AccountRow({ account, level = 0 }: { account: Account; level?: number }) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const hasChildren = account.children && account.children.length > 0;
  const config = accountTypeConfig[account.type];
  const Icon = config.icon;

  return (
    <>
      <tr className="border-b hover:bg-muted/50 transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
            {hasChildren ? (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mr-2 p-1 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-6 mr-2" />
            )}
            <span className="font-mono text-sm text-muted-foreground mr-3">
              {account.code}
            </span>
            <span className={`p-1.5 rounded mr-2 ${config.color}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="font-medium">{account.name}</span>
          </div>
        </td>
        <td className="py-3 px-4">
          <span className="capitalize text-sm text-muted-foreground">
            {account.type}
          </span>
        </td>
        <td className="py-3 px-4">
          <span className="text-sm text-muted-foreground capitalize">
            {account.subtype?.replace(/_/g, ' ')}
          </span>
        </td>
        <td className="py-3 px-4 text-right font-mono">
          <span className={account.current_balance < 0 ? 'text-red-600' : ''}>
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(account.current_balance || 0)}
          </span>
        </td>
        <td className="py-3 px-4">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              account.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {account.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center justify-end gap-1">
            <button className="p-1.5 hover:bg-muted rounded">
              <Edit className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="p-1.5 hover:bg-muted rounded">
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded &&
        account.children?.map((child) => (
          <AccountRow key={child.id} account={child} level={level + 1} />
        ))}
    </>
  );
}

export default function ChartOfAccountsPage() {
  const { isLoading: authLoading } = useAuth();
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<string>('');

  React.useEffect(() => {
    async function fetchAccounts() {
      try {
        const params = new URLSearchParams();
        if (selectedType) params.set('type', selectedType);

        const response = await fetch(`/api/accounts?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          // Build tree structure from flat list
          const accountMap = new Map<string, Account>();
          const rootAccounts: Account[] = [];

          data.data.forEach((acc: Account) => {
            accountMap.set(acc.id, { ...acc, children: [] });
          });

          data.data.forEach((acc: Account) => {
            const account = accountMap.get(acc.id)!;
            if (acc.parent_id && accountMap.has(acc.parent_id)) {
              accountMap.get(acc.parent_id)!.children!.push(account);
            } else {
              rootAccounts.push(account);
            }
          });

          setAccounts(rootAccounts);
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      fetchAccounts();
    }
  }, [authLoading, selectedType]);

  const filteredAccounts = React.useMemo(() => {
    if (!searchQuery) return accounts;

    const query = searchQuery.toLowerCase();
    const filterAccount = (account: Account): Account | null => {
      const matches =
        account.name.toLowerCase().includes(query) ||
        account.code.toLowerCase().includes(query);

      const filteredChildren = account.children
        ?.map(filterAccount)
        .filter(Boolean) as Account[];

      if (matches || (filteredChildren && filteredChildren.length > 0)) {
        return { ...account, children: filteredChildren };
      }
      return null;
    };

    return accounts.map(filterAccount).filter(Boolean) as Account[];
  }, [accounts, searchQuery]);

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
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your accounting structure and ledger accounts
          </p>
        </div>
        <MotionButton>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </MotionButton>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedType === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('')}
          >
            All
          </Button>
          {Object.entries(accountTypeConfig).map(([type, config]) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type)}
            >
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-3 px-4 font-medium">Account</th>
              <th className="text-left py-3 px-4 font-medium">Type</th>
              <th className="text-left py-3 px-4 font-medium">Subtype</th>
              <th className="text-right py-3 px-4 font-medium">Balance</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-right py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  No accounts found. Create your first account to get started.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
