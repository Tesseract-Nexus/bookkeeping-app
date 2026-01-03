import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { SearchInput } from '../../src/components/ui/Input';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { FAB } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ListSkeleton } from '../../src/components/ui/LoadingState';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  current_balance: number;
  is_active: boolean;
}

export default function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = { type: 'customer', limit: '50' };
      if (searchQuery) params.search = searchQuery;
      const response = await api.customers.list(params);
      return response.data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const renderCustomer = useCallback(({ item }: { item: Customer }) => {
    const balanceColor = item.current_balance > 0
      ? 'text-success-600'
      : item.current_balance < 0
      ? 'text-error-600'
      : 'text-gray-500';
    const balanceLabel = item.current_balance > 0
      ? 'To Receive'
      : item.current_balance < 0
      ? 'To Pay'
      : 'Settled';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/customers/${item.id}`)}
        className="bg-white flex-row items-center py-4 px-4 border-b border-gray-100"
      >
        <Avatar name={item.name} size="md" />
        <View className="flex-1 ml-3">
          <View className="flex-row items-center">
            <Text className="text-gray-900 font-medium flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            {!item.is_active && (
              <Badge variant="default" size="sm">Inactive</Badge>
            )}
          </View>
          <Text className="text-gray-500 text-sm" numberOfLines={1}>
            {item.phone || item.email || 'No contact info'}
          </Text>
          {item.gstin && (
            <Text className="text-gray-400 text-xs mt-0.5">
              GSTIN: {item.gstin}
            </Text>
          )}
        </View>
        <View className="items-end ml-3">
          <Text className={`font-semibold ${balanceColor}`}>
            {formatCurrency(item.current_balance)}
          </Text>
          <Text className="text-gray-400 text-xs">{balanceLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" className="ml-2" />
      </TouchableOpacity>
    );
  }, []);

  // Calculate summary
  const summary = {
    total: data?.customers?.length || 0,
    toReceive: data?.customers?.reduce((sum: number, c: Customer) =>
      c.current_balance > 0 ? sum + c.current_balance : sum, 0) || 0,
    toPay: data?.customers?.reduce((sum: number, c: Customer) =>
      c.current_balance < 0 ? sum + Math.abs(c.current_balance) : sum, 0) || 0,
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 flex-1">Customers</Text>
        </View>

        {/* Search */}
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search customers..."
        />

        {/* Summary Cards */}
        <View className="flex-row gap-3 mt-4">
          <View className="flex-1 bg-gray-50 rounded-xl p-3">
            <Text className="text-gray-500 text-xs">Total</Text>
            <Text className="text-gray-900 font-bold text-lg">{summary.total}</Text>
          </View>
          <View className="flex-1 bg-success-50 rounded-xl p-3">
            <Text className="text-success-600 text-xs">To Receive</Text>
            <Text className="text-success-700 font-bold text-lg">
              {formatCurrency(summary.toReceive)}
            </Text>
          </View>
          <View className="flex-1 bg-error-50 rounded-xl p-3">
            <Text className="text-error-600 text-xs">To Pay</Text>
            <Text className="text-error-700 font-bold text-lg">
              {formatCurrency(summary.toPay)}
            </Text>
          </View>
        </View>
      </View>

      {/* Customer List */}
      {isLoading ? (
        <ListSkeleton count={8} />
      ) : (
        <FlatList
          data={data?.customers || []}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomer}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No customers yet"
              description="Add your first customer to start tracking transactions"
              actionLabel="Add Customer"
              onAction={() => router.push('/customers/new')}
            />
          }
        />
      )}

      {/* FAB */}
      <FAB
        icon="add"
        onPress={() => router.push('/customers/new')}
      />
    </View>
  );
}
