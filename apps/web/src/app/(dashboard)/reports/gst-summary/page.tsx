'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Calendar,
  Receipt,
  ArrowUpFromLine,
  ArrowDownToLine,
  Scale,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const sampleData = {
  output: {
    cgst: 42500,
    sgst: 42500,
    igst: 85000,
    cess: 2500,
  },
  input: {
    cgst: 28000,
    sgst: 28000,
    igst: 55000,
    cess: 1500,
  },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function GSTSummaryReportPage() {
  const { isLoading: authLoading } = useAuth();
  const [dateRange, setDateRange] = React.useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const totalOutputGST = sampleData.output.cgst + sampleData.output.sgst + sampleData.output.igst + sampleData.output.cess;
  const totalInputGST = sampleData.input.cgst + sampleData.input.sgst + sampleData.input.igst + sampleData.input.cess;

  const netCGST = sampleData.output.cgst - sampleData.input.cgst;
  const netSGST = sampleData.output.sgst - sampleData.input.sgst;
  const netIGST = sampleData.output.igst - sampleData.input.igst;
  const netCess = sampleData.output.cess - sampleData.input.cess;
  const netGSTPayable = totalOutputGST - totalInputGST;

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
          <Link href="/reports">
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">GST Summary</h1>
            <p className="text-muted-foreground">GST collected, paid, and net liability</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted transition-colors">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl animate-slide-up" style={{ animationDelay: '100ms' }}>
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">From:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="h-9 px-3 rounded-lg border bg-background text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">To:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="h-9 px-3 rounded-lg border bg-background text-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Output GST (Collected)', value: totalOutputGST, icon: ArrowUpFromLine, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-950' },
          { label: 'Input GST (ITC)', value: totalInputGST, icon: ArrowDownToLine, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-950' },
          { label: 'Net GST Payable', value: netGSTPayable, icon: Scale, color: netGSTPayable >= 0 ? 'text-orange-600' : 'text-green-600', bgColor: netGSTPayable >= 0 ? 'bg-orange-100 dark:bg-orange-950' : 'bg-green-100 dark:bg-green-950' },
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border rounded-xl p-5 hover:shadow-md transition-all animate-slide-up hover:-translate-y-1"
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {formatCurrency(card.value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* GST Breakdown Table */}
      <div className="bg-card border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            GST Breakdown by Type
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-4 font-semibold">Tax Type</th>
                <th className="text-right p-4 font-semibold text-green-600">Output GST</th>
                <th className="text-right p-4 font-semibold text-blue-600">Input GST (ITC)</th>
                <th className="text-right p-4 font-semibold text-orange-600">Net Payable</th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: 'CGST', output: sampleData.output.cgst, input: sampleData.input.cgst, net: netCGST },
                { type: 'SGST', output: sampleData.output.sgst, input: sampleData.input.sgst, net: netSGST },
                { type: 'IGST', output: sampleData.output.igst, input: sampleData.input.igst, net: netIGST },
                { type: 'Cess', output: sampleData.output.cess, input: sampleData.input.cess, net: netCess },
              ].map((row) => (
                <tr key={row.type} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-4 font-medium">{row.type}</td>
                  <td className="p-4 text-right text-green-600">{formatCurrency(row.output)}</td>
                  <td className="p-4 text-right text-blue-600">{formatCurrency(row.input)}</td>
                  <td className={`p-4 text-right font-medium ${row.net >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(row.net)}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/50 font-bold">
                <td className="p-4">Total</td>
                <td className="p-4 text-right text-green-600">{formatCurrency(totalOutputGST)}</td>
                <td className="p-4 text-right text-blue-600">{formatCurrency(totalInputGST)}</td>
                <td className={`p-4 text-right ${netGSTPayable >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(netGSTPayable)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <Link href="/tax/gstr-1" className="group bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold group-hover:text-primary transition-colors">File GSTR-1</h3>
              <p className="text-sm text-muted-foreground mt-1">Outward supplies return</p>
            </div>
            <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Prepare Return
            </Button>
          </div>
        </Link>

        <Link href="/tax/gstr-3b" className="group bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold group-hover:text-primary transition-colors">File GSTR-3B</h3>
              <p className="text-sm text-muted-foreground mt-1">Monthly summary return</p>
            </div>
            <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Prepare Return
            </Button>
          </div>
        </Link>
      </div>
    </div>
  );
}
