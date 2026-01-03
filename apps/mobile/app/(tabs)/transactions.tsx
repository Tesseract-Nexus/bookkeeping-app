import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { api } from '../../src/lib/api';

type TransactionType = 'all' | 'sale' | 'purchase' | 'expense' | 'payment' | 'receipt';

interface Transaction {
  id: string;
  type: string;
  date: string;
  description: string;
  amount: number;
  party_name?: string;
  reference_number?: string;
}

export default function TransactionsScreen() {
  const [filter, setFilter] = useState<TransactionType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch, fetchNextPage, hasNextPage } = useQuery({
    queryKey: ['transactions', filter, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '20' };
      if (filter !== 'all') params.type = filter;
      if (searchQuery) params.search = searchQuery;
      const response = await api.transactions.list(params);
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return { name: 'arrow-down', color: '#10B981', bg: 'bg-success-50' };
      case 'purchase':
        return { name: 'arrow-up', color: '#EF4444', bg: 'bg-error-50' };
      case 'expense':
        return { name: 'wallet', color: '#D97706', bg: 'bg-warning-50' };
      case 'payment':
        return { name: 'arrow-up', color: '#EF4444', bg: 'bg-error-50' };
      case 'receipt':
        return { name: 'arrow-down', color: '#10B981', bg: 'bg-success-50' };
      default:
        return { name: 'swap-horizontal', color: '#6B7280', bg: 'bg-gray-50' };
    }
  };

  const filterOptions: { key: TransactionType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sale', label: 'Sales' },
    { key: 'purchase', label: 'Purchases' },
    { key: 'expense', label: 'Expenses' },
    { key: 'payment', label: 'Payments' },
    { key: 'receipt', label: 'Receipts' },
  ];

  const renderTransaction = useCallback(({ item }: { item: Transaction }) => {
    const typeStyle = getTypeIcon(item.type);
    const isPositive = ['sale', 'receipt'].includes(item.type);

    return (
      <TouchableOpacity className="bg-white mx-4 mb-2 rounded-xl p-4 shadow-sm">
        <View className="flex-row items-center">
          <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${typeStyle.bg}`}>
            <Ionicons name={typeStyle.name as any} size={24} color={typeStyle.color} />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-medium" numberOfLines={1}>
              {item.description || item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
            {item.party_name && (
              <Text className="text-gray-500 text-sm" numberOfLines={1}>
                {item.party_name}
              </Text>
            )}
            <Text className="text-gray-400 text-xs">
              {format(new Date(item.date), 'd MMM yyyy, h:mm a')}
            </Text>
          </View>
          <View className="items-end">
            <Text className={`font-bold ${isPositive ? 'text-success-600' : 'text-error-600'}`}>
              {isPositive ? '+' : '-'}{formatCurrency(item.amount)}
            </Text>
            {item.reference_number && (
              <Text className="text-gray-400 text-xs">#{item.reference_number}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Transactions</Text>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-4">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search transactions..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-gray-900"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
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

      {/* Transactions List */}
      <FlatList
        data={data?.transactions || []}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-400 text-lg mt-4">No transactions found</Text>
            <Text className="text-gray-400 text-sm mt-1">
              {filter !== 'all' ? 'Try changing the filter' : 'Start by adding a transaction'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
