'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Truck,
  FileText,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  MapPin,
  Package,
  Calendar,
  RefreshCw,
  X,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';

interface EWayBill {
  id: string;
  ewbNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  generatedDate: string;
  validUntil: string;
  status: 'active' | 'expired' | 'cancelled';
  supplyType: 'outward' | 'inward';
  documentType: 'invoice' | 'bill' | 'challan' | 'credit_note' | 'debit_note';
  fromGstin: string;
  fromAddress: string;
  fromState: string;
  toGstin: string;
  toAddress: string;
  toState: string;
  transporter: string;
  transporterId: string;
  transportMode: 'road' | 'rail' | 'air' | 'ship';
  vehicleNumber: string;
  distance: number;
  totalValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

interface GenerateEWayBillForm {
  invoiceId: string;
  invoiceNumber: string;
  supplyType: 'outward' | 'inward';
  documentType: string;
  fromGstin: string;
  fromAddress: string;
  fromState: string;
  toGstin: string;
  toAddress: string;
  toState: string;
  transporterId: string;
  transporterName: string;
  transportMode: 'road' | 'rail' | 'air' | 'ship';
  vehicleNumber: string;
  distance: number;
}

const statusConfig = {
  active: { label: 'Active', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  expired: { label: 'Expired', icon: Clock, color: 'text-orange-600 bg-orange-50' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50' },
};

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// Sample data for demo
const sampleEWayBills: EWayBill[] = [
  {
    id: '1',
    ewbNumber: '141000000001',
    invoiceNumber: 'INV-2025-0001',
    invoiceDate: '2025-12-15',
    generatedDate: '2025-12-15',
    validUntil: '2025-12-16',
    status: 'active',
    supplyType: 'outward',
    documentType: 'invoice',
    fromGstin: '29ABCDE1234F1ZH',
    fromAddress: '123 Industrial Area, Bangalore',
    fromState: 'Karnataka',
    toGstin: '27XYZAB5678G1ZI',
    toAddress: '456 Business Park, Mumbai',
    toState: 'Maharashtra',
    transporter: 'ABC Logistics Pvt Ltd',
    transporterId: '27LOGIS1234H1ZJ',
    transportMode: 'road',
    vehicleNumber: 'KA01AB1234',
    distance: 985,
    totalValue: 125000,
    cgst: 0,
    sgst: 0,
    igst: 22500,
    totalTax: 22500,
  },
  {
    id: '2',
    ewbNumber: '141000000002',
    invoiceNumber: 'INV-2025-0002',
    invoiceDate: '2025-12-10',
    generatedDate: '2025-12-10',
    validUntil: '2025-12-11',
    status: 'expired',
    supplyType: 'outward',
    documentType: 'invoice',
    fromGstin: '29ABCDE1234F1ZH',
    fromAddress: '123 Industrial Area, Bangalore',
    fromState: 'Karnataka',
    toGstin: '29PQRST9012K1ZL',
    toAddress: '789 Tech Hub, Mysore',
    toState: 'Karnataka',
    transporter: 'XYZ Transport Services',
    transporterId: '29TRANS5678L1ZM',
    transportMode: 'road',
    vehicleNumber: 'KA05CD5678',
    distance: 150,
    totalValue: 75000,
    cgst: 6750,
    sgst: 6750,
    igst: 0,
    totalTax: 13500,
  },
];

export default function EWayBillPage() {
  const { isLoading: authLoading } = useAuth();
  const [ewayBills, setEwayBills] = React.useState<EWayBill[]>(sampleEWayBills);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedBill, setSelectedBill] = React.useState<EWayBill | null>(null);
  const [formData, setFormData] = React.useState<GenerateEWayBillForm>({
    invoiceId: '',
    invoiceNumber: '',
    supplyType: 'outward',
    documentType: 'invoice',
    fromGstin: '',
    fromAddress: '',
    fromState: '',
    toGstin: '',
    toAddress: '',
    toState: '',
    transporterId: '',
    transporterName: '',
    transportMode: 'road',
    vehicleNumber: '',
    distance: 0,
  });

  const fetchEWayBills = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/tax/eway-bill?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data?.length > 0) {
        setEwayBills(data.data);
      }
    } catch {
      // Use sample data on error
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    fetchEWayBills();
  }, [fetchEWayBills]);

  const handleGenerateEWayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/tax/eway-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowGenerateModal(false);
        setFormData({
          invoiceId: '',
          invoiceNumber: '',
          supplyType: 'outward',
          documentType: 'invoice',
          fromGstin: '',
          fromAddress: '',
          fromState: '',
          toGstin: '',
          toAddress: '',
          toState: '',
          transporterId: '',
          transporterName: '',
          transportMode: 'road',
          vehicleNumber: '',
          distance: 0,
        });
        fetchEWayBills();
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEWayBill = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this E-Way Bill?')) return;

    try {
      const res = await fetch(`/api/tax/eway-bill/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by user' }),
      });

      if (res.ok) {
        fetchEWayBills();
      }
    } catch {
      // Handle error
    }
  };

  const filteredBills = ewayBills.filter((bill) => {
    const matchesSearch =
      bill.ewbNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.toAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tax">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">E-Way Bill</h1>
            <p className="text-muted-foreground mt-1">
              Generate and manage E-Way Bills for goods movement
            </p>
          </div>
        </div>
        <MotionButton onClick={() => setShowGenerateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate E-Way Bill
        </MotionButton>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">E-Way Bill Requirements</p>
          <p className="text-sm text-blue-700 mt-1">
            E-Way Bill is mandatory for movement of goods worth more than Rs. 50,000 (interstate and intrastate).
            Generate before goods dispatch and update vehicle details if changed during transit.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total E-Way Bills</p>
              <p className="text-2xl font-bold">{ewayBills.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {ewayBills.filter((b) => b.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expired</p>
              <p className="text-2xl font-bold text-orange-600">
                {ewayBills.filter((b) => b.status === 'expired').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">
                {ewayBills.filter((b) => b.status === 'cancelled').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by EWB number, invoice, destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border bg-background text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEWayBills}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* E-Way Bills List */}
      <div className="bg-card border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium text-sm">E-Way Bill</th>
                <th className="text-left p-4 font-medium text-sm">Invoice</th>
                <th className="text-left p-4 font-medium text-sm">Route</th>
                <th className="text-left p-4 font-medium text-sm">Transport</th>
                <th className="text-left p-4 font-medium text-sm">Value</th>
                <th className="text-left p-4 font-medium text-sm">Valid Until</th>
                <th className="text-left p-4 font-medium text-sm">Status</th>
                <th className="text-right p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="p-4">
                      <div className="h-12 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Truck className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No E-Way Bills found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGenerateModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Generate First E-Way Bill
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const StatusIcon = statusConfig[bill.status].icon;
                  return (
                    <tr key={bill.id} className="hover:bg-muted/30">
                      <td className="p-4">
                        <div>
                          <p className="font-medium font-mono">{bill.ewbNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            Generated: {formatDate(bill.generatedDate)}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{bill.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(bill.invoiceDate)}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{bill.fromState} → {bill.toState}</p>
                            <p className="text-xs text-muted-foreground">
                              {bill.distance} km
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm">{bill.vehicleNumber}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {bill.transportMode}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{formatCurrency(bill.totalValue)}</p>
                          <p className="text-xs text-muted-foreground">
                            Tax: {formatCurrency(bill.totalTax)}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{formatDate(bill.validUntil)}</p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[bill.status].color}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig[bill.status].label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setSelectedBill(bill);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          {bill.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleCancelEWayBill(bill.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate E-Way Bill Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Generate E-Way Bill</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowGenerateModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleGenerateEWayBill} className="p-4 space-y-6">
              {/* Document Details */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Document Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Supply Type</label>
                    <select
                      value={formData.supplyType}
                      onChange={(e) =>
                        setFormData({ ...formData, supplyType: e.target.value as 'outward' | 'inward' })
                      }
                      className="w-full h-9 px-3 mt-1 rounded-md border bg-background text-sm"
                    >
                      <option value="outward">Outward (Sales)</option>
                      <option value="inward">Inward (Purchase)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Document Type</label>
                    <select
                      value={formData.documentType}
                      onChange={(e) =>
                        setFormData({ ...formData, documentType: e.target.value })
                      }
                      className="w-full h-9 px-3 mt-1 rounded-md border bg-background text-sm"
                    >
                      <option value="invoice">Tax Invoice</option>
                      <option value="bill">Bill of Supply</option>
                      <option value="challan">Delivery Challan</option>
                      <option value="credit_note">Credit Note</option>
                      <option value="debit_note">Debit Note</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Invoice Number</label>
                    <Input
                      value={formData.invoiceNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, invoiceNumber: e.target.value })
                      }
                      placeholder="INV-2025-0001"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* From Details */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  From (Consignor)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">GSTIN</label>
                    <Input
                      value={formData.fromGstin}
                      onChange={(e) =>
                        setFormData({ ...formData, fromGstin: e.target.value.toUpperCase() })
                      }
                      placeholder="29ABCDE1234F1ZH"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <select
                      value={formData.fromState}
                      onChange={(e) =>
                        setFormData({ ...formData, fromState: e.target.value })
                      }
                      className="w-full h-9 px-3 mt-1 rounded-md border bg-background text-sm"
                      required
                    >
                      <option value="">Select State</option>
                      {indianStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      value={formData.fromAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, fromAddress: e.target.value })
                      }
                      placeholder="Full address with pincode"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* To Details */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  To (Consignee)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">GSTIN</label>
                    <Input
                      value={formData.toGstin}
                      onChange={(e) =>
                        setFormData({ ...formData, toGstin: e.target.value.toUpperCase() })
                      }
                      placeholder="27XYZAB5678G1ZI"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <select
                      value={formData.toState}
                      onChange={(e) =>
                        setFormData({ ...formData, toState: e.target.value })
                      }
                      className="w-full h-9 px-3 mt-1 rounded-md border bg-background text-sm"
                      required
                    >
                      <option value="">Select State</option>
                      {indianStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      value={formData.toAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, toAddress: e.target.value })
                      }
                      placeholder="Full address with pincode"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Transport Details */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Transport Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Transporter Name</label>
                    <Input
                      value={formData.transporterName}
                      onChange={(e) =>
                        setFormData({ ...formData, transporterName: e.target.value })
                      }
                      placeholder="ABC Logistics Pvt Ltd"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Transporter ID (GSTIN)</label>
                    <Input
                      value={formData.transporterId}
                      onChange={(e) =>
                        setFormData({ ...formData, transporterId: e.target.value.toUpperCase() })
                      }
                      placeholder="27LOGIS1234H1ZJ"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Transport Mode</label>
                    <select
                      value={formData.transportMode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          transportMode: e.target.value as 'road' | 'rail' | 'air' | 'ship',
                        })
                      }
                      className="w-full h-9 px-3 mt-1 rounded-md border bg-background text-sm"
                    >
                      <option value="road">Road</option>
                      <option value="rail">Rail</option>
                      <option value="air">Air</option>
                      <option value="ship">Ship</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vehicle Number</label>
                    <Input
                      value={formData.vehicleNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })
                      }
                      placeholder="KA01AB1234"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Distance (km)</label>
                    <Input
                      type="number"
                      value={formData.distance || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, distance: parseInt(e.target.value) || 0 })
                      }
                      placeholder="100"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGenerateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Generating...' : 'Generate E-Way Bill'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E-Way Bill Details Modal */}
      {showDetailsModal && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">E-Way Bill Details</h2>
                <p className="text-sm text-muted-foreground font-mono">
                  {selectedBill.ewbNumber}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedBill(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[selectedBill.status].color}`}
                >
                  {React.createElement(statusConfig[selectedBill.status].icon, {
                    className: 'h-4 w-4',
                  })}
                  {statusConfig[selectedBill.status].label}
                </span>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valid Until</p>
                  <p className="font-medium">{formatDate(selectedBill.validUntil)}</p>
                </div>
              </div>

              {/* Invoice Details */}
              <div>
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">
                  INVOICE DETAILS
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Number</p>
                      <p className="font-medium">{selectedBill.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Date</p>
                      <p className="font-medium">{formatDate(selectedBill.invoiceDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Supply Type</p>
                      <p className="font-medium capitalize">{selectedBill.supplyType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Document Type</p>
                      <p className="font-medium capitalize">
                        {selectedBill.documentType.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Route Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2 text-sm text-muted-foreground">FROM</h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="font-mono text-sm">{selectedBill.fromGstin}</p>
                    <p className="mt-2 text-sm">{selectedBill.fromAddress}</p>
                    <p className="text-sm text-muted-foreground">{selectedBill.fromState}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2 text-sm text-muted-foreground">TO</h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="font-mono text-sm">{selectedBill.toGstin}</p>
                    <p className="mt-2 text-sm">{selectedBill.toAddress}</p>
                    <p className="text-sm text-muted-foreground">{selectedBill.toState}</p>
                  </div>
                </div>
              </div>

              {/* Transport Details */}
              <div>
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">
                  TRANSPORT DETAILS
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Transporter</p>
                      <p className="font-medium">{selectedBill.transporter}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transporter ID</p>
                      <p className="font-mono text-sm">{selectedBill.transporterId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vehicle Number</p>
                      <p className="font-medium">{selectedBill.vehicleNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mode / Distance</p>
                      <p className="font-medium capitalize">
                        {selectedBill.transportMode} / {selectedBill.distance} km
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Value Details */}
              <div>
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">
                  VALUE DETAILS
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-medium">{formatCurrency(selectedBill.totalValue)}</span>
                    </div>
                    {selectedBill.cgst > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CGST</span>
                        <span>{formatCurrency(selectedBill.cgst)}</span>
                      </div>
                    )}
                    {selectedBill.sgst > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SGST</span>
                        <span>{formatCurrency(selectedBill.sgst)}</span>
                      </div>
                    )}
                    {selectedBill.igst > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IGST</span>
                        <span>{formatCurrency(selectedBill.igst)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">Total Tax</span>
                      <span className="font-medium">{formatCurrency(selectedBill.totalTax)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {selectedBill.status === 'active' && (
                  <>
                    <Button variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Extend Validity
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleCancelEWayBill(selectedBill.id);
                        setShowDetailsModal(false);
                        setSelectedBill(null);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel E-Way Bill
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
