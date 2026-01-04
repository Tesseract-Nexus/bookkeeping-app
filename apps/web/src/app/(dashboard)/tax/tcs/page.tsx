'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  Calculator,
  FileText,
  Users,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface TCSEntry {
  id: string;
  buyer: string;
  pan: string;
  section: string;
  natureOfGoods: string;
  saleValue: number;
  tcsRate: number;
  tcsAmount: number;
  collectionDate: string;
  status: 'deposited' | 'pending';
}

const sampleData: TCSEntry[] = [
  { id: '1', buyer: 'Metro Traders', pan: 'AABCM1234H', section: '206C(1)', natureOfGoods: 'Scrap', saleValue: 500000, tcsRate: 1, tcsAmount: 5000, collectionDate: '2025-12-08', status: 'deposited' },
  { id: '2', buyer: 'City Minerals', pan: 'AAECI5678J', section: '206C(1)', natureOfGoods: 'Minerals', saleValue: 1200000, tcsRate: 1, tcsAmount: 12000, collectionDate: '2025-12-12', status: 'pending' },
  { id: '3', buyer: 'Forest Products Ltd', pan: 'AABCF9012K', section: '206C(1)', natureOfGoods: 'Timber', saleValue: 350000, tcsRate: 2.5, tcsAmount: 8750, collectionDate: '2025-12-18', status: 'pending' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function TCSPage() {
  const { isLoading: authLoading } = useAuth();
  const [selectedQuarter, setSelectedQuarter] = React.useState('Q3');

  const totalTCS = sampleData.reduce((sum, entry) => sum + entry.tcsAmount, 0);
  const depositedTCS = sampleData.filter(e => e.status === 'deposited').reduce((sum, e) => sum + e.tcsAmount, 0);
  const pendingTCS = sampleData.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.tcsAmount, 0);

  if (authLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <Link href="/tax">
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">TCS Management</h1>
            <p className="text-muted-foreground">Tax Collected at Source tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" />
            Sync
          </Button>
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add TCS Entry
          </Button>
        </div>
      </div>

      {/* Quarter Selection */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl animate-slide-up" style={{ animationDelay: '100ms' }}>
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Financial Year:</label>
          <select className="h-9 px-3 rounded-lg border bg-background text-sm">
            <option>2025-26</option>
            <option>2024-25</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Quarter:</label>
          <div className="flex gap-1">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
              <Button
                key={q}
                variant={selectedQuarter === q ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedQuarter(q)}
                className="transition-all"
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total TCS Collected', value: totalTCS, icon: Calculator, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950' },
          { label: 'TCS Deposited', value: depositedTCS, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
          { label: 'TCS Pending', value: pendingTCS, icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-950' },
          { label: 'Buyers', value: sampleData.length, icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-950', isCount: true },
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border rounded-xl p-4 hover:shadow-md transition-all animate-slide-up hover:-translate-y-1"
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>
                    {card.isCount ? card.value : formatCurrency(card.value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TCS Entries Table */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '350ms' }}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            TCS Entries
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-sm">
                <th className="text-left p-4 font-semibold">Buyer</th>
                <th className="text-left p-4 font-semibold">Section</th>
                <th className="text-left p-4 font-semibold">Nature of Goods</th>
                <th className="text-right p-4 font-semibold">Sale Value</th>
                <th className="text-right p-4 font-semibold">TCS Rate</th>
                <th className="text-right p-4 font-semibold">TCS Amount</th>
                <th className="text-center p-4 font-semibold">Status</th>
                <th className="text-center p-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((entry) => (
                <tr key={entry.id} className="border-b hover:bg-muted/50 transition-colors group">
                  <td className="p-4">
                    <div className="font-medium group-hover:text-primary transition-colors">{entry.buyer}</div>
                    <div className="text-xs text-muted-foreground font-mono">{entry.pan}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-muted rounded text-sm font-mono">{entry.section}</span>
                  </td>
                  <td className="p-4 text-muted-foreground">{entry.natureOfGoods}</td>
                  <td className="p-4 text-right font-medium">{formatCurrency(entry.saleValue)}</td>
                  <td className="p-4 text-right">{entry.tcsRate}%</td>
                  <td className="p-4 text-right font-bold">{formatCurrency(entry.tcsAmount)}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      entry.status === 'deposited'
                        ? 'bg-green-100 text-green-600 dark:bg-green-950'
                        : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950'
                    }`}>
                      {entry.status === 'deposited' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      {entry.status === 'deposited' ? 'Deposited' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <Button variant="ghost" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                      Form 27D
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-bold">
                <td className="p-4" colSpan={3}>Total</td>
                <td className="p-4 text-right">{formatCurrency(sampleData.reduce((sum, e) => sum + e.saleValue, 0))}</td>
                <td className="p-4"></td>
                <td className="p-4 text-right">{formatCurrency(totalTCS)}</td>
                <td className="p-4" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
          <h3 className="font-semibold group-hover:text-primary transition-colors">File TCS Return (27EQ)</h3>
          <p className="text-sm text-muted-foreground mt-1">Quarterly TCS return</p>
        </div>
        <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
          <h3 className="font-semibold group-hover:text-primary transition-colors">Generate Form 27D</h3>
          <p className="text-sm text-muted-foreground mt-1">TCS certificate for buyers</p>
        </div>
        <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
          <h3 className="font-semibold group-hover:text-primary transition-colors">Pay TCS via Challan</h3>
          <p className="text-sm text-muted-foreground mt-1">Generate challan for TCS deposit</p>
        </div>
      </div>
    </div>
  );
}
