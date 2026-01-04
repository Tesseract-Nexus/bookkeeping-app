'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  FileText,
  Grid,
  List,
} from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  billing_address_line1: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  current_balance: number;
  is_active: boolean;
  created_at: string;
}

export default function VendorsPage() {
  const { isLoading: authLoading } = useAuth();
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('list');

  React.useEffect(() => {
    async function fetchVendors() {
      try {
        const response = await fetch('/api/vendors');
        const data = await response.json();

        if (data.success) {
          setVendors(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      fetchVendors();
    }
  }, [authLoading]);

  const filteredVendors = React.useMemo(() => {
    if (!searchQuery) return vendors;
    const query = searchQuery.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.email?.toLowerCase().includes(query) ||
        v.gstin?.toLowerCase().includes(query)
    );
  }, [vendors, searchQuery]);

  const stats = React.useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter((v) => v.is_active).length;
    const totalPayable = vendors.reduce((sum, v) => sum + (v.current_balance || 0), 0);
    return { total, active, totalPayable };
  }, [vendors]);

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-muted-foreground mt-1">
            Manage your suppliers and vendor relationships
          </p>
        </div>
        <MotionButton>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </MotionButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Vendors</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Payable</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            }).format(stats.totalPayable)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 border rounded-md p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-muted' : ''}`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-muted' : ''}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Vendors */}
      {filteredVendors.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No vendors found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first vendor to get started
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{vendor.name}</h3>
                    {vendor.gstin && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {vendor.gstin}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    vendor.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {vendor.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {vendor.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.billing_city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {vendor.billing_city}, {vendor.billing_state}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-mono font-medium text-orange-600">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    }).format(vendor.current_balance || 0)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-muted rounded">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="p-1.5 hover:bg-muted rounded">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Vendor</th>
                <th className="text-left py-3 px-4 font-medium">Contact</th>
                <th className="text-left py-3 px-4 font-medium">GSTIN</th>
                <th className="text-left py-3 px-4 font-medium">Location</th>
                <th className="text-right py-3 px-4 font-medium">Balance</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-orange-600" />
                      </div>
                      <span className="font-medium">{vendor.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <p>{vendor.email}</p>
                      <p className="text-muted-foreground">{vendor.phone}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm">{vendor.gstin || '-'}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {vendor.billing_city ? `${vendor.billing_city}, ${vendor.billing_state}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-orange-600">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    }).format(vendor.current_balance || 0)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        vendor.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 hover:bg-muted rounded">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 hover:bg-muted rounded">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 hover:bg-muted rounded">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
