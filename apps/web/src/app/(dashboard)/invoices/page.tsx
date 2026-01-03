'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Send,
  Copy,
  FileText,
  Search,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/header';
import { Button, MotionButton } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
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
  DropdownMenuLabel,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-picker';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

// Mock invoice data
const mockInvoices = [
  {
    id: '1',
    number: 'INV-2024-001',
    customer: { name: 'Global Tech Solutions', email: 'accounts@globaltech.com' },
    amount: 125000,
    taxAmount: 22500,
    totalAmount: 147500,
    status: 'paid' as const,
    issueDate: new Date('2024-12-15'),
    dueDate: new Date('2025-01-15'),
    paidDate: new Date('2025-01-02'),
  },
  {
    id: '2',
    number: 'INV-2024-002',
    customer: { name: 'ABC Industries Ltd', email: 'billing@abcindustries.in' },
    amount: 85000,
    taxAmount: 15300,
    totalAmount: 100300,
    status: 'pending' as const,
    issueDate: new Date('2024-12-20'),
    dueDate: new Date('2025-01-20'),
  },
  {
    id: '3',
    number: 'INV-2024-003',
    customer: { name: 'XYZ Enterprises', email: 'finance@xyz.co.in' },
    amount: 62000,
    taxAmount: 11160,
    totalAmount: 73160,
    status: 'pending' as const,
    issueDate: new Date('2024-12-25'),
    dueDate: new Date('2025-01-25'),
  },
  {
    id: '4',
    number: 'INV-2024-004',
    customer: { name: 'Kumar Trading Co.', email: 'kumar@trading.com' },
    amount: 45000,
    taxAmount: 8100,
    totalAmount: 53100,
    status: 'overdue' as const,
    issueDate: new Date('2024-11-20'),
    dueDate: new Date('2024-12-20'),
  },
  {
    id: '5',
    number: 'INV-2024-005',
    customer: { name: 'Sharma & Associates', email: 'accounts@sharma.in' },
    amount: 95000,
    taxAmount: 17100,
    totalAmount: 112100,
    status: 'draft' as const,
    issueDate: new Date('2025-01-01'),
    dueDate: new Date('2025-01-31'),
  },
  {
    id: '6',
    number: 'INV-2024-006',
    customer: { name: 'Digital Services Inc', email: 'billing@digitalservices.com' },
    amount: 180000,
    taxAmount: 32400,
    totalAmount: 212400,
    status: 'paid' as const,
    issueDate: new Date('2024-12-01'),
    dueDate: new Date('2024-12-31'),
    paidDate: new Date('2024-12-28'),
  },
];

const statusConfig = {
  paid: { label: 'Paid', variant: 'paid' as const },
  pending: { label: 'Pending', variant: 'pending' as const },
  overdue: { label: 'Overdue', variant: 'overdue' as const },
  draft: { label: 'Draft', variant: 'draft' as const },
};

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [selectedInvoices, setSelectedInvoices] = React.useState<string[]>([]);
  const [dateRange, setDateRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map((i) => i.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Calculate summary stats
  const totalAmount = filteredInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const paidAmount = filteredInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((acc, inv) => acc + inv.totalAmount, 0);
  const pendingAmount = filteredInvoices
    .filter((inv) => inv.status === 'pending')
    .reduce((acc, inv) => acc + inv.totalAmount, 0);
  const overdueAmount = filteredInvoices
    .filter((inv) => inv.status === 'overdue')
    .reduce((acc, inv) => acc + inv.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Invoices"
        description="Manage your invoices and track payments"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
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
            <p className="text-sm text-muted-foreground">Total Invoiced</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(paidAmount)}</p>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-warning">{formatCurrency(pendingAmount)}</p>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(overdueAmount)}</p>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <SearchInput
          placeholder="Search invoices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          placeholder="Filter by date"
          className="w-[250px]"
        />
        {selectedInvoices.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              {selectedInvoices.length} selected
            </span>
            <Button variant="outline" size="sm">
              <Send className="mr-2 h-4 w-4" />
              Send Reminder
            </Button>
            <Button variant="outline" size="sm" className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </motion.div>

      {/* Invoices Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedInvoices.length === filteredInvoices.length &&
                    filteredInvoices.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableEmpty
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title="No invoices found"
                description="Try adjusting your search or filters"
              />
            ) : (
              filteredInvoices.map((invoice, index) => {
                const status = statusConfig[invoice.status];
                return (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/50',
                      selectedInvoices.includes(invoice.id) && 'bg-muted/30'
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedInvoices.includes(invoice.id)}
                        onCheckedChange={() => toggleSelect(invoice.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{invoice.number}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={invoice.customer.name} size="sm" />
                        <div>
                          <p className="font-medium">{invoice.customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.customer.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{formatCurrency(invoice.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">
                          incl. {formatCurrency(invoice.taxAmount)} GST
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.issueDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.dueDate)}
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
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Send className="mr-2 h-4 w-4" />
                            Send
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
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
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}
