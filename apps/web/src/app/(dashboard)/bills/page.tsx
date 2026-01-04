'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  FileText,
  Calendar,
  Building,
  Eye,
  Edit,
  Trash2,
  CreditCard,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';

interface BillItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

interface Bill {
  id: string;
  bill_number: string;
  vendor_id: string;
  vendor_name: string;
  vendor_gstin: string;
  bill_date: string;
  due_date: string;
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  items: BillItem[];
  notes: string;
  created_at: string;
}

interface Vendor {
  id: string;
  name: string;
  gstin: string;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  partial: { label: 'Partial', color: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
};

function BillFormModal({
  isOpen,
  onClose,
  bill,
  vendors,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  bill?: Bill | null;
  vendors: Vendor[];
  onSave: (data: Partial<Bill>) => void;
}) {
  const [formData, setFormData] = React.useState({
    vendor_id: bill?.vendor_id || '',
    bill_number: bill?.bill_number || '',
    bill_date: bill?.bill_date || new Date().toISOString().split('T')[0],
    due_date: bill?.due_date || '',
    notes: bill?.notes || '',
    items: bill?.items || [{ description: '', quantity: 1, unit_price: 0, tax_rate: 18, amount: 0 }],
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const taxAmount = formData.items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate) / 100,
      0
    );
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0, tax_rate: 18, amount: 0 }],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const totals = calculateTotals();
    await onSave({
      ...formData,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total_amount: totals.total,
    });
    setIsSaving(false);
  };

  if (!isOpen) return null;

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {bill ? 'Edit Bill' : 'New Bill'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vendor *</label>
              <select
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background"
                required
              >
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.gstin && `(${v.gstin})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bill Number *</label>
              <Input
                value={formData.bill_number}
                onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                placeholder="BILL-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bill Date *</label>
              <Input
                type="date"
                value={formData.bill_date}
                onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date *</label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Items</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-2 px-3">Description</th>
                    <th className="text-right py-2 px-3 w-20">Qty</th>
                    <th className="text-right py-2 px-3 w-28">Price</th>
                    <th className="text-right py-2 px-3 w-20">Tax %</th>
                    <th className="text-right py-2 px-3 w-28">Amount</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="py-2 px-3">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                          min="0"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={item.tax_rate}
                          onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value))}
                          className="h-8 w-full px-2 rounded border bg-background text-right"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(item.quantity * item.unit_price)}
                      </td>
                      <td className="py-2 px-3">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 hover:bg-red-50 rounded text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-mono">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST:</span>
                <span className="font-mono">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total:</span>
                <span className="font-mono">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full h-20 px-3 py-2 rounded-md border bg-background resize-none"
              placeholder="Additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <MotionButton type="submit" isLoading={isSaving}>
              <Check className="h-4 w-4 mr-2" />
              {bill ? 'Update Bill' : 'Create Bill'}
            </MotionButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({
  isOpen,
  onClose,
  bill,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onSave: (data: { amount: number; payment_date: string; payment_method: string; reference: string }) => void;
}) {
  const [formData, setFormData] = React.useState({
    amount: bill?.balance_due || 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank',
    reference: '',
  });
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (bill) {
      setFormData((prev) => ({ ...prev, amount: bill.balance_due }));
    }
  }, [bill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  if (!isOpen || !bill) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Record Payment</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Bill</p>
            <p className="font-semibold">{bill.bill_number}</p>
            <p className="text-sm text-muted-foreground mt-2">Balance Due</p>
            <p className="text-xl font-bold text-orange-600">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.balance_due)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Amount *</label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              max={bill.balance_due}
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Date *</label>
            <Input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Method *</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full h-10 px-3 rounded-md border bg-background"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reference / Transaction ID</label>
            <Input
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="UTR / Cheque No / Reference"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <MotionButton type="submit" isLoading={isSaving}>
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </MotionButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BillsPage() {
  const { isLoading: authLoading } = useAuth();
  const [bills, setBills] = React.useState<Bill[]>([]);
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('');
  const [showBillForm, setShowBillForm] = React.useState(false);
  const [editingBill, setEditingBill] = React.useState<Bill | null>(null);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [payingBill, setPayingBill] = React.useState<Bill | null>(null);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const [billsRes, vendorsRes] = await Promise.all([
          fetch('/api/bills'),
          fetch('/api/vendors'),
        ]);

        const billsData = await billsRes.json();
        const vendorsData = await vendorsRes.json();

        if (billsData.success) setBills(billsData.data || []);
        if (vendorsData.success) setVendors(vendorsData.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  const handleSaveBill = async (data: Partial<Bill>) => {
    try {
      const response = await fetch(editingBill ? `/api/bills/${editingBill.id}` : '/api/bills', {
        method: editingBill ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Refresh bills list
        const billsRes = await fetch('/api/bills');
        const billsData = await billsRes.json();
        if (billsData.success) setBills(billsData.data || []);
        setShowBillForm(false);
        setEditingBill(null);
      }
    } catch (error) {
      console.error('Failed to save bill:', error);
    }
  };

  const handleRecordPayment = async (data: { amount: number; payment_date: string; payment_method: string; reference: string }) => {
    if (!payingBill) return;

    try {
      const response = await fetch(`/api/bills/${payingBill.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Refresh bills list
        const billsRes = await fetch('/api/bills');
        const billsData = await billsRes.json();
        if (billsData.success) setBills(billsData.data || []);
        setShowPaymentModal(false);
        setPayingBill(null);
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  const filteredBills = React.useMemo(() => {
    let filtered = bills;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.bill_number.toLowerCase().includes(query) ||
          b.vendor_name?.toLowerCase().includes(query)
      );
    }
    if (selectedStatus) {
      filtered = filtered.filter((b) => b.status === selectedStatus);
    }
    return filtered;
  }, [bills, searchQuery, selectedStatus]);

  const stats = React.useMemo(() => {
    const total = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const paid = bills.reduce((sum, b) => sum + (b.amount_paid || 0), 0);
    const pending = bills.filter((b) => b.status === 'pending' || b.status === 'partial').length;
    const overdue = bills.filter((b) => b.status === 'overdue').length;
    return { total, paid, outstanding: total - paid, pending, overdue };
  }, [bills]);

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
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
          <h1 className="text-2xl font-bold">Bills & Expenses</h1>
          <p className="text-muted-foreground mt-1">
            Manage vendor bills and track payments
          </p>
        </div>
        <MotionButton onClick={() => setShowBillForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Bill
        </MotionButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Billed</p>
          <p className="text-2xl font-bold mt-1">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.total)}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.paid)}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.outstanding)}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</p>
          <p className="text-xs text-muted-foreground">bills</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
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

      {/* Bills Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-3 px-4 font-medium">Bill #</th>
              <th className="text-left py-3 px-4 font-medium">Vendor</th>
              <th className="text-left py-3 px-4 font-medium">Date</th>
              <th className="text-left py-3 px-4 font-medium">Due Date</th>
              <th className="text-right py-3 px-4 font-medium">Amount</th>
              <th className="text-right py-3 px-4 font-medium">Balance</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-right py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bills found</p>
                  <p className="text-sm mt-1">Create your first bill to get started</p>
                </td>
              </tr>
            ) : (
              filteredBills.map((bill) => (
                <tr key={bill.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm">{bill.bill_number}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{bill.vendor_name}</p>
                        {bill.vendor_gstin && (
                          <p className="text-xs text-muted-foreground font-mono">{bill.vendor_gstin}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(bill.bill_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {new Date(bill.due_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-orange-600">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bill.balance_due || 0)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[bill.status]?.color}`}>
                      {statusConfig[bill.status]?.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 hover:bg-muted rounded" title="View">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-muted rounded"
                        title="Edit"
                        onClick={() => {
                          setEditingBill(bill);
                          setShowBillForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {bill.balance_due > 0 && (
                        <button
                          className="p-1.5 hover:bg-green-50 rounded"
                          title="Record Payment"
                          onClick={() => {
                            setPayingBill(bill);
                            setShowPaymentModal(true);
                          }}
                        >
                          <CreditCard className="h-4 w-4 text-green-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <BillFormModal
        isOpen={showBillForm}
        onClose={() => {
          setShowBillForm(false);
          setEditingBill(null);
        }}
        bill={editingBill}
        vendors={vendors}
        onSave={handleSaveBill}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPayingBill(null);
        }}
        bill={payingBill}
        onSave={handleRecordPayment}
      />
    </div>
  );
}
