import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { api } from '../../src/lib/api';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge, StatusBadge } from '../../src/components/ui/Badge';
import { Card, StatCard } from '../../src/components/ui/Card';
import { Button, IconButton } from '../../src/components/ui/Button';
import { ActionSheet } from '../../src/components/ui/BottomSheet';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { ErrorState } from '../../src/components/ui/EmptyState';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showActions, setShowActions] = useState(false);

  const { data: customer, isLoading, error, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const response = await api.customers.get(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: ledger } = useQuery({
    queryKey: ['customer-ledger', id],
    queryFn: async () => {
      const response = await api.customers.getLedger(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.customers.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete customer');
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

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const phone = customer.phone.replace(/[^0-9]/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingState variant="fullscreen" />;
  }

  if (error || !customer) {
    return <ErrorState onRetry={refetch} />;
  }

  const balanceAmount = customer.current_balance || 0;
  const balanceType = balanceAmount > 0 ? 'receivable' : balanceAmount < 0 ? 'payable' : 'settled';

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-600 pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold flex-1">Customer Details</Text>
          <IconButton
            icon="ellipsis-vertical"
            variant="ghost"
            onPress={() => setShowActions(true)}
          />
        </View>

        {/* Profile Card */}
        <View className="flex-row items-center">
          <Avatar name={customer.name} size="xl" />
          <View className="flex-1 ml-4">
            <Text className="text-white text-xl font-bold">{customer.name}</Text>
            {customer.legal_name && customer.legal_name !== customer.name && (
              <Text className="text-primary-200 text-sm">{customer.legal_name}</Text>
            )}
            <View className="flex-row items-center mt-1">
              <StatusBadge status={customer.is_active ? 'active' : 'inactive'} size="sm" />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-3 mt-4">
          {customer.phone && (
            <TouchableOpacity
              onPress={handleCall}
              className="flex-1 bg-white/20 rounded-xl py-3 items-center"
            >
              <Ionicons name="call" size={20} color="white" />
              <Text className="text-white text-xs mt-1">Call</Text>
            </TouchableOpacity>
          )}
          {customer.phone && (
            <TouchableOpacity
              onPress={handleWhatsApp}
              className="flex-1 bg-white/20 rounded-xl py-3 items-center"
            >
              <Ionicons name="logo-whatsapp" size={20} color="white" />
              <Text className="text-white text-xs mt-1">WhatsApp</Text>
            </TouchableOpacity>
          )}
          {customer.email && (
            <TouchableOpacity
              onPress={handleEmail}
              className="flex-1 bg-white/20 rounded-xl py-3 items-center"
            >
              <Ionicons name="mail" size={20} color="white" />
              <Text className="text-white text-xs mt-1">Email</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push(`/invoices/new?party_id=${id}`)}
            className="flex-1 bg-white/20 rounded-xl py-3 items-center"
          >
            <Ionicons name="document-text" size={20} color="white" />
            <Text className="text-white text-xs mt-1">Invoice</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* Balance Card */}
        <View className="px-4 -mt-4">
          <Card variant="elevated" className="shadow-lg">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-gray-500 text-sm">
                  {balanceType === 'receivable'
                    ? 'Amount to Receive'
                    : balanceType === 'payable'
                    ? 'Amount to Pay'
                    : 'Balance'}
                </Text>
                <Text
                  className={`text-2xl font-bold ${
                    balanceType === 'receivable'
                      ? 'text-success-600'
                      : balanceType === 'payable'
                      ? 'text-error-600'
                      : 'text-gray-900'
                  }`}
                >
                  {formatCurrency(balanceAmount)}
                </Text>
              </View>
              {balanceAmount !== 0 && (
                <Button
                  variant={balanceType === 'receivable' ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() =>
                    router.push(
                      `/transactions/new?type=${
                        balanceType === 'receivable' ? 'receipt' : 'payment'
                      }&party_id=${id}`
                    )
                  }
                >
                  {balanceType === 'receivable' ? 'Record Payment' : 'Make Payment'}
                </Button>
              )}
            </View>
          </Card>
        </View>

        {/* Contact Info */}
        <View className="px-4 mt-6">
          <Text className="text-gray-700 font-semibold mb-3">Contact Information</Text>
          <Card>
            {customer.phone && (
              <View className="flex-row items-center py-3 border-b border-gray-100">
                <Ionicons name="call-outline" size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3 flex-1">{customer.phone}</Text>
              </View>
            )}
            {customer.email && (
              <View className="flex-row items-center py-3 border-b border-gray-100">
                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3 flex-1">{customer.email}</Text>
              </View>
            )}
            {customer.address_line1 && (
              <View className="flex-row items-start py-3">
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-700">{customer.address_line1}</Text>
                  {customer.address_line2 && (
                    <Text className="text-gray-700">{customer.address_line2}</Text>
                  )}
                  <Text className="text-gray-500">
                    {[customer.city, customer.state, customer.pin_code]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        </View>

        {/* Tax Info */}
        {(customer.gstin || customer.pan) && (
          <View className="px-4 mt-6">
            <Text className="text-gray-700 font-semibold mb-3">Tax Information</Text>
            <Card>
              {customer.gstin && (
                <View className="flex-row items-center py-3 border-b border-gray-100">
                  <Text className="text-gray-500 w-20">GSTIN</Text>
                  <Text className="text-gray-900 font-medium flex-1">
                    {customer.gstin}
                  </Text>
                </View>
              )}
              {customer.pan && (
                <View className="flex-row items-center py-3">
                  <Text className="text-gray-500 w-20">PAN</Text>
                  <Text className="text-gray-900 font-medium flex-1">{customer.pan}</Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Recent Transactions */}
        <View className="px-4 mt-6 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-700 font-semibold">Recent Transactions</Text>
            <TouchableOpacity
              onPress={() => router.push(`/customers/${id}/ledger`)}
            >
              <Text className="text-primary-600 font-medium">View All</Text>
            </TouchableOpacity>
          </View>
          <Card>
            {ledger?.entries?.slice(0, 5).map((entry: any, index: number) => (
              <View
                key={entry.id || index}
                className={`flex-row items-center py-3 ${
                  index < (ledger.entries.length - 1) ? 'border-b border-gray-100' : ''
                }`}
              >
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium" numberOfLines={1}>
                    {entry.description || entry.type}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {format(new Date(entry.date), 'd MMM yyyy')}
                  </Text>
                </View>
                <Text
                  className={`font-semibold ${
                    entry.debit > 0 ? 'text-success-600' : 'text-error-600'
                  }`}
                >
                  {entry.debit > 0 ? '+' : '-'}
                  {formatCurrency(entry.debit || entry.credit)}
                </Text>
              </View>
            )) || (
              <Text className="text-gray-400 text-center py-4">
                No transactions yet
              </Text>
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Action Sheet */}
      <ActionSheet
        visible={showActions}
        onClose={() => setShowActions(false)}
        options={[
          {
            label: 'Edit Customer',
            icon: 'create-outline',
            onPress: () => router.push(`/customers/${id}/edit`),
          },
          {
            label: 'Create Invoice',
            icon: 'document-text-outline',
            onPress: () => router.push(`/invoices/new?party_id=${id}`),
          },
          {
            label: 'Record Payment',
            icon: 'cash-outline',
            onPress: () => router.push(`/transactions/new?type=receipt&party_id=${id}`),
          },
          {
            label: 'View Ledger',
            icon: 'list-outline',
            onPress: () => router.push(`/customers/${id}/ledger`),
          },
          {
            label: 'Delete Customer',
            icon: 'trash-outline',
            onPress: handleDelete,
            destructive: true,
          },
        ]}
      />
    </View>
  );
}
