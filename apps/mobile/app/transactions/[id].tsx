import { View, Text, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { api } from '../../src/lib/api';
import { Card } from '../../src/components/ui/Card';
import { Badge, TransactionTypeBadge } from '../../src/components/ui/Badge';
import { Button, IconButton } from '../../src/components/ui/Button';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { ErrorState } from '../../src/components/ui/EmptyState';
import { ActionSheet } from '../../src/components/ui/BottomSheet';

import { useState } from 'react';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showActions, setShowActions] = useState(false);

  const { data: transaction, isLoading, error, refetch } = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const response = await api.transactions.get(id);
      return response.data;
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.transactions.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete transaction');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
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

  const handleShare = async () => {
    if (!transaction) return;

    const isIncome = ['sale', 'receipt'].includes(transaction.type);
    const message = `Transaction Details
${'-'.repeat(30)}
Type: ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
Amount: ${formatCurrency(transaction.amount)} ${isIncome ? '(Credit)' : '(Debit)'}
Date: ${format(new Date(transaction.date), 'dd MMM yyyy')}
Description: ${transaction.description || 'N/A'}
${transaction.party_name ? `Party: ${transaction.party_name}` : ''}
${transaction.payment_mode ? `Payment Mode: ${transaction.payment_mode}` : ''}
${'-'.repeat(30)}
Sent from BookKeep`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDuplicate = () => {
    if (!transaction) return;
    // Navigate to add screen with prefilled data
    router.push({
      pathname: '/(tabs)/add',
      params: {
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description,
        party_id: transaction.party_id,
        payment_mode: transaction.payment_mode,
      },
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Transaction</Text>
          </View>
        </View>
        <LoadingState />
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Transaction</Text>
          </View>
        </View>
        <ErrorState
          message="Failed to load transaction details"
          onRetry={refetch}
        />
      </View>
    );
  }

  const isIncome = ['sale', 'receipt'].includes(transaction.type);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sale: 'Sale',
      purchase: 'Purchase',
      expense: 'Expense',
      receipt: 'Receipt',
      payment: 'Payment',
    };
    return labels[type] || type;
  };

  const getPaymentModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      bank: 'Bank Transfer',
      upi: 'UPI',
      cheque: 'Cheque',
      card: 'Card',
    };
    return labels[mode] || mode;
  };

  const actions = [
    {
      id: 'share',
      title: 'Share',
      icon: 'share-outline',
      onPress: handleShare,
    },
    {
      id: 'duplicate',
      title: 'Duplicate',
      icon: 'copy-outline',
      onPress: handleDuplicate,
    },
    {
      id: 'delete',
      title: 'Delete',
      icon: 'trash-outline',
      destructive: true,
      onPress: handleDelete,
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Transaction</Text>
          </View>
          <IconButton
            icon="ellipsis-horizontal"
            variant="ghost"
            onPress={() => setShowActions(true)}
          />
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Amount Card */}
        <Card variant="elevated" className="mx-4 mt-4 shadow-lg">
          <View className="items-center py-4">
            <TransactionTypeBadge type={transaction.type} />
            <Text
              className={`text-4xl font-bold mt-4 ${
                isIncome ? 'text-success-600' : 'text-error-600'
              }`}
            >
              {isIncome ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </Text>
            <Text className="text-gray-500 mt-2">
              {format(new Date(transaction.date), 'EEEE, d MMMM yyyy')}
            </Text>
            {transaction.created_at && (
              <Text className="text-gray-400 text-xs mt-1">
                Created at {format(new Date(transaction.created_at), 'h:mm a')}
              </Text>
            )}
          </View>
        </Card>

        {/* Transaction Details */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Details
          </Text>
          <Card>
            {transaction.description && (
              <View className="py-3 border-b border-gray-100">
                <Text className="text-gray-400 text-xs mb-1">Description</Text>
                <Text className="text-gray-900">{transaction.description}</Text>
              </View>
            )}

            <View className="py-3 border-b border-gray-100">
              <Text className="text-gray-400 text-xs mb-1">Transaction Type</Text>
              <Text className="text-gray-900">{getTypeLabel(transaction.type)}</Text>
            </View>

            {transaction.payment_mode && (
              <View className="py-3 border-b border-gray-100">
                <Text className="text-gray-400 text-xs mb-1">Payment Mode</Text>
                <View className="flex-row items-center">
                  <Ionicons
                    name={
                      transaction.payment_mode === 'cash'
                        ? 'cash-outline'
                        : transaction.payment_mode === 'upi'
                        ? 'phone-portrait-outline'
                        : 'card-outline'
                    }
                    size={16}
                    color="#6B7280"
                  />
                  <Text className="text-gray-900 ml-2">
                    {getPaymentModeLabel(transaction.payment_mode)}
                  </Text>
                </View>
              </View>
            )}

            {transaction.account_name && (
              <View className="py-3 border-b border-gray-100">
                <Text className="text-gray-400 text-xs mb-1">Account</Text>
                <Text className="text-gray-900">{transaction.account_name}</Text>
              </View>
            )}

            {transaction.reference_number && (
              <View className="py-3">
                <Text className="text-gray-400 text-xs mb-1">Reference Number</Text>
                <Text className="text-gray-900">{transaction.reference_number}</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Party Details */}
        {transaction.party_name && (
          <View className="px-4 mt-6">
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
              {isIncome ? 'Received From' : 'Paid To'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (transaction.party_id) {
                  router.push(`/customers/${transaction.party_id}`);
                }
              }}
              className="bg-white rounded-xl p-4"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center">
                  <Text className="text-primary-600 text-lg font-bold">
                    {transaction.party_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-gray-900 font-semibold">
                    {transaction.party_name}
                  </Text>
                  {transaction.party_phone && (
                    <Text className="text-gray-500 text-sm">
                      {transaction.party_phone}
                    </Text>
                  )}
                </View>
                {transaction.party_id && (
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Related Invoice */}
        {transaction.invoice_id && (
          <View className="px-4 mt-6">
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
              Related Invoice
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/invoices/${transaction.invoice_id}`)}
              className="bg-white rounded-xl p-4 flex-row items-center"
            >
              <View className="w-10 h-10 rounded-full bg-success-50 items-center justify-center">
                <Ionicons name="document-text-outline" size={20} color="#10B981" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-gray-900 font-medium">
                  Invoice #{transaction.invoice_number || transaction.invoice_id.slice(-8)}
                </Text>
                <Text className="text-gray-500 text-sm">Tap to view invoice</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Attachments */}
        {transaction.attachments && transaction.attachments.length > 0 && (
          <View className="px-4 mt-6">
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
              Attachments
            </Text>
            <Card padding="none">
              {transaction.attachments.map((attachment: any, index: number) => (
                <TouchableOpacity
                  key={attachment.id || index}
                  className={`flex-row items-center p-4 ${
                    index < transaction.attachments.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center">
                    <Ionicons name="document-outline" size={20} color="#6B7280" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-gray-900 font-medium">{attachment.name}</Text>
                    <Text className="text-gray-400 text-xs">{attachment.size}</Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color="#4F46E5" />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        {/* Audit Info */}
        <View className="px-4 mt-6 mb-8">
          <Card className="bg-gray-100">
            <View className="flex-row justify-between">
              <View>
                <Text className="text-gray-400 text-xs">Created By</Text>
                <Text className="text-gray-600 text-sm">
                  {transaction.created_by_name || 'System'}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-400 text-xs">Last Updated</Text>
                <Text className="text-gray-600 text-sm">
                  {transaction.updated_at
                    ? format(new Date(transaction.updated_at), 'd MMM yyyy, h:mm a')
                    : 'N/A'}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Action Sheet */}
      <ActionSheet
        visible={showActions}
        onClose={() => setShowActions(false)}
        actions={actions}
      />
    </View>
  );
}
