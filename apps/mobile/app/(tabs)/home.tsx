import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth-store';
import { useNetworkStatus, usePendingSync, useLastSync } from '../../src/hooks/useOfflineData';
import { Card, StatCard } from '../../src/components/ui/Card';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { IconButton } from '../../src/components/ui/Button';
import { DashboardSkeleton } from '../../src/components/ui/LoadingState';
import { OfflineState } from '../../src/components/ui/EmptyState';

export default function HomeScreen() {
  const { user, tenant } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const { pendingCount, isSyncing } = usePendingSync();
  const { formatLastSync } = useLastSync();

  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.reports.getDashboard();
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

  const quickActions = [
    {
      id: 'sale',
      title: 'Quick Sale',
      icon: 'receipt-outline',
      color: '#4F46E5',
      bg: 'bg-primary-50',
      onPress: () => router.push('/(tabs)/add?type=sale'),
    },
    {
      id: 'expense',
      title: 'Add Expense',
      icon: 'wallet-outline',
      color: '#D97706',
      bg: 'bg-warning-50',
      onPress: () => router.push('/(tabs)/add?type=expense'),
    },
    {
      id: 'invoice',
      title: 'New Invoice',
      icon: 'document-text-outline',
      color: '#10B981',
      bg: 'bg-success-50',
      onPress: () => router.push('/invoices/new'),
    },
    {
      id: 'payment',
      title: 'Payment',
      icon: 'cash-outline',
      color: '#0EA5E9',
      bg: 'bg-blue-50',
      onPress: () => router.push('/(tabs)/add?type=receipt'),
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      {/* Offline Banner */}
      {!isOnline && <OfflineState onRetry={refetch} />}

      {/* Pending Sync Banner */}
      {pendingCount > 0 && isOnline && (
        <View className="bg-warning-50 px-4 py-2 flex-row items-center">
          <Ionicons name="sync" size={16} color="#D97706" />
          <Text className="text-warning-700 ml-2 flex-1">
            {isSyncing
              ? 'Syncing...'
              : `${pendingCount} item${pendingCount > 1 ? 's' : ''} pending sync`}
          </Text>
        </View>
      )}

      {/* Header */}
      <View className="bg-primary-600 pt-12 pb-8 px-4">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-1">
            <Text className="text-primary-200 text-sm">
              {format(new Date(), 'EEEE, d MMMM')}
            </Text>
            <Text className="text-white text-2xl font-bold mt-1">
              Hello, {user?.first_name || 'there'}!
            </Text>
          </View>
          <View className="flex-row items-center">
            <IconButton
              icon="notifications-outline"
              variant="ghost"
              badge={3}
              onPress={() => router.push('/notifications')}
            />
            <TouchableOpacity
              onPress={() => router.push('/settings/profile')}
              className="ml-2"
            >
              <Avatar
                name={`${user?.first_name} ${user?.last_name}`}
                size="md"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Business Name */}
        <TouchableOpacity
          onPress={() => router.push('/settings/business')}
          className="flex-row items-center"
        >
          <Text className="text-primary-200">{tenant?.name}</Text>
          <Ionicons name="chevron-forward" size={14} color="#A5B4FC" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="px-4 -mt-4">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Today's Stats */}
            <Card variant="elevated" className="shadow-lg mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-500 text-sm">Today's Summary</Text>
                <Badge variant="primary" size="sm" rounded>
                  {format(new Date(), 'd MMM')}
                </Badge>
              </View>
              <Text className="text-3xl font-bold text-gray-900">
                {formatCurrency(dashboard?.today?.sales || 0)}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {dashboard?.today?.transactions_count || 0} transactions
              </Text>
              <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs">Income</Text>
                  <Text className="text-success-600 font-semibold">
                    +{formatCurrency(dashboard?.today?.sales || 0)}
                  </Text>
                </View>
                <View className="w-px h-8 bg-gray-200" />
                <View className="flex-1 pl-4">
                  <Text className="text-gray-400 text-xs">Expenses</Text>
                  <Text className="text-error-600 font-semibold">
                    -{formatCurrency(dashboard?.today?.expenses || 0)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Outstanding */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <StatCard
                  title="To Receive"
                  value={formatCurrency(dashboard?.outstanding?.receivables || 0)}
                  icon="arrow-down"
                  iconColor="#10B981"
                  iconBgColor="bg-success-50"
                  onPress={() => router.push('/reports/aging?type=receivables')}
                />
              </View>
              <View className="flex-1">
                <StatCard
                  title="To Pay"
                  value={formatCurrency(dashboard?.outstanding?.payables || 0)}
                  icon="arrow-up"
                  iconColor="#EF4444"
                  iconBgColor="bg-error-50"
                  onPress={() => router.push('/reports/aging?type=payables')}
                />
              </View>
            </View>

            {/* Cash Position */}
            <Card className="mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-700 font-semibold">Cash Position</Text>
                <TouchableOpacity onPress={() => router.push('/settings/bank-accounts')}>
                  <Text className="text-primary-600 text-sm">Manage</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">Cash in Hand</Text>
                <Text className="text-gray-900 font-medium">
                  {formatCurrency(dashboard?.cash_position?.cash_in_hand || 0)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">Bank Balance</Text>
                <Text className="text-gray-900 font-medium">
                  {formatCurrency(dashboard?.cash_position?.bank_balance || 0)}
                </Text>
              </View>
              <View className="border-t border-gray-100 pt-2 mt-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-700 font-medium">Total</Text>
                  <Text className="text-primary-600 font-bold text-lg">
                    {formatCurrency(dashboard?.cash_position?.total || 0)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Quick Actions */}
            <Text className="text-gray-700 font-semibold mb-3">Quick Actions</Text>
            <View className="flex-row gap-3 mb-6">
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  onPress={action.onPress}
                  className="flex-1 bg-white rounded-xl shadow-sm p-4 items-center"
                >
                  <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${action.bg}`}>
                    <Ionicons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text className="text-gray-700 font-medium text-center text-xs">
                    {action.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Transactions */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-700 font-semibold">Recent Transactions</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                  <Text className="text-primary-600 font-medium">See All</Text>
                </TouchableOpacity>
              </View>
              <Card padding="none">
                {!dashboard?.recent_transactions?.length ? (
                  <View className="py-8 items-center">
                    <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
                    <Text className="text-gray-400 mt-2">No transactions yet</Text>
                    <TouchableOpacity
                      onPress={() => router.push('/(tabs)/add')}
                      className="mt-3"
                    >
                      <Text className="text-primary-600 font-medium">
                        Add your first transaction
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  dashboard.recent_transactions.slice(0, 5).map((txn: any, index: number) => {
                    const isIncome = ['sale', 'receipt'].includes(txn.type);
                    return (
                      <TouchableOpacity
                        key={txn.id}
                        onPress={() => router.push(`/transactions/${txn.id}`)}
                        className={`flex-row items-center py-3 px-4 ${
                          index < Math.min(dashboard.recent_transactions.length, 5) - 1
                            ? 'border-b border-gray-100'
                            : ''
                        }`}
                      >
                        <View
                          className={`w-10 h-10 rounded-full items-center justify-center ${
                            isIncome ? 'bg-success-50' : 'bg-error-50'
                          }`}
                        >
                          <Ionicons
                            name={isIncome ? 'arrow-down' : 'arrow-up'}
                            size={20}
                            color={isIncome ? '#10B981' : '#EF4444'}
                          />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className="text-gray-900 font-medium" numberOfLines={1}>
                            {txn.description || txn.type}
                          </Text>
                          <Text className="text-gray-400 text-sm">
                            {format(new Date(txn.date), 'd MMM, h:mm a')}
                          </Text>
                        </View>
                        <Text
                          className={`font-semibold ${
                            isIncome ? 'text-success-600' : 'text-error-600'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </Card>
            </View>

            {/* Last Sync */}
            <View className="items-center pb-8">
              <Text className="text-gray-400 text-xs">
                Last synced: {formatLastSync()}
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
