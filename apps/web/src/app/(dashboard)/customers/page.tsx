'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building2,
  Users,
  FileText,
  IndianRupee,
  Grid3X3,
  List,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar, AvatarGroup } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, MotionCard } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatCurrency } from '@/lib/utils';

// Mock customer data
const mockCustomers = [
  {
    id: '1',
    name: 'Global Tech Solutions',
    email: 'accounts@globaltech.com',
    phone: '+91 98765 43210',
    gstin: '29AABCU9603R1ZM',
    address: 'Bangalore, Karnataka',
    type: 'business' as const,
    status: 'active' as const,
    totalRevenue: 580000,
    invoiceCount: 12,
    outstandingAmount: 125000,
  },
  {
    id: '2',
    name: 'ABC Industries Ltd',
    email: 'billing@abcindustries.in',
    phone: '+91 98765 43211',
    gstin: '27AADCB2230M1ZL',
    address: 'Mumbai, Maharashtra',
    type: 'business' as const,
    status: 'active' as const,
    totalRevenue: 425000,
    invoiceCount: 8,
    outstandingAmount: 85000,
  },
  {
    id: '3',
    name: 'XYZ Enterprises',
    email: 'finance@xyz.co.in',
    phone: '+91 98765 43212',
    gstin: '07AAGFX9082L1ZI',
    address: 'New Delhi, Delhi',
    type: 'business' as const,
    status: 'active' as const,
    totalRevenue: 280000,
    invoiceCount: 6,
    outstandingAmount: 62000,
  },
  {
    id: '4',
    name: 'Kumar Trading Co.',
    email: 'kumar@trading.com',
    phone: '+91 98765 43213',
    gstin: '33AAACK7362R1ZW',
    address: 'Chennai, Tamil Nadu',
    type: 'business' as const,
    status: 'inactive' as const,
    totalRevenue: 195000,
    invoiceCount: 5,
    outstandingAmount: 45000,
  },
  {
    id: '5',
    name: 'Sharma & Associates',
    email: 'accounts@sharma.in',
    phone: '+91 98765 43214',
    gstin: '06AADCS8412K1Z5',
    address: 'Gurugram, Haryana',
    type: 'business' as const,
    status: 'active' as const,
    totalRevenue: 150000,
    invoiceCount: 4,
    outstandingAmount: 0,
  },
  {
    id: '6',
    name: 'Rahul Verma',
    email: 'rahul.verma@email.com',
    phone: '+91 98765 43215',
    address: 'Pune, Maharashtra',
    type: 'individual' as const,
    status: 'active' as const,
    totalRevenue: 45000,
    invoiceCount: 2,
    outstandingAmount: 15000,
  },
];

type ViewMode = 'grid' | 'list';

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');

  const filteredCustomers = mockCustomers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesType = typeFilter === 'all' || customer.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Summary stats
  const totalCustomers = mockCustomers.length;
  const activeCustomers = mockCustomers.filter((c) => c.status === 'active').length;
  const totalRevenue = mockCustomers.reduce((acc, c) => acc + c.totalRevenue, 0);
  const totalOutstanding = mockCustomers.reduce((acc, c) => acc + c.outstandingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Customers"
        description="Manage your customer relationships"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Customers' }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-success/10 p-3">
                <Building2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeCustomers}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/10 p-3">
                <IndianRupee className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-warning/10 p-3">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            className="sm:w-[280px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-9">
              <TabsTrigger value="grid" className="px-3">
                <Grid3X3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list" className="px-3">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.div>

      {/* Customer Grid/List View */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer, index) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={customer.name} size="lg" />
                    <div>
                      <h3 className="font-semibold">{customer.name}</h3>
                      <Badge
                        variant={customer.status === 'active' ? 'active' : 'inactive'}
                        size="sm"
                      >
                        {customer.status}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        View Invoices
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{customer.address}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="font-semibold">{formatCurrency(customer.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className={cn(
                      'font-semibold',
                      customer.outstandingAmount > 0 ? 'text-warning' : 'text-success'
                    )}>
                      {formatCurrency(customer.outstandingAmount)}
                    </p>
                  </div>
                </div>

                {customer.gstin && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">GSTIN</p>
                    <p className="font-mono text-sm">{customer.gstin}</p>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableEmpty
                  icon={<Users className="h-8 w-8 text-muted-foreground" />}
                  title="No customers found"
                  description="Try adjusting your search or filters"
                />
              ) : (
                filteredCustomers.map((customer, index) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={customer.name} size="sm" />
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.address}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{customer.email}</p>
                        <p className="text-muted-foreground">{customer.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {customer.gstin || '-'}
                      </span>
                    </TableCell>
                    <TableCell>{customer.invoiceCount}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(customer.totalRevenue)}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'font-semibold',
                        customer.outstandingAmount > 0 ? 'text-warning' : 'text-success'
                      )}>
                        {formatCurrency(customer.outstandingAmount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.status === 'active' ? 'active' : 'inactive'}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </motion.div>
      )}
    </div>
  );
}
