import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { api } from '../../src/lib/api';

type InvoiceStatus = 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface Invoice {
  id: string;
  invoice_number: string;
  party_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
}

export default function InvoicesScreen() {
  const [filter, setFilter] = useState<InvoiceStatus>('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoices', filter],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '20' };
      if (filter !== 'all') params.status = filter;
      const response = await api.invoices.list(params);
      return response.data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'draft':
        return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' };
      case 'sent':
        return { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Sent' };
      case 'paid':
        return { bg: 'bg-success-100', text: 'text-success-600', label: 'Paid' };
      case 'overdue':
        return { bg: 'bg-error-100', text: 'text-error-600', label: 'Overdue' };
      case 'cancelled':
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' };
      case 'partially_paid':
        return { bg: 'bg-warning-100', text: 'text-warning-600', label: 'Partial' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    }
  };

  const filterOptions: { key: InvoiceStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'paid', label: 'Paid' },
    { key: 'overdue', label: 'Overdue' },
  ];

  const renderInvoice = useCallback(({ item }: { item: Invoice }) => {
    const statusStyle = getStatusStyle(item.status);
    const isPaid = item.status === 'paid';
    const isOverdue = item.status === 'overdue';

    return (
      <TouchableOpacity className="bg-white mx-4 mb-2 rounded-xl p-4 shadow-sm">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className="text-gray-900 font-semibold" numberOfLines={1}>
              {item.party_name}
            </Text>
            <Text className="text-primary-600 font-medium text-sm">
              #{item.invoice_number}
            </Text>
          </View>
          <View className={`px-3 py-1 rounded-full ${statusStyle.bg}`}>
            <Text className={`text-xs font-medium ${statusStyle.text}`}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-end mt-3">
          <View>
            <Text className="text-gray-400 text-xs">Invoice Date</Text>
            <Text className="text-gray-600 text-sm">
              {format(new Date(item.invoice_date), 'd MMM yyyy')}
            </Text>
          </View>
          <View>
            <Text className="text-gray-400 text-xs">Due Date</Text>
            <Text className={`text-sm ${isOverdue ? 'text-error-600 font-medium' : 'text-gray-600'}`}>
              {format(new Date(item.due_date), 'd MMM yyyy')}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-gray-400 text-xs">
              {isPaid ? 'Total' : 'Balance Due'}
            </Text>
            <Text className={`font-bold ${isPaid ? 'text-gray-900' : 'text-primary-600'}`}>
              {formatCurrency(isPaid ? item.total_amount : item.balance_due)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  // Calculate summary stats
  const stats = {
    total: data?.invoices?.length || 0,
    outstanding: data?.invoices?.filter((i: Invoice) =>
      ['sent', 'overdue', 'partially_paid'].includes(i.status)
    ).reduce((sum: number, i: Invoice) => sum + (i.balance_due || 0), 0) || 0,
    overdue: data?.invoices?.filter((i: Invoice) => i.status === 'overdue').length || 0,
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">Invoices</Text>
          <TouchableOpacity className="bg-primary-600 px-4 py-2 rounded-lg flex-row items-center">
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-medium ml-1">New</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-primary-50 rounded-lg p-3">
            <Text className="text-primary-600 text-xs font-medium">Outstanding</Text>
            <Text className="text-primary-900 font-bold text-lg">
              {formatCurrency(stats.outstanding)}
            </Text>
          </View>
          <View className="flex-1 bg-error-50 rounded-lg p-3">
            <Text className="text-error-600 text-xs font-medium">Overdue</Text>
            <Text className="text-error-900 font-bold text-lg">{stats.overdue}</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item.key)}
              className={`mr-2 px-4 py-2 rounded-full ${
                filter === item.key ? 'bg-primary-600' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`font-medium ${
                  filter === item.key ? 'text-white' : 'text-gray-600'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Invoices List */}
      <FlatList
        data={data?.invoices || []}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoice}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg mt-4">No invoices found</Text>
            <Text className="text-gray-400 text-sm mt-1">
              Create your first invoice to get started
            </Text>
          </View>
        }
      />
    </View>
  );
}
